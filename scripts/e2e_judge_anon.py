#!/usr/bin/env python3
"""測試神秘客不記名共用評分：一連結、最多2份、相加、固定除以2、清除/代輸入。dev server(3100)。"""
import json, urllib.request, urllib.error, http.cookiejar, sys, re, os

BASE = os.environ.get("BASE", "http://localhost:3100")
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def req(method, path, body=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"Content-Type": "application/json"})
    try:
        resp = opener.open(r); b = resp.read()
        return resp.status, (b.decode() if raw else json.loads(b or b"{}"))
    except urllib.error.HTTPError as e:
        return e.code, (e.read().decode() if raw else json.loads(e.read() or b"{}"))

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
req("POST", "/api/admin/session", {"secret": secret})

# 建 2 隊
tids = []
for nm in ["A","B"]:
    st,d=req("POST","/api/admin/teams",{"name":nm,"title":nm,"videoUrl":""})
    tids.append(d["team"]["id"])

st, data = req("GET", "/api/admin/data")
share = data["judgeShareToken"]
check("data 有 judgeShareToken", bool(share))
check("judgeCount=2", data["judgeCount"] == 2, f"(got {data['judgeCount']})")
check("初始已收 0 份", data["judgeSubmissionCount"] == 0, f"(got {data['judgeSubmissionCount']})")

def sc(v): return {"creativity":v,"shooting":v,"editing":v,"story":v,"impact":v}

# 錯誤密鑰 → 404
st,d = req("POST","/api/judge",{"token":"wrong","scores":{tids[0]:sc(5),tids[1]:sc(5)}})
check("錯誤密鑰回 404", st==404, f"(got {st})")

# 第 1 位：team0=各10(50), team1=各6(30)
st,d = req("POST","/api/judge",{"token":share,"scores":{tids[0]:sc(10),tids[1]:sc(6)}})
check("第1份成功 count=1", st==200 and d.get("count")==1, f"(got {st} {d})")

# 超範圍 → 400
st,d = req("POST","/api/judge",{"token":share,"scores":{tids[0]:{"creativity":99,"shooting":0,"editing":0,"story":0,"impact":0}}})
check("分數超範圍回 400", st==400, f"(got {st}: {d.get('error')})")

# 第 2 位：team0=各8(40), team1=各4(20)
st,d = req("POST","/api/judge",{"token":share,"scores":{tids[0]:sc(8),tids[1]:sc(4)}})
check("第2份成功 count=2", st==200 and d.get("count")==2, f"(got {st} {d})")

# 第 3 位 → 額滿 403
st,d = req("POST","/api/judge",{"token":share,"scores":{tids[0]:sc(1),tids[1]:sc(1)}})
check("第3份額滿回 403", st==403, f"(got {st}: {d.get('error')})")

# 計分：team0 神秘總分 50+40=90 → 90/100*30 = 27；team1 30+20=50 → 15
st, data = req("GET", "/api/admin/data")
byid = {r["team"]["id"]: r for r in data["standings"]["results"]}
check("team0 神秘分=27（相加）", byid[tids[0]]["judgeScore"]==27, f"(got {byid[tids[0]]['judgeScore']})")
check("team1 神秘分=15", byid[tids[1]]["judgeScore"]==15, f"(got {byid[tids[1]]['judgeScore']})")
check("data 顯示已收 2 份", data["judgeSubmissionCount"]==2, f"(got {data['judgeSubmissionCount']})")

# 共用頁：額滿時顯示「額滿」
st, html = req("GET", f"/judge/{share}", raw=True)
check("額滿時共用頁顯示額滿", "評分已額滿" in html)

# 清除重來 → 0
st,d = req("DELETE","/api/admin/judge-scores")
check("清除成功", st==200)
st, data = req("GET", "/api/admin/data")
check("清除後 0 份", data["judgeSubmissionCount"]==0, f"(got {data['judgeSubmissionCount']})")
check("清除後 team0 神秘分=0", {r["team"]["id"]:r for r in data["standings"]["results"]}[tids[0]]["judgeScore"]==0)

# 共用頁：未額滿時顯示評分表單（含評分項目「創意表現」）
st, html = req("GET", f"/judge/{share}", raw=True)
check("未額滿共用頁顯示評分表單", "創意表現" in html)

# admin 代輸入一份
st,d = req("POST","/api/admin/judge-scores",{"scores":{tids[0]:sc(10),tids[1]:sc(10)}})
check("admin 代輸入成功 count=1", st==200 and d.get("count")==1, f"(got {st} {d})")

print(f"\n======== {passed} 通過, {failed} 失敗 ========")
sys.exit(1 if failed else 0)
