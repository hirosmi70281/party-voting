import { config } from "@/lib/config";
import type { Standings } from "@/lib/types";
import { Notice } from "./ui";

/** 排行榜表格（純呈現，server/client 皆可用）。 */
export function StandingsTable({ standings }: { standings: Standings }) {
  const { results } = standings;
  if (results.length === 0)
    return <Notice tone="info">尚無隊伍或成績。</Notice>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500 dark:border-neutral-800">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">作品 / 隊伍</th>
            <th className="py-2 pr-2 text-right">票數</th>
            <th className="py-2 pr-2 text-right">投票分</th>
            <th className="py-2 pr-2 text-right">神秘客分</th>
            <th className="py-2 text-right">總分</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr
              key={r.team.id}
              className="border-b border-neutral-100 dark:border-neutral-800/50"
            >
              <td className="py-2 pr-2 font-mono">
                {r.rank === 1 ? "🏆" : r.rank}
              </td>
              <td className="py-2 pr-2">
                <div className="font-medium">《{r.team.title}》</div>
                <div className="text-xs text-neutral-500">{r.team.name}</div>
              </td>
              <td className="py-2 pr-2 text-right">{r.voteCount}</td>
              <td className="py-2 pr-2 text-right">{r.publicScore}</td>
              <td className="py-2 pr-2 text-right">{r.judgeScore}</td>
              <td className="py-2 text-right font-bold">{r.finalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutral-400">
        投票分佔 {config.publicWeight}%、神秘客佔 {config.judgeWeight}%；
        同分時神秘客分較高者優先。
      </p>
    </div>
  );
}
