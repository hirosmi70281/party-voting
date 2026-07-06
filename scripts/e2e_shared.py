#!/usr/bin/env python3
"""測試共用連結投票（不記名、2票、cookie 軟性防重複）。需 dev server(3100)。"""
import json, urllib.request, urllib.error, http.cookiejar, sys, re, os

BASE = os.environ.get("BASE", "http://localhost:3100")

def new_client():
    cj = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def req(opener, method, path, body=None):
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
    ok = bool(cond); print(f"{'✓' if ok else '✗'} {label} {extra}")
    passed += 1 if ok else 0; failed += 0 if ok else 1

secret = None
with open(os.path.join(os.path.dirname(__file__), "..", ".env.local")) as f:
    for line in f:
        m = re.match(r'ADMIN_SECRET="?([^"\n]+)"?', line.strip())
        if m: secret = m.group(1)

admin = new_client()
req(admin, "POST", "/api/admin/session", {"secret": secret})
# 確保有隊伍 + 投票開放
st, data = req(admin, "GET", "/api/admin/data")
tids = [t["id"] for t in data["teams"]]
if len(tids) < 2:
    for nm in ["S1","S2","S3"]:
        st,d = req(admin,"POST","/api/admin/teams",{"name":nm,"title":nm,"videoUrl":""})
        tids.append(d["team"]["id"])
req(admin, "POST", "/api/admin/settings", {"votingOpen": True})
check("有 >=2 隊可投", len(tids) >= 2)

# 記錄目前 A 隊票數
st, data = req(admin, "GET", "/api/admin/data")
before = {r["team"]["id"]: r["voteCount"] for r in data["standings"]["results"]}

# 同仁1：共用連結（無 token）投 2 不同作品 → 成功
v1 = new_client()
st, d = req(v1, "POST", "/api/vote", {"teamIds": [tids[0], tids[1]]})
check("共用投票（2不同）成功", st == 200, f"(got {st}: {d.get('error')})")

# 同仁1 再投 → cookie 擋下 409
st, d = req(v1, "POST", "/api/vote", {"teamIds": [tids[0], tids[1]]})
check("同一裝置再投回 409", st == 409, f"(got {st}: {d.get('error')})")

# 同仁2（新裝置）只投 1 票 → 400（每人須投2票）
v2 = new_client()
st, d = req(v2, "POST", "/api/vote", {"teamIds": [tids[0]]})
check("只投1票回 400", st == 400, f"(got {st}: {d.get('error')})")

# 同仁2 投同一作品兩次 → 400
st, d = req(v2, "POST", "/api/vote", {"teamIds": [tids[0], tids[0]]})
check("同作品投兩次回 400", st == 400, f"(got {st}: {d.get('error')})")

# 同仁2 正常投 2 不同 → 成功
st, d = req(v2, "POST", "/api/vote", {"teamIds": [tids[0], tids[2] if len(tids)>2 else tids[1]]})
check("同仁2 正常投成功", st == 200, f"(got {st})")

# 驗證票數：A 隊(tids[0]) 應 +2（兩位同仁都投了 A）
st, data = req(admin, "GET", "/api/admin/data")
after = {r["team"]["id"]: r["voteCount"] for r in data["standings"]["results"]}
check("A隊票數 +2", after[tids[0]] - before.get(tids[0],0) == 2,
      f"(before {before.get(tids[0],0)} after {after[tids[0]]})")

# 關閉投票後，共用投票應 403
req(admin, "POST", "/api/admin/settings", {"votingOpen": False})
v3 = new_client()
st, d = req(v3, "POST", "/api/vote", {"teamIds": [tids[0], tids[1]]})
check("投票關閉後共用投票回 403", st == 403, f"(got {st})")
req(admin, "POST", "/api/admin/settings", {"votingOpen": True})

print(f"\n======== {passed} 通過, {failed} 失敗 ========")
sys.exit(1 if failed else 0)
