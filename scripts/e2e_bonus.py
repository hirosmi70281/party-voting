#!/usr/bin/env python3
"""測試：加分同仁併入公開投票 + 投票券刪除/作廢。需先啟動 dev server(3100)。"""
import json, urllib.request, urllib.error, http.cookiejar, sys, re, os

BASE = os.environ.get("BASE", "http://localhost:3100")
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"Content-Type": "application/json"})
    try:
        resp = opener.open(r)
        return resp.status, json.loads(resp.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")

passed = failed = 0
def check(label, cond, extra=""):
    global passed, failed
    ok = bool(cond)
    print(f"{'✓' if ok else '✗'} {label} {extra}")
    passed += 1 if ok else 0
    failed += 0 if ok else 1

secret = None
with open(os.path.join(os.path.dirname(__file__), "..", ".env.local")) as f:
    for line in f:
        m = re.match(r'ADMIN_SECRET="?([^"\n]+)"?', line.strip())
        if m: secret = m.group(1)

req("POST", "/api/admin/session", {"secret": secret})

# 建 3 隊
tids = []
for nm, ti in [("A隊","作品A"),("B隊","作品B"),("C隊","作品C")]:
    st, d = req("POST", "/api/admin/teams", {"name": nm, "title": ti, "videoUrl": ""})
    tids.append(d["team"]["id"])
check("建立 3 隊", len(tids) == 3)

# 開投票，產 4 張券，投票：A 得 2、B 得 1、C 得 1（共 4 有效票）
req("POST", "/api/admin/settings", {"votingOpen": True})
st, d = req("POST", "/api/admin/tokens", {"kind":"voter","count":4})
toks = [t["token"] for t in d["tokens"]]
dist = [[tids[0],tids[1]], [tids[0],tids[2]]]  # 2 張投票 → A2 B1 C1 = 4 票
for tok, pick in zip(toks[:2], dist):
    req("POST", "/api/vote", {"token": tok, "teamIds": pick})

st, data = req("GET", "/api/admin/data")
S = data["standings"]
check("加分前 總有效票=4", S["totalValidVotes"] == 4, f"(got {S['totalValidVotes']})")

# ── 加分同仁：TOP1=8票, TOP2=5票, TOP3=3票 ──
def mk_bonus(name, budget):
    st, d = req("POST", "/api/admin/bonus", {"name": name, "budget": budget})
    return d["bonus"]["id"], st
id1, s1 = mk_bonus("TOP1", 8); check("建 TOP1(8)", s1==200)
id2, s2 = mk_bonus("TOP2", 5); check("建 TOP2(5)", s2==200)
id3, s3 = mk_bonus("TOP3", 3); check("建 TOP3(3)", s3==200)

# 超額分配應被擋：TOP3 只有 3 票卻分 4
st, d = req("PATCH", "/api/admin/bonus", {"id": id3, "allocations": {tids[0]: 4}})
check("超額分配被擋 400", st == 400, f"(got {st}: {d.get('error')})")

# 分散投：TOP1 → A5 B3（共8）; TOP2 → C5; TOP3 → B3
req("PATCH", "/api/admin/bonus", {"id": id1, "allocations": {tids[0]:5, tids[1]:3}})
req("PATCH", "/api/admin/bonus", {"id": id2, "allocations": {tids[2]:5}})
req("PATCH", "/api/admin/bonus", {"id": id3, "allocations": {tids[1]:3}})

st, data = req("GET", "/api/admin/data")
S = data["standings"]
byid = {r["team"]["id"]: r for r in S["results"]}
# 期望票數：
#  A: 一般2 + TOP1的5 = 7
#  B: 一般1 + TOP1的3 + TOP3的3 = 7
#  C: 一般1 + TOP2的5 = 6
#  總 = 4(一般) + 8 + 5 + 3 = 20
print("\n--- 加分後票數 ---")
for r in S["results"]:
    print(f"  {r['team']['title']}: 票{r['voteCount']} 投票分{r['publicScore']}")
print(f"  總有效票 {S['totalValidVotes']}")
check("總有效票 = 20（4一般+16加分）", S["totalValidVotes"] == 20, f"(got {S['totalValidVotes']})")
check("A 票=7", byid[tids[0]]["voteCount"] == 7, f"(got {byid[tids[0]]['voteCount']})")
check("B 票=7", byid[tids[1]]["voteCount"] == 7, f"(got {byid[tids[1]]['voteCount']})")
check("C 票=6", byid[tids[2]]["voteCount"] == 6, f"(got {byid[tids[2]]['voteCount']})")
# A 公開分 = 7/20*70 = 24.5
check("A 公開分=24.5", byid[tids[0]]["publicScore"] == 24.5, f"(got {byid[tids[0]]['publicScore']})")

# ── 刪除加分同仁 → 票數應回退 ──
req("DELETE", "/api/admin/bonus", {"id": id2})  # 移除 TOP2(給C5)
st, data = req("GET", "/api/admin/data")
S = data["standings"]
byid = {r["team"]["id"]: r for r in S["results"]}
check("刪TOP2後 總有效票=15", S["totalValidVotes"] == 15, f"(got {S['totalValidVotes']})")
check("刪TOP2後 C票=1", byid[tids[2]]["voteCount"] == 1, f"(got {byid[tids[2]]['voteCount']})")

# ── 投票券刪除/作廢 ──
# 作廢一張已投的券(toks[0] 投了 A,B) → A、B 各扣 1，總有效票 -2
st, d = req("DELETE", "/api/admin/tokens", {"kind":"voter","token": toks[0]})
check("作廢已投券 200", st == 200, f"(got {st})")
st, data = req("GET", "/api/admin/data")
S = data["standings"]
byid = {r["team"]["id"]: r for r in S["results"]}
# 之前(刪TOP2後): A 一般2+TOP1 5=7, B 一般1+TOP1 3+TOP3 3=7, C 1. 總15
# 作廢 toks[0](投A,B各1) → A 6, B 6, 總 13
check("作廢後 總有效票=13", S["totalValidVotes"] == 13, f"(got {S['totalValidVotes']})")
check("作廢後 A票=6", byid[tids[0]]["voteCount"] == 6, f"(got {byid[tids[0]]['voteCount']})")

# 清除未使用券：產生的4張，toks[0]已作廢刪除、toks[1]已投、toks[2..3]未用 → 清掉2張
st, d = req("DELETE", "/api/admin/tokens", {"kind":"voter","scope":"unused"})
check("清除未使用回報 removed=2", d.get("removed") == 2, f"(got {d.get('removed')})")
st, data = req("GET", "/api/admin/data")
remaining = len(data["voterTokens"])
check("剩餘券=1（只剩已投的 toks[1]）", remaining == 1, f"(got {remaining})")

print(f"\n======== {passed} 通過, {failed} 失敗 ========")
sys.exit(1 if failed else 0)
