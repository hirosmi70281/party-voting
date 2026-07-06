/**
 * 用辦法裡的範例數字驗證計分公式。執行： npx tsx scripts/verify-scoring.ts
 */
import { computeStandings } from "../lib/scoring";
import type { Team } from "../lib/types";

function team(id: string, order: number): Team {
  return { id, name: id, title: id, videoUrl: "", order, createdAt: 0 };
}

let pass = 0;
let fail = 0;
function expect(label: string, actual: number, want: number) {
  const okv = Math.abs(actual - want) < 1e-9;
  console.log(`${okv ? "✓" : "✗"} ${label}: got ${actual}, want ${want}`);
  okv ? pass++ : fail++;
}

// 範例：40 人 × 2 票 = 80 有效票；A 隊 24 票 → 公開投票分 21
// 神秘客 A 46 + B 43 = 89 → 神秘客分 26.7
const teams = [team("A", 1), team("B", 2), team("C", 3)];
const voteCounts = { A: 24, B: 32, C: 24 }; // 合計 80
const judgeTotals = { A: 89, B: 70, C: 89 };

const s = computeStandings(teams, voteCounts, judgeTotals);
expect("總有效票數", s.totalValidVotes, 80);
expect("投票人數", s.ballotsCast, 40);

const A = s.results.find((r) => r.team.id === "A")!;
expect("A 公開投票分", A.publicScore, 21);
expect("A 神秘客分", A.judgeScore, 26.7);
expect("A 最終分", A.finalScore, 47.7);

const B = s.results.find((r) => r.team.id === "B")!;
// B: 32/80*70 = 28 ; 70/100*30 = 21 ; final 49
expect("B 公開投票分", B.publicScore, 28);
expect("B 神秘客分", B.judgeScore, 21);
expect("B 最終分", B.finalScore, 49);

// 排名：B(49) > A(47.7) > C。A 與 C 公開分同(21)神秘同(26.7) final 同 47.7，
// 平手時 judgeScore 相同 → 退回 order，A(order1) 在前。
expect("第一名是 B", s.results[0].team.id === "B" ? 1 : 0, 1);
expect("A 排在 C 前（tiebreak order）",
  s.results.findIndex((r) => r.team.id === "A") <
    s.results.findIndex((r) => r.team.id === "C") ? 1 : 0, 1);

// 平手但神秘客分不同 → 神秘客高者優先
const s2 = computeStandings(
  [team("X", 1), team("Y", 2)],
  { X: 10, Y: 10 }, // 公開分相同
  { X: 40, Y: 80 }, // Y 神秘客高
);
// X: 35 + 12 = 47 ; Y: 35 + 24 = 59 → Y first anyway. 造一個 final 同分的：
const s3 = computeStandings(
  [team("P", 1), team("Q", 2)],
  { P: 20, Q: 10 }, // P 公開分高
  { P: 0, Q: 100 }, // Q 神秘客滿分
);
// total=30. P: 20/30*70=46.67 +0 =46.67 ; Q:10/30*70=23.33 +30=53.33
console.log("  (資訊) P final", s3.results.find(r=>r.team.id==="P")!.finalScore,
  "Q final", s3.results.find(r=>r.team.id==="Q")!.finalScore);

console.log(`\n結果：${pass} 通過、${fail} 失敗`);
process.exit(fail === 0 ? 0 : 1);
