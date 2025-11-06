import { Button, Select, Stack } from "@mantine/core";
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
  const [imgLoaded, updateImgLoaded] = useState(false);
  const [durationMs, updateDuration] = useState(0);
  const [isSharpening, updateIsSharpening] = useState(false);
  const [guess, setGuess] = useState<string | null>(null);
  const [isImageForcedClear, setIsImageForcedClear] = useState(false);
  const [isAnswerManuallyRevealed, setIsAnswerManuallyRevealed] =
    useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<
    "idle" | "correct" | "incorrect"
  >("idle");

  useEffect(() => void fetchPic(props.entry).then(updateImgSrc), [props.entry]);

  useEffect(() => {
    if (!isSharpening) {
      return;
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
  const hasTimerFinished = durationMs >= MAX_DURATION_MS;
  const showAnswer = isAnswerManuallyRevealed;
  const shouldRevealDetails = showAnswer || submissionStatus === "incorrect";
  const isImageClear = isImageForcedClear || hasTimerFinished;
  const blur = isImageClear
    ? 0
    : Math.pow(Math.max(0, MAX_DURATION_MS - durationMs) / MAX_DURATION_MS, 2.5) *
      15;
  const canResume = durationMs < MAX_DURATION_MS;
  const buttonLabel = isSharpening
    ? "stop"
    : durationMs === 0
    ? "start"
    : canResume
    ? "resume"
    : "restart";
  const { playerName: _playerName, ...entryWithoutPlayerName } = props.entry;
  const entryDisplay: Record<string, unknown> = shouldRevealDetails
    ? props.entry
    : entryWithoutPlayerName;
  const handleRestart = () => {
    updateDuration(0);
    updateIsSharpening(false);
    setIsImageForcedClear(false);
    setIsAnswerManuallyRevealed(false);
    setGuess(null);
    setSubmissionStatus("idle");
  };
  const handleStart = () => {
    updateDuration(0);
    updateIsSharpening(true);
    setIsImageForcedClear(false);
    setIsAnswerManuallyRevealed(false);
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
    } else if (durationMs === 0) {
      handleStart();
    } else if (canResume) {
      handleResume();
    } else {
      handleRestart();
    }
  };
  const handleShowAnswer = () => {
    setIsImageForcedClear(true);
    setIsAnswerManuallyRevealed(true);
    updateIsSharpening(false);
  };
  const handleShowPictureOnly = () => {
    setIsImageForcedClear(true);
    setIsAnswerManuallyRevealed(false);
    updateIsSharpening(false);
    updateDuration(MAX_DURATION_MS);
  };

  const handleSubmitGuess = () => {
    if (!guess) {
      return;
    }

    const isCorrectGuess = guess === props.entry.playerName;
    updateIsSharpening(false);

    if (isCorrectGuess) {
      setSubmissionStatus("correct");
      setIsImageForcedClear(true);
      setIsAnswerManuallyRevealed(true);
      return;
    }

    setSubmissionStatus("incorrect");
  };

  useEffect(() => {
    if (durationMs >= MAX_DURATION_MS) {
      setIsImageForcedClear(true);
    }
  }, [durationMs]);

  return (
    <Stack gap="sm">
      <pre
        style={{
          maxWidth: "100%",
          overflowX: "auto",
        }}
      >
        {JSON.stringify(
          {
            ...entryDisplay,
            ...(!imgLoaded ? {} : { durationMs, MAX_DURATION_MS }),
          },
          null,
          2
        )}
      </pre>

      {!imgSrc ? null : (
        <Stack>
          <Stack gap="xs">
            <Button fullWidth onClick={handleButtonClick}>
              {buttonLabel}
            </Button>
            <Button fullWidth onClick={handleShowAnswer} disabled={showAnswer}>
              Show answer
            </Button>
            <Button
              fullWidth
              onClick={handleShowPictureOnly}
              disabled={isImageClear && !showAnswer}
            >
              Show picture only
            </Button>
          </Stack>
          <img
            onLoad={() => updateImgLoaded(true)}
            alt={"no img found"}
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
          {!imgLoaded || isSharpening ? null : (
            <Stack gap="xs">
              <Select
                label="Your answer"
                placeholder="Select a player"
                data={PLAYER_NAME_OPTIONS}
                searchable
                value={guess}
                onChange={setGuess}
                nothingFoundMessage="No matching players"
              />
              <Button fullWidth onClick={handleSubmitGuess} disabled={!guess}>
                Submit guess
              </Button>
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
