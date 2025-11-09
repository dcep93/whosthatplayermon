import rawData from "./data.json";

export type Entry = {
  playerName: string;
  team: string;
  position: string;
  overallMaddenRating: number;
  jerseyNum: number | null;
};
export const data: Entry[] = rawData;

const BASE_URL = "https://drop-api.ea.com/rating/madden-nfl";
const LOCALE = "en";
const LIMIT = 100;

export async function fetchAllRatings(): Promise<Entry[]> {
  let offset = 0;
  const entries: Entry[] = [];

  const headers = {
    "x-feature": JSON.stringify({ enable_next_ratings_release: true }),
  };

  while (true) {
    const params = new URLSearchParams({
      locale: LOCALE,
      limit: LIMIT.toString(),
      offset: offset.toString(),
    });

    const resp = await fetch(`${BASE_URL}?${params}`, { headers });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();

    const items = json.items ?? [];
    if (!Array.isArray(items) || items.length === 0) break;

    for (const it of items) {
      entries.push({
        playerName: `${it.firstName ?? ""} ${it.lastName ?? ""}`.trim(),
        team: it.team?.label,
        position: it.position?.label,
        overallMaddenRating: Number(it.overallRating ?? 0),
        jerseyNum: it.jerseyNum,
      });
    }

    offset += LIMIT;
    if (items.length < LIMIT) break;
  }

  return entries;
}
