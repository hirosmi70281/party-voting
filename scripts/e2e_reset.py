#!/usr/bin/env python3
"""測試「清空票數」：投票+加分後總票數>0，reset 後歸零。需 dev server(3100)。"""
import json, urllib.request, urllib.error, http.cookiejar, os, re

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
    globals().__setitem__('passed', passed + (1 if ok else 0))
    globals().__setitem__('failed', failed + (0 if ok else 1))

secret = None
with open(os.path.join(os.path.dirname(__file__), "..", ".env.local")) as f:
    for line in f:
        m = re.match(r'ADMIN_SECRET="?([^"\n]+)"?', line.strip())
        if m: secret = m.group(1)

admin = new_client()
req(admin, "POST", "/api/admin/session", {"secret": secret})

st, data = req(admin, "GET", "/api/admin/data")
tids = [t["id"] for t in data["teams"]]
while len(tids) < 2:
    st, d = req(admin, "POST", "/api/admin/teams",
                {"name": f"R{len(tids)}", "title": f"R{len(tids)}", "videoUrl": ""})
    tids.append(d["team"]["id"])
req(admin, "POST", "/api/admin/settings", {"votingOpen": True})

# 一般同仁共用投票
v = new_client()
req(v, "POST", "/api/vote", {"teamIds": [tids[0], tids[1]]})
# 加分同仁分配
st, d = req(admin, "POST", "/api/admin/bonus", {"name": "TOP-R", "budget": 5})
bid = d["bonus"]["id"]
req(admin, "PATCH", "/api/admin/bonus", {"id": bid, "allocations": {tids[0]: 5}})

st, data = req(admin, "GET", "/api/admin/data")
total_before = data["standings"]["totalValidVotes"]
check("清空前總票數 > 0", total_before > 0, f"(={total_before})")

# 清空
st, d = req(admin, "POST", "/api/admin/reset-votes")
check("reset 回 200", st == 200, f"(got {st})")
check("clearedVotes 回報 > 0", d.get("clearedVotes", 0) > 0, f"(={d.get('clearedVotes')})")

st, data = req(admin, "GET", "/api/admin/data")
total_after = data["standings"]["totalValidVotes"]
check("清空後總票數 = 0", total_after == 0, f"(={total_after})")

# 加分同仁還在，但分配已清空
bonus = {b["id"]: b for b in data["bonusVoters"]}
check("加分同仁仍保留", bid in bonus)
check("加分分配已清空", bonus.get(bid, {}).get("allocations") in ({}, None),
      f"(={bonus.get(bid, {}).get('allocations')})")

# 未授權無法清空
anon = new_client()
st, d = req(anon, "POST", "/api/admin/reset-votes")
check("未授權 reset 被擋(401)", st == 401, f"(got {st})")

print(f"\n{passed} passed, {failed} failed")
exit(1 if failed else 0)
