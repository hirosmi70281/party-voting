import { config } from "@/lib/config";
import { getSettings, getStandings } from "@/lib/store";
import { Shell, Notice } from "@/components/ui";
import { StandingsTable } from "@/components/StandingsTable";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const settings = await getSettings();
  if (!settings.resultsPublic) {
    return (
      <Shell title={config.eventName}>
        <Notice tone="warn" title="結果尚未公開">
          排行榜將於主辦單位公布時開放，敬請期待 🏆
        </Notice>
      </Shell>
    );
  }
  const standings = await getStandings();
  return (
    <Shell title="即時排行榜" subtitle={config.eventName}>
      <StandingsTable standings={standings} />
    </Shell>
  );
}
