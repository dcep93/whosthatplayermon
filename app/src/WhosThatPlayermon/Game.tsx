import {
  Button,
  Group,
  MultiSelect,
  RangeSlider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useRef, useState } from "react";
import { data, type Entry } from "./Data";
import Question from "./Question";

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
  const usedPlayersByFilter = useRef<Map<string, Set<string>>>(new Map());

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
    if (!hasMatches) {
      setEntry(null);
      return;
    }

    const filterKey = JSON.stringify({
      teams: [...selectedTeams].sort(),
      positions: [...selectedPositions].sort(),
      ratingRange,
    });

    let usedPlayers = usedPlayersByFilter.current.get(filterKey);
    if (!usedPlayers) {
      usedPlayers = new Set<string>();
      usedPlayersByFilter.current.set(filterKey, usedPlayers);
    }

    let availablePlayers = filteredData.filter(
      (candidate) => !usedPlayers!.has(candidate.playerName)
    );

    if (availablePlayers.length === 0) {
      usedPlayers.clear();
      availablePlayers = filteredData;
    }

    if (availablePlayers.length === 0) {
      setEntry(null);
      return;
    }

    const index = Math.floor(Math.random() * availablePlayers.length);
    const nextEntry = availablePlayers[index] ?? null;
    setEntry(nextEntry);

    if (nextEntry) {
      usedPlayers.add(nextEntry.playerName);
    }
  };

  const handleRatingChange = (value: [number, number]) => {
    const nextMin = Math.max(MIN_RATING, Math.min(value[0], MAX_RATING));
    const nextMax = Math.max(MIN_RATING, Math.min(value[1], MAX_RATING));
    setRatingRange([Math.min(nextMin, nextMax), Math.max(nextMin, nextMax)]);
  };

  const hasMatches = filteredData.length > 0;

  return (
    <Group gap="lg" p="md" align="flex-start">
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
        <Button disabled={!hasMatches} onClick={handleFetch}>
          Fetch player
        </Button>
      </Stack>

      {!entry ? null : <Question entry={entry} />}
    </Group>
  );
}
