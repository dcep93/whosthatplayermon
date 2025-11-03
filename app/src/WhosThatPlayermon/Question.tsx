import { Stack } from "@mantine/core";
import { useMemo, useState } from "react";
import type { Entry } from "./Data";

const IMG_WIDTH_PX = 300;
const MAX_DURATION_MS = 5000;
const INTERVAL_MS = 10;

export default function Question(props: { entry: Entry }) {
  const [duration, updateDuration] = useState(0);
  const [isSharpening, updateIsSharpening] = useState(false);
  useMemo(
    () =>
      setInterval(() => {
        if (isSharpening) updateDuration((prev) => prev + INTERVAL_MS);
      }, INTERVAL_MS),
    [isSharpening, updateDuration]
  );
  const blur = Math.floor(
    (IMG_WIDTH_PX * Math.max(0, MAX_DURATION_MS - duration)) / MAX_DURATION_MS
  );
  return (
    <Stack gap="sm">
      <pre>
        {JSON.stringify(
          { ...props.entry, playerName: undefined, imgSrc: undefined },
          null,
          2
        )}
      </pre>
      <div>{duration}</div>
      {isSharpening ? (
        <button onClick={() => updateIsSharpening(false)}>stop</button>
      ) : (
        <button onClick={() => updateIsSharpening(true)}>start</button>
      )}
      {props.entry.imgSrc ? (
        <img
          alt={props.entry.playerName}
          src={props.entry.imgSrc}
          style={{
            width: `${IMG_WIDTH_PX}px`,
            filter: `blur(${blur}px)`,
            // small perf wins:
            willChange: "filter",
            transform: "translateZ(0)", // promote to its own layer on many GPUs
          }}
          // Keeps edges from bleeding during blur:
          decoding="async"
          loading="lazy"
        />
      ) : null}
    </Stack>
  );
}
