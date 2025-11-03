import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DATA_PATH = "app/src/WhosThatPlayermon/data.json";
const API_BASE = "https://www.thesportsdb.com/api/v1/json/3/searchplayers.php";

const TEAM_SYNONYMS = new Map([
  ["arizona cardinals", "arizona cardinals"],
  ["atlanta falcons", "atlanta falcons"],
  ["baltimore ravens", "baltimore ravens"],
  ["buffalo bills", "buffalo bills"],
  ["carolina panthers", "carolina panthers"],
  ["chicago bears", "chicago bears"],
  ["cincinnati bengals", "cincinnati bengals"],
  ["cleveland browns", "cleveland browns"],
  ["dallas cowboys", "dallas cowboys"],
  ["denver broncos", "denver broncos"],
  ["detroit lions", "detroit lions"],
  ["green bay packers", "green bay packers"],
  ["houston texans", "houston texans"],
  ["indianapolis colts", "indianapolis colts"],
  ["jacksonville jaguars", "jacksonville jaguars"],
  ["kansas city chiefs", "kansas city chiefs"],
  ["las vegas raiders", "las vegas raiders"],
  ["los angeles chargers", "los angeles chargers"],
  ["la chargers", "los angeles chargers"],
  ["los angeles rams", "los angeles rams"],
  ["miami dolphins", "miami dolphins"],
  ["minnesota vikings", "minnesota vikings"],
  ["new england patriots", "new england patriots"],
  ["new orleans saints", "new orleans saints"],
  ["new york giants", "new york giants"],
  ["ny giants", "new york giants"],
  ["new york jets", "new york jets"],
  ["ny jets", "new york jets"],
  ["philadelphia eagles", "philadelphia eagles"],
  ["pittsburgh steelers", "pittsburgh steelers"],
  ["san francisco 49ers", "san francisco 49ers"],
  ["seattle seahawks", "seattle seahawks"],
  ["tampa bay buccaneers", "tampa bay buccaneers"],
  ["tennessee titans", "tennessee titans"],
  ["washington commanders", "washington commanders"],
  ["washington football team", "washington commanders"],
  ["washington redskins", "washington commanders"],
  ["st. louis rams", "los angeles rams"],
  ["oakland raiders", "las vegas raiders"],
  ["san diego chargers", "los angeles chargers"],
]);

const normalizeTeam = (team) => {
  if (!team) return null;
  const key = team.trim().toLowerCase();
  return TEAM_SYNONYMS.get(key) ?? key;
};

const pickImage = (candidate) => {
  if (!candidate) return null;
  return (
    candidate.strThumb ||
    candidate.strFanart1 ||
    candidate.strFanart2 ||
    candidate.strFanart3 ||
    candidate.strFanart4 ||
    candidate.strRender ||
    candidate.strCutout ||
    null
  );
};

const normalize = (value) => value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";

async function fetchEspnHeadshot(player) {
  const rawName = player.playerName;
  const queries = new Set([rawName]);

  const strippedSuffix = rawName.replace(/\b(Jr|Sr|II|III|IV)\.?$/i, "").trim();
  if (strippedSuffix && strippedSuffix !== rawName) {
    queries.add(strippedSuffix);
  }

  const punctuationless = strippedSuffix
    .replace(/[.'`]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (punctuationless) {
    queries.add(punctuationless);
  }

  for (const queryText of queries) {
    const query = encodeURIComponent(queryText);
    const url = `https://site.api.espn.com/apis/common/v3/search?query=${query}&type=player&limit=25`;

    try {
      const { stdout } = await execFileAsync("curl", ["-s", url]);
      if (!stdout.trim()) {
        continue;
      }

      const payload = JSON.parse(stdout);
      const items = payload.items ?? [];
      if (items.length === 0) {
        continue;
      }

      const targetName = normalize(rawName);
      const leagueFiltered = items.filter((item) => item.league === "nfl");
      const normalizedMatch = leagueFiltered.find(
        (item) => normalize(item.displayName) === targetName
      );
      const candidate = normalizedMatch ?? leagueFiltered[0] ?? items[0];
      const headshot = candidate?.headshot?.href ?? null;
      if (headshot) {
        return headshot;
      }
    } catch (error) {
      console.warn(
        `Failed to fetch ESPN headshot for ${player.playerName}:`,
        error.message ?? error
      );
    }
  }

  return null;
}

async function fetchCandidate(player) {
  const query = encodeURIComponent(player.playerName);
  const url = `${API_BASE}?p=${query}`;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const { stdout } = await execFileAsync("curl", ["-s", url]);
      const trimmed = stdout.trim();
      if (!trimmed) {
        return null;
      }

      if (trimmed.includes("error code: 1015")) {
        const waitMs = 800 * (attempt + 1);
        await delay(waitMs);
        continue;
      }

      const payload = JSON.parse(trimmed);
      const candidates = (payload.player ?? []).filter(
        (entry) => entry.strSport?.toLowerCase() === "american football"
      );

      if (candidates.length === 0) {
        return null;
      }

      const normalizedTeam = normalizeTeam(player.team);
      const withImages = candidates.filter((candidate) => pickImage(candidate));
      const teamMatches = candidates.filter((candidate) => {
        const candidateTeam = normalizeTeam(candidate.strTeam);
        return candidateTeam && normalizedTeam && candidateTeam === normalizedTeam;
      });

      const teamMatchWithImage = teamMatches.find((candidate) => pickImage(candidate));
      const fallbackWithImage = withImages[0];
      const chosen =
        teamMatchWithImage ?? fallbackWithImage ?? teamMatches[0] ?? candidates[0];
      return pickImage(chosen);
    } catch (error) {
      if (attempt === 5) {
        console.warn(
          `Failed to fetch ${player.playerName}:`,
          error.message ?? error
        );
      }
      await delay(500 * (attempt + 1));
    }
  }

  return null;
}

async function main() {
  const raw = await readFile(DATA_PATH, "utf-8");
  const players = JSON.parse(raw);
  const enriched = new Array(players.length);
  const missing = [];
  const processedCount = { value: 0 };

  let nextIndex = 0;
  const CONCURRENCY = 8;

  const worker = async () => {
    while (true) {
      const index = nextIndex;
      if (index >= players.length) {
        break;
      }
      nextIndex += 1;

      const player = players[index];
      const hasExistingImage = typeof player.imgSrc === "string" && player.imgSrc.trim().length > 0;
      if (hasExistingImage) {
        enriched[index] = player;
      } else {
        let imgSrc = await fetchCandidate(player);
        if (!imgSrc) {
          imgSrc = await fetchEspnHeadshot(player);
        }

        if (!imgSrc) {
          missing.push(player);
          enriched[index] = { ...player, imgSrc: "" };
        } else {
          enriched[index] = { ...player, imgSrc };
        }
      }

      processedCount.value += 1;
      if (processedCount.value % 25 === 0) {
        console.log(`Processed ${processedCount.value} / ${players.length}`);
      }

      await delay(40);
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await writeFile(DATA_PATH, `${JSON.stringify(enriched, null, 2)}\n`, "utf-8");

  if (missing.length > 0) {
    console.warn(`Missing images for ${missing.length} players`);
    await writeFile(
      "scripts/missing-image-players.json",
      `${JSON.stringify(missing, null, 2)}\n`,
      "utf-8"
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
