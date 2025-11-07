import type { Entry } from "./Data";

type Player = {
  strThumb?: string | null;
  strCutout?: string | null;
  strSport?: string | null;
  strLeague?: string | null;
  strTeam?: string | null;
  strTeam2?: string | null;
  [key: string]: unknown;
};

const isAmericanFootball = (player: Player) =>
  player.strSport?.toLowerCase() === "american football";

const isNFLLeague = (player: Player) => {
  const league = player.strLeague?.toLowerCase();
  return league?.includes("nfl") ?? false;
};

const matchesTeam = (player: Player, entry: Entry) => {
  const entryTeam = entry.team.toLowerCase();
  const teams = [player.strTeam, player.strTeam2]
    .filter((team): team is string => Boolean(team))
    .map((team) => team.toLowerCase());

  return teams.some(
    (team) => entryTeam.includes(team) || team.includes(entryTeam)
  );
};

const pickBestImage = (player: Player) => {
  if (player.strThumb) return player.strThumb;
  if (player.strCutout) return player.strCutout;

  const url = Object.values(player).find(
    (value): value is string =>
      typeof value === "string" && value.startsWith("https://")
  );

  return url ?? null;
};

export const FALLBACK_IMAGE_SRC = "/silhouette-icon.svg";

export default function fetchPic(entry: Entry) {
  const apiKey = "123"; // replace with your free key or premium key
  const url = `https://www.thesportsdb.com/api/v1/json/${apiKey}/searchplayers.php?p=${encodeURIComponent(
    entry.playerName
  )}`;

  return fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.json();
    })
    .then((data) => {
      console.log(data);
      if (!Array.isArray(data.player) || data.player.length === 0) {
        throw new Error("No player found");
      }

      const players = data.player as Player[];
      const nflPlayers = players.filter(
        (player) =>
          isAmericanFootball(player) ||
          isNFLLeague(player) ||
          matchesTeam(player, entry)
      );

      const player = (nflPlayers[0] ?? players[0]) as Player;
      const image = pickBestImage(player);

      if (!image) {
        throw new Error("No image found");
      }

      return image;
    })
    .catch((error) => {
      console.error("Failed to fetch player image", error);
      return FALLBACK_IMAGE_SRC;
    });
}
