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
      if (!data.player || data.player.length === 0) {
        throw new Error("No player found");
      }
      const player = data.player[0];
      console.log(player);
      // Example image fields: strThumb, strCutout, strRender, strFanart1…4
      //   console.log("Thumbnail:", player.strThumb);
      //   console.log("Cut-out:", player.strCutout);
      //   console.log("Fanart1:", player.strFanart1);
      //   console.log("Fanart2:", player.strFanart2);
      // Filter for “action shot” if you have naming conventions or tags
      // e.g.
      //   const actionShots = [
      //     player.strFanart1,
      //     player.strFanart2,
      //     player.strFanart3,
      //     player.strFanart4,
      //   ].filter((url) => url && url.includes("/fanart/"));
      //   console.log("Action shots:", actionShots);
    })
    .catch((err) => console.error("Error fetching player data:", err))
    .then(
      () =>
        "https://r2.thesportsdb.com/images/media/player/thumb/a65pcn1553362435.jpg"
    );
}
