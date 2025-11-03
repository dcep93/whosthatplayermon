import {
  Button,
  Group,
  MultiSelect,
  RangeSlider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useState } from "react";

import rawData from "./data.json";

type Entry = {
  playerName: string;
  team: string;
  position: string;
  overallMaddenRating: number;
  imgSrc?: string;
};
const data: Entry[] = rawData;

const TEAM_OPTIONS = Array.from(new Set(data.map(({ team }) => team))).sort();
const POSITION_OPTIONS = Array.from(
  new Set(data.map(({ position }) => position))
).sort();
const MIN_RATING = data.length
  ? data.reduce(
      (min, entry) => Math.min(min, entry.overallMaddenRating),
      Number.POSITIVE_INFINITY
    )
  : 0;
const MAX_RATING = data.length
  ? data.reduce(
      (max, entry) => Math.max(max, entry.overallMaddenRating),
      Number.NEGATIVE_INFINITY
    )
  : 100;

export default function Game() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([
    MIN_RATING,
    MAX_RATING,
  ]);

  const filteredData = data.filter((candidate) => {
    const matchesTeam =
      selectedTeams.length === 0 || selectedTeams.includes(candidate.team);
    const matchesPosition =
      selectedPositions.length === 0 ||
      selectedPositions.includes(candidate.position);
    const matchesRating =
      candidate.overallMaddenRating >= ratingRange[0] &&
      candidate.overallMaddenRating <= ratingRange[1];
    return matchesTeam && matchesPosition && matchesRating;
  });

  const handleFetch = () => {
    const index = Math.floor(Math.random() * filteredData.length);
    setEntry(filteredData[index] ?? null);
  };

  const handleRatingChange = (value: [number, number]) => {
    const nextMin = Math.max(MIN_RATING, Math.min(value[0], MAX_RATING));
    const nextMax = Math.max(MIN_RATING, Math.min(value[1], MAX_RATING));
    setRatingRange([Math.min(nextMin, nextMax), Math.max(nextMin, nextMax)]);
  };

  const hasMatches = filteredData.length > 0;

  return (
    <Stack gap="lg" p="md">
      <Stack gap="md">
        <Title order={2}>Filters</Title>
        <MultiSelect
          data={TEAM_OPTIONS}
          label="Teams"
          placeholder="Select teams"
          value={selectedTeams}
          onChange={setSelectedTeams}
          searchable
          clearable
          nothingFoundMessage="No matching teams"
          checkIconPosition="right"
        />
        <MultiSelect
          data={POSITION_OPTIONS}
          label="Positions"
          placeholder="Select positions"
          value={selectedPositions}
          onChange={setSelectedPositions}
          searchable
          clearable
          nothingFoundMessage="No matching positions"
          checkIconPosition="right"
        />
        <Stack gap="xs">
          <Text fw={500}>Rating range</Text>
          <RangeSlider
            aria-label="Player rating range"
            min={MIN_RATING}
            max={MAX_RATING}
            minRange={1}
            value={ratingRange}
            onChange={handleRatingChange}
            label={(value) => value.toString()}
            step={1}
          />
          <Text size="sm" c="dimmed">
            {hasMatches
              ? `${filteredData.length} players`
              : "No players found matching the selected filters."}
          </Text>
        </Stack>
      </Stack>

      <Group gap="md" align="flex-start">
        <Button disabled={!hasMatches} onClick={handleFetch}>
          Fetch player
        </Button>
      </Group>

      {!entry ? null : (
        <Stack gap="sm">
          <pre>{JSON.stringify(entry, null, 2)}</pre>
          {entry.imgSrc ? (
            <img
              alt={entry.playerName}
              src={entry.imgSrc}
              style={{ maxWidth: "300px" }}
            />
          ) : null}
        </Stack>
      )}
    </Stack>
  );
}
