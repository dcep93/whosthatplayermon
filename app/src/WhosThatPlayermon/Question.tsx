import { Select, Stack } from "@mantine/core";
import { useEffect, useState } from "react";
import { data, type Entry } from "./Data";
import fetchPic from "./fetchPic";

const IMG_WIDTH_PX = 300;
const MAX_DURATION_MS = 5000;
const INTERVAL_MS = 10;

const PLAYER_NAME_OPTIONS = Array.from(
  new Set(data.map(({ playerName }) => playerName))
)
  .sort((a, b) => a.localeCompare(b))
  .map((playerName) => ({ value: playerName, label: playerName }));

export default function Question(props: { entry: Entry }) {
  const [imgSrc, updateImgSrc] = useState<string | null>(null);
  const [durationMs, updateDuration] = useState(0);
  const [isSharpening, updateIsSharpening] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);

  useEffect(() => void fetchPic(props.entry).then(updateImgSrc), [props.entry]);

  useEffect(() => {
    updateDuration(0);
    updateIsSharpening(false);
    setGuess(null);
  }, [props.entry]);

  useEffect(() => {
    if (!isSharpening) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      updateDuration((prev) => Math.min(MAX_DURATION_MS, prev + INTERVAL_MS));
    }, INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isSharpening]);

  useEffect(() => {
    if (!isSharpening) {
      return;
    }

    if (durationMs >= MAX_DURATION_MS) {
      updateIsSharpening(false);
    }
  }, [durationMs, isSharpening]);
  const blur =
    Math.pow(Math.max(0, MAX_DURATION_MS - durationMs) / MAX_DURATION_MS, 2.5) *
    15;
  const canResume = durationMs < MAX_DURATION_MS;
  const buttonLabel = isSharpening
    ? "stop"
    : canResume
    ? "resume"
    : durationMs === 0
    ? "start"
    : "restart";
  const handleRestart = () => {
    updateDuration(0);
    updateIsSharpening(false);
  };
  const handleStart = () => {
    updateDuration(0);
    updateIsSharpening(true);
  };
  const handleResume = () => {
    updateIsSharpening(true);
  };
  const handleStop = () => {
    updateIsSharpening(false);
  };
  const handleButtonClick = () => {
    if (isSharpening) {
      handleStop();
      return;
    }

    if (canResume) {
      handleResume();
    } else if (durationMs === 0) {
      handleStart();
    } else {
      handleRestart();
    }
  };
  return (
    <Stack gap="sm">
      <pre>
        {JSON.stringify(
          {
            ...props.entry,
            playerName: undefined,
            durationMs,
            MAX_DURATION_MS,
          },
          null,
          2
        )}
      </pre>

      {!imgSrc ? null : (
        <Stack>
          <button onClick={handleButtonClick}>{buttonLabel}</button>
          <img
            alt={props.entry.playerName}
            src={imgSrc}
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
          {isSharpening ? null : (
            <Select
              label="Your answer"
              placeholder="Select a player"
              data={PLAYER_NAME_OPTIONS}
              searchable
              value={guess}
              onChange={setGuess}
              nothingFoundMessage="No matching players"
            />
          )}
        </Stack>
      )}
    </Stack>
  );
}
