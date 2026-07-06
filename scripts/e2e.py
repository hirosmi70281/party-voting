#!/usr/bin/env python3
"""端對端測試投票流程。需先啟動 server（見指令）。"""
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
    if ok: passed += 1
    else: failed += 1

# 讀 ADMIN_SECRET
secret = None
with open(os.path.join(os.path.dirname(__file__), "..", ".env.local")) as f:
    for line in f:
        m = re.match(r'ADMIN_SECRET="?([^"\n]+)"?', line.strip())
        if m: secret = m.group(1)
assert secret, "找不到 ADMIN_SECRET"

# 1. 未登入取 data → 401
st, _ = req("GET", "/api/admin/data")
check("未登入 /api/admin/data 回 401", st == 401, f"(got {st})")

# 2. 錯誤密鑰 → 401
st, _ = req("POST", "/api/admin/session", {"secret": "wrong"})
check("錯誤密鑰登入回 401", st == 401, f"(got {st})")

# 3. 正確密鑰 → 200 + cookie
st, _ = req("POST", "/api/admin/session", {"secret": secret})
check("正確密鑰登入回 200", st == 200, f"(got {st})")

# 4. 建 3 隊
DRIVE = "https://drive.google.com/file/d/1AbC_test-Video_Id123456789/view?usp=sharing"
for nm, ti in [("白富美小隊","最爆走的廈門行軍"),("好野人隊","最荒謬的廈門生存紀錄片"),("邊緣人隊","最孤獨的出差日記")]:
    st, d = req("POST", "/api/admin/teams", {"name": nm, "title": ti, "videoUrl": DRIVE})
    check(f"建立隊伍 {nm}", st == 200, f"(got {st})")

# 建一隊壞連結 → 400
st, d = req("POST", "/api/admin/teams", {"name":"X","title":"壞連結","videoUrl":"not-a-drive-link"})
check("壞影片連結被擋 400", st == 400, f"(got {st}: {d.get('error')})")

# 5. 取 data 拿 team ids
st, data = req("GET", "/api/admin/data")
teams = data["teams"]
check("三隊建立成功", len(teams) == 3, f"(got {len(teams)})")
tids = [t["id"] for t in teams]

# 6. 投票尚未開放 → 產 token 先投票應 403
st, d = req("POST", "/api/admin/tokens", {"kind":"voter","count":5,"labelPrefix":"測試"})
tokens = [t["token"] for t in d["tokens"]]
check("產生 5 張投票券", len(tokens) == 5, f"(got {len(tokens)})")

st, d = req("POST", "/api/vote", {"token": tokens[0], "teamIds": tids[:2]})
check("投票未開放時回 403", st == 403, f"(got {st}: {d.get('error')})")

# 7. 開放投票
st, _ = req("POST", "/api/admin/settings", {"votingOpen": True})
check("開放投票", st == 200)

# 8. 正常投票（兩不同作品）
st, d = req("POST", "/api/vote", {"token": tokens[0], "teamIds": [tids[0], tids[1]]})
check("正常投票成功", st == 200, f"(got {st}: {d.get('error')})")

# 9. 同 token 再投 → 409
st, d = req("POST", "/api/vote", {"token": tokens[0], "teamIds": [tids[0], tids[2]]})
check("重複使用同一票回 409", st == 409, f"(got {st}: {d.get('error')})")

# 10. 投同一作品兩次 → 400
st, d = req("POST", "/api/vote", {"token": tokens[1], "teamIds": [tids[0], tids[0]]})
check("投同一作品兩次回 400", st == 400, f"(got {st}: {d.get('error')})")

# 11. 只投一票 → 400
st, d = req("POST", "/api/vote", {"token": tokens[1], "teamIds": [tids[0]]})
check("只投一票回 400", st == 400, f"(got {st}: {d.get('error')})")

# 12. 其餘 4 張都正常投票，湊出票數分佈
#     讓 team0 拿最多票
dist = [[tids[0],tids[1]], [tids[0],tids[2]], [tids[0],tids[1]], [tids[1],tids[2]]]
for tok, pick in zip(tokens[1:], dist):
    st, d = req("POST", "/api/vote", {"token": tok, "teamIds": pick})
    check(f"投票 {tok[:6]}", st == 200, f"(got {st}: {d.get('error')})")

# 13. 神秘客不記名：代輸入 2 份評分
def scores_for(v): return {"creativity":v,"shooting":v,"editing":v,"story":v,"impact":v}
# 第1份：team0 各項10(=50), team1 各8(=40), team2 各6(=30)
st, d = req("POST", "/api/admin/judge-scores",
    {"scores": {tids[0]:scores_for(10), tids[1]:scores_for(8), tids[2]:scores_for(6)}})
check("神秘客第1份代輸入", st == 200, f"(got {st}: {d.get('error')})")
# 第2份：team0 各9(=45), team1 各7(=35), team2 各5(=25)
st, d = req("POST", "/api/admin/judge-scores",
    {"scores": {tids[0]:scores_for(9), tids[1]:scores_for(7), tids[2]:scores_for(5)}})
check("神秘客第2份代輸入", st == 200, f"(got {st}: {d.get('error')})")

# 超範圍分數 → 400（清除後重試一份，避免額滿干擾）
req("DELETE", "/api/admin/judge-scores")
st, d = req("POST", "/api/admin/judge-scores",
    {"scores": {tids[0]: {"creativity":99,"shooting":0,"editing":0,"story":0,"impact":0}}})
check("神秘客分數超範圍回 400", st == 400, f"(got {st}: {d.get('error')})")
# 重新補回兩份正確評分
req("POST", "/api/admin/judge-scores",
    {"scores": {tids[0]:scores_for(10), tids[1]:scores_for(8), tids[2]:scores_for(6)}})
req("POST", "/api/admin/judge-scores",
    {"scores": {tids[0]:scores_for(9), tids[1]:scores_for(7), tids[2]:scores_for(5)}})

# 14. 取最終 standings 驗算
st, data = req("GET", "/api/admin/data")
S = data["standings"]
print("\n--- 最終排行榜 ---")
for r in S["results"]:
    print(f"  #{r['rank']} {r['team']['title']}: 票{r['voteCount']} 投票分{r['publicScore']} 神秘{r['judgeScore']} 總{r['finalScore']}")
print(f"  總有效票數 {S['totalValidVotes']}, 投票人數 {S['ballotsCast']}")

# 手算驗證：
# 5 張票投出（tokens0..4 各 2 票）= 10 有效票
# team0: tokens0,1,2,3 各投一次? 追蹤：
#  tok0:[0,1] tok1:[0,1] tok2:[0,2] tok3:[0,1] tok4:[1,2]
# team0 得票: tok0,tok1,tok2,tok3 = 4
# team1 得票: tok0,tok1,tok3,tok4 = 4
# team2 得票: tok2,tok4 = 2  → 合計10 ✓
check("總有效票數=10", S["totalValidVotes"] == 10, f"(got {S['totalValidVotes']})")
byid = {r["team"]["id"]: r for r in S["results"]}
check("team0 得票=4", byid[tids[0]]["voteCount"] == 4, f"(got {byid[tids[0]]['voteCount']})")
check("team1 得票=4", byid[tids[1]]["voteCount"] == 4, f"(got {byid[tids[1]]['voteCount']})")
check("team2 得票=2", byid[tids[2]]["voteCount"] == 2, f"(got {byid[tids[2]]['voteCount']})")
# team0 公開分 = 4/10*70 = 28
check("team0 公開分=28", byid[tids[0]]["publicScore"] == 28, f"(got {byid[tids[0]]['publicScore']})")
# team0 神秘總分 = 50+45 = 95 → 95/100*30 = 28.5
check("team0 神秘分=28.5", byid[tids[0]]["judgeScore"] == 28.5, f"(got {byid[tids[0]]['judgeScore']})")
# team0 final = 28 + 28.5 = 56.5
check("team0 總分=56.5", byid[tids[0]]["finalScore"] == 56.5, f"(got {byid[tids[0]]['finalScore']})")
# 冠軍是 team0（56.5 最高）
check("冠軍是 team0", S["results"][0]["team"]["id"] == tids[0], f"(got {S['results'][0]['team']['title']})")

# 15. results 頁未公開 → /results 顯示未公開（檢查 200 但含「尚未公開」字樣）
import urllib.request as u2
html = opener.open(BASE + "/results").read().decode()
check("結果頁未公開時顯示提示", "結果尚未公開" in html, "")
req("POST", "/api/admin/settings", {"resultsPublic": True})
html = opener.open(BASE + "/results").read().decode()
check("公開後結果頁顯示排行榜", "即時排行榜" in html or "總分" in html, "")

print(f"\n======== {passed} 通過, {failed} 失敗 ========")
sys.exit(1 if failed else 0)
