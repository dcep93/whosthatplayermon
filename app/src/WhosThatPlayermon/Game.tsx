import {
  Button,
  Group,
  MultiSelect,
  RangeSlider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useRef, useState, useTransition } from "react";
import { data, type Entry } from "./Data";
import Question from "./Question";

var sessionLoops = 0;

const TEAM_OPTIONS = Array.from(new Set(data.map(({ team }) => team))).sort();
const DIVISION_TEAMS: Record<string, string[]> = {
  "AFC East": [
    "Buffalo Bills",
    "Miami Dolphins",
    "New England Patriots",
    "NY Jets",
  ],
  "AFC North": [
    "Baltimore Ravens",
    "Cincinnati Bengals",
    "Cleveland Browns",
    "Pittsburgh Steelers",
  ],
  "AFC South": [
    "Houston Texans",
    "Indianapolis Colts",
    "Jacksonville Jaguars",
    "Tennessee Titans",
  ],
  "AFC West": [
    "Denver Broncos",
    "Kansas City Chiefs",
    "Las Vegas Raiders",
    "Los Angeles Chargers",
  ],
  "NFC East": [
    "Dallas Cowboys",
    "NY Giants",
    "Philadelphia Eagles",
    "Washington Commanders",
  ],
  "NFC North": [
    "Chicago Bears",
    "Detroit Lions",
    "Green Bay Packers",
    "Minnesota Vikings",
  ],
  "NFC South": [
    "Atlanta Falcons",
    "Carolina Panthers",
    "New Orleans Saints",
    "Tampa Bay Buccaneers",
  ],
  "NFC West": [
    "Arizona Cardinals",
    "Los Angeles Rams",
    "San Francisco 49ers",
    "Seattle Seahawks",
  ],
};
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

const shuffle = (data: Entry[]) => {
  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  const hashKey = `${dateKey}-${sessionLoops}`;

  // Simple string hash (same as your base)
  let hash = 0;
  for (let i = 0; i < hashKey.length; i++) {
    const chr = hashKey.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }

  // Convert to positive seed
  let seed = hash >>> 0;

  // Deterministic pseudo-random number generator (LCG)
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Fisher–Yates shuffle using our deterministic PRNG
  const arr = data.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
};

export default function Game() {
  const [questionKey, setQuestionKey] = useState(0);
  const [entry, _setEntry] = useState<Entry | null>(null);
  const setEntry = (_entry: typeof entry) => {
    _setEntry(_entry);
    setQuestionKey(Date.now());
  };
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [ratingRange, setRatingRange] = useState<[number, number]>([
    MIN_RATING,
    MAX_RATING,
  ]);
  const [sliderRange, setSliderRange] = useState<[number, number]>([
    MIN_RATING,
    MAX_RATING,
  ]);
  const [, startTransition] = useTransition();
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

    if (filteredData.length === 0) {
      setEntry(null);
      return;
    }

    const shuffledData = shuffle(filteredData);

    let nextEntry = shuffledData.find(
      (candidate) => !usedPlayers.has(candidate.playerName)
    );

    if (!nextEntry) {
      usedPlayers.clear();
      sessionLoops++;
      nextEntry = shuffle(filteredData)[0] ?? null;
    }

    setEntry(nextEntry);

    if (nextEntry) {
      usedPlayers.add(nextEntry.playerName);
    }
  };

  const sortTeams = (teams: string[]) =>
    [...teams].sort((teamA, teamB) => teamA.localeCompare(teamB));

  const handleTeamsChange = (teams: string[]) => {
    setSelectedTeams(sortTeams(teams));
  };

  const toggleDivision = (divisionName: string) => {
    const divisionTeams = DIVISION_TEAMS[divisionName] ?? [];

    setSelectedTeams((currentTeams) => {
      const hasEntireDivision = divisionTeams.every((team) =>
        currentTeams.includes(team)
      );

      if (hasEntireDivision) {
        return sortTeams(
          currentTeams.filter((team) => !divisionTeams.includes(team))
        );
      }

      return sortTeams([...new Set([...currentTeams, ...divisionTeams])]);
    });
  };

  const handleRatingChange = (value: [number, number]) => {
    const nextMin = Math.max(MIN_RATING, Math.min(value[0], MAX_RATING));
    const nextMax = Math.max(MIN_RATING, Math.min(value[1], MAX_RATING));
    const nextRange: [number, number] = [
      Math.min(nextMin, nextMax),
      Math.max(nextMin, nextMax),
    ];

    setSliderRange(nextRange);
    startTransition(() => {
      setRatingRange(nextRange);
    });
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
          onChange={handleTeamsChange}
          searchable
          clearable
          nothingFoundMessage="No matching teams"
          checkIconPosition="right"
        />
        <Stack gap="xs">
          <Text fw={500}>Divisions</Text>
          <Group gap="xs">
            {Object.entries(DIVISION_TEAMS).map(([divisionName, teams]) => {
              const isSelected = teams.every((team) =>
                selectedTeams.includes(team)
              );

              return (
                <Button
                  key={divisionName}
                  variant={isSelected ? "filled" : "outline"}
                  onClick={() => toggleDivision(divisionName)}
                  size="xs"
                >
                  {divisionName}
                </Button>
              );
            })}
          </Group>
        </Stack>
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
            value={sliderRange}
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

      {!entry ? null : <Question entry={entry} key={questionKey} />}
    </Group>
  );
}
