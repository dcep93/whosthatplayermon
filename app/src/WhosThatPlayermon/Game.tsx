import { useState } from "react";

import rawData from "./data.json";

type Entry = {
  playerName: string;
  team: string;
  position: string;
  proBowlProb: number;
  imgSrc: string;
};
const data: Entry[] = rawData;

export default function Game() {
  const [entry, setEntry] = useState<Entry | null>(null);
  return (
    <div>
      {!entry ? (
        <button
          onClick={() =>
            Promise.resolve()
              .then(() => data[Math.floor(Math.random() * data.length)])
              .then((_entry) => setEntry(_entry))
          }
        >
          fetch
        </button>
      ) : (
        <div>
          <pre>{JSON.stringify(entry, null, 2)}</pre>
          <img src={entry.imgSrc} />
        </div>
      )}
    </div>
  );
}
