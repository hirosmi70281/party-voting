#!/usr/bin/env python3
"""測試神秘客共用連結：一條連結、兩位各自評分、分數相加。需 dev server(3100)。"""
import json, urllib.request, urllib.error, http.cookiejar, sys, re, os

BASE = os.environ.get("BASE", "http://localhost:3100")
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def req(method, path, body=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method,
                               headers={"Content-Type": "application/json"})
    try:
        resp = opener.open(r)
        b = resp.read()
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

# 準備隊伍
st, data = req("GET", "/api/admin/data")
tids = [t["id"] for t in data["teams"]]
if len(tids) < 2:
    for nm in ["J1","J2","J3"]:
        st,d=req("POST","/api/admin/teams",{"name":nm,"title":nm,"videoUrl":""})
        tids.append(d["team"]["id"])

# 建 2 神秘客
jt = []
for nm in ["神秘客甲", "神秘客乙"]:
    st, d = req("POST", "/api/admin/tokens", {"kind":"judge","name":nm})
    jt.append(d["judge"]["token"])
check("建 2 神秘客", len(jt) == 2)

# 取共用連結密鑰
st, data = req("GET", "/api/admin/data")
share = data["judgeShareToken"]
check("data 有 judgeShareToken", bool(share), f"({share})")

# 打開共用連結頁 → 應含「選擇你是哪一位」+ 兩位名字
st, html = req("GET", f"/judge/{share}", raw=True)
check("共用頁可開啟", st == 200)
check("共用頁含選擇提示", "請選擇你是哪一位神秘客" in html)
check("共用頁列出 神秘客甲", "神秘客甲" in html)
check("共用頁列出 神秘客乙", "神秘客乙" in html)
check("共用頁連到甲的評分頁", f"/judge/{jt[0]}" in html)

# 亂猜的密鑰不該顯示 picker（會被當一般 token → 無效連結）
st, html2 = req("GET", "/judge/totally-wrong-xyz", raw=True)
check("錯誤密鑰不進 picker", "請選擇你是哪一位神秘客" not in html2)

# 兩位各自評分（透過各自 token；模擬選完身分後）
def sc(v): return {"creativity":v,"shooting":v,"editing":v,"story":v,"impact":v}
# 甲：team0=各10(50) team1=各6(30)；乙：team0=各8(40) team1=各4(20)
req("POST", "/api/judge", {"token": jt[0], "scores": {tids[0]:sc(10), tids[1]:sc(6)}})
req("POST", "/api/judge", {"token": jt[1], "scores": {tids[0]:sc(8), tids[1]:sc(4)}})

st, data = req("GET", "/api/admin/data")
byid = {r["team"]["id"]: r for r in data["standings"]["results"]}
# team0 神秘總分 = 50+40 = 90 → 90/100*30 = 27
check("team0 神秘客分=27（兩位相加）", byid[tids[0]]["judgeScore"] == 27,
      f"(got {byid[tids[0]]['judgeScore']})")
# team1 = 30+20=50 → 15
check("team1 神秘客分=15", byid[tids[1]]["judgeScore"] == 15,
      f"(got {byid[tids[1]]['judgeScore']})")

print(f"\n======== {passed} 通過, {failed} 失敗 ========")
sys.exit(1 if failed else 0)
