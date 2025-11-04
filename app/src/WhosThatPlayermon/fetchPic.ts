import type { Entry } from "./Data";

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
      if (!data.player || data.player.length === 0) {
        throw new Error("No player found");
      }
      const player = data.player[0];
      return (
        player.strThumb ||
        player.strCutout ||
        (Object.values(player) as string[]).find((s) =>
          s?.startsWith("https://")
        )
      );
    });
}
