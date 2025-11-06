import {
  Badge,
  Button,
  Card,
  Group,
  Progress,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { type ReactNode } from "react";
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

const formatSeconds = (value: number) => (value / 1000).toFixed(1);

function Detail(props: { label: string; value: ReactNode }) {
  const { label, value } = props;

  return (
    <Stack gap={0}>
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={500}>{value}</Text>
    </Stack>
  );
}

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
  const guessedEntry = useMemo(
    () => data.find((entry) => entry.playerName === guess),
    [guess]
  );

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
  const statusBadge = (() => {
    if (submissionStatus === "correct") {
      return { color: "green", label: "Correct guess" } as const;
    }

    if (submissionStatus === "incorrect") {
      return { color: "red", label: "Incorrect guess" } as const;
    }

    if (isSharpening) {
      return { color: "yellow", label: "Sharpening in progress" } as const;
    }

    if (isImageClear) {
      return { color: "blue", label: "Image ready" } as const;
    }

    return { color: "gray", label: "Awaiting start" } as const;
  })();

  const progressValue =
    (Math.min(durationMs, MAX_DURATION_MS) / MAX_DURATION_MS) * 100;

  const guessedMessage = (() => {
    if (!guessedEntry) {
      return "Select a player and submit your guess.";
    }

    if (submissionStatus === "correct") {
      return "Great job! You identified the player.";
    }

    if (submissionStatus === "incorrect") {
      return "Not quite. Use the revealed details to guide your next guess.";
    }

    return "Submit your guess to check if you're right.";
  })();
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
    updateDuration(MAX_DURATION_MS);
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
    <Stack gap="lg">
      <Card withBorder padding="lg" radius="md">
        <Stack gap="md">
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Text fw={600}>Sharpening progress</Text>
              <Text size="sm" c="dimmed">
                {formatSeconds(Math.min(durationMs, MAX_DURATION_MS))}s /{" "}
                {formatSeconds(MAX_DURATION_MS)}s
              </Text>
            </Group>
            <Progress value={progressValue} aria-label="Sharpening progress" />
          </Stack>
          <Group gap="xs">
            <Badge color={statusBadge.color}>{statusBadge.label}</Badge>
            {showAnswer ? <Badge color="grape">Answer revealed</Badge> : null}
            {isImageClear && !showAnswer ? (
              <Badge color="teal">Picture clear</Badge>
            ) : null}
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {shouldRevealDetails ? (
              <Detail label="Player" value={props.entry.playerName} />
            ) : (
              <Detail label="Player" value="Hidden" />
            )}
            <Detail label="Team" value={props.entry.team} />
            <Detail label="Position" value={props.entry.position} />
            <Detail
              label="Overall rating"
              value={props.entry.overallMaddenRating}
            />
          </SimpleGrid>
          <Stack gap={4}>
            <Text fw={500}>Your guess</Text>
            <Text>{guessedEntry ? guessedEntry.playerName : "None yet"}</Text>
            <Text size="sm" c="dimmed">
              {guessedMessage}
            </Text>
          </Stack>
        </Stack>
      </Card>

      <Card withBorder padding="lg" radius="md">
        <Stack gap="md">
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
          {!imgSrc ? (
            <Text size="sm" c="dimmed">
              Loading player image…
            </Text>
          ) : (
            <Stack gap="md" align="center">
              <img
                onLoad={() => updateImgLoaded(true)}
                alt="Player portrait"
                src={imgSrc}
                style={{
                  width: `${IMG_WIDTH_PX}px`,
                  filter: `blur(${blur}px)`,
                  willChange: "filter",
                  transform: "translateZ(0)",
                }}
                decoding="async"
                loading="lazy"
              />
              {!imgLoaded || isSharpening ? null : (
                <Stack gap="xs" w="100%">
                  <Select
                    label="Your answer"
                    placeholder="Select a player"
                    data={PLAYER_NAME_OPTIONS}
                    searchable
                    value={guess}
                    onChange={setGuess}
                    nothingFoundMessage="No matching players"
                  />
                  <Button
                    fullWidth
                    onClick={handleSubmitGuess}
                    disabled={!guess}
                  >
                    Submit guess
                  </Button>
                </Stack>
              )}
            </Stack>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
