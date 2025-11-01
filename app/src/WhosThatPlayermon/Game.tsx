import { useState } from "react";
import fetchPic, { type PicData } from "./fetchPic";
import type { User } from "./useAuth";

export default function Game(props: { user: User }) {
  const [picData, setPicData] = useState<PicData | null>(null);
  return (
    <div>
      <pre>{JSON.stringify(props.user, null, 2)}</pre>
      {!picData ? (
        <button
          onClick={() =>
            Promise.resolve()
              .then(() => fetchPic(props.user))
              .then((_picData) => setPicData(_picData))
          }
        >
          fetch
        </button>
      ) : (
        <div>
          <div>{picData.answer}</div>
          <img src={picData.src} />
        </div>
      )}
    </div>
  );
}
