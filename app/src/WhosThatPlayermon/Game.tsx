import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  MultiSelect,
  RangeSlider,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { data, type Entry } from "./Data";
import Question from "./Question";

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
const POSITION_GROUPS: Record<string, string[]> = {
  Offense: [
    "Quarterback",
    "Halfback",
    "Fullback",
    "Wide Receiver",
    "Tight End",
    "Left Tackle",
    "Left Guard",
    "Center",
    "Right Guard",
    "Right Tackle",
  ],
  Defense: [
    "Left Edge",
    "Right Edge",
    "Defensive Tackle",
    "Mike Backer",
    "Sam Backer",
    "Weak Backer",
    "Cornerback",
    "Free Safety",
    "Strong Safety",
  ],
  "Special Teams": ["Kicker", "Punter", "Long Snapper"],
};
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

const TEAM_POSITION_SEPARATOR = "@@";
const getTeamPositionKey = (entry: Pick<Entry, "team" | "position">) =>
  `${entry.team}${TEAM_POSITION_SEPARATOR}${entry.position}`;

const highestRatingByTeamPosition = new Map<string, number>();
for (const entry of data) {
  const key = getTeamPositionKey(entry);
  const existing = highestRatingByTeamPosition.get(key);
  if (existing === undefined || entry.overallMaddenRating > existing) {
    highestRatingByTeamPosition.set(key, entry.overallMaddenRating);
  }
}

const parseListParam = (value: string | null) =>
  value
    ? value
        .split(/[.,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

const clampRating = (value: number) =>
  Math.max(MIN_RATING, Math.min(value, MAX_RATING));

type FiltersState = {
  teams: string[];
  positions: string[];
  ratingRange: [number, number];
  firstStrings: boolean;
};

const parseFiltersFromQuery = (): FiltersState => {
  if (typeof window === "undefined") {
    return {
      teams: [],
      positions: [],
      ratingRange: [MIN_RATING, MAX_RATING] as [number, number],
      firstStrings: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const teams = parseListParam(params.get("teams"));
  const positions = parseListParam(params.get("positions"));

  const ratingMinParam = Number.parseInt(params.get("ratingMin") ?? "", 10);
  const ratingMaxParam = Number.parseInt(params.get("ratingMax") ?? "", 10);

  const ratingMin = Number.isFinite(ratingMinParam)
    ? clampRating(ratingMinParam)
    : MIN_RATING;
  const ratingMax = Number.isFinite(ratingMaxParam)
    ? clampRating(ratingMaxParam)
    : MAX_RATING;

  const ratingRange: [number, number] = [
    Math.min(ratingMin, ratingMax),
    Math.max(ratingMin, ratingMax),
  ];

  const firstStringsParam = params.get("firstStrings");
  const firstStrings =
    firstStringsParam === "1" || firstStringsParam?.toLowerCase() === "true";

  return { teams, positions, ratingRange, firstStrings };
};

const pad = (value: number) => value.toString().padStart(2, "0");

const formatDayString = (date: Date) => {
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
};

const parseDayString = (value: string): Date | null => {
  const match = /^([0-1]\d)-([0-3]\d)-(\d{4})$/.exec(value);
  if (!match) {
    return null;
  }

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const localDate = new Date(year, month - 1, day);
  const normalized = formatDayString(localDate);
  return normalized === value ? localDate : null;
};

const getInitialDay = () => {
  if (typeof window === "undefined") {
    return formatDayString(new Date());
  }

  const params = new URLSearchParams(window.location.search);
  const dayParam = params.get("day");
  if (dayParam) {
    const parsed = parseDayString(dayParam);
    if (parsed) {
      return formatDayString(parsed);
    }
  }

  return formatDayString(new Date());
};

const getInitialQuestionIndex = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  const params = new URLSearchParams(window.location.search);
  const questionParam = Number.parseInt(params.get("question") ?? "", 10);
  if (!Number.isFinite(questionParam)) {
    return 0;
  }

  return Math.max(0, questionParam - 1);
};

const hashString = (value: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
    hash >>>= 0;
  }

  return hash;
};

const createRandom = (seed: number) => {
  let state = seed || 1;

  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const dailyOrderCache = new Map<string, Entry[]>();

const getDailyOrder = (day: string) => {
  const cached = dailyOrderCache.get(day);
  if (cached) {
    return cached;
  }

  const seed = hashString(day);
  const random = createRandom(seed);
  const arr = data.slice();

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  dailyOrderCache.set(day, arr);
  return arr;
};

export default function Game() {
  const initialFilters = useMemo(() => parseFiltersFromQuery(), []);
  const initialDay = useMemo(() => getInitialDay(), []);
  const initialQuestionIndex = useMemo(() => getInitialQuestionIndex(), []);
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    initialFilters.teams
  );
  const [selectedPositions, setSelectedPositions] = useState<string[]>(
    initialFilters.positions
  );
  const [ratingRange, setRatingRange] = useState<[number, number]>(
    initialFilters.ratingRange
  );
  const [sliderRange, setSliderRange] = useState<[number, number]>(
    initialFilters.ratingRange
  );
  const [isFirstStrings, setIsFirstStrings] = useState(initialFilters.firstStrings);
  const [, startTransition] = useTransition();
  const [currentDay, setCurrentDay] = useState(initialDay);
  const [dayInput, setDayInput] = useState(initialDay);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    initialQuestionIndex
  );
  const previousFiltersRef = useRef({
    teams: initialFilters.teams,
    positions: initialFilters.positions,
    ratingRange: initialFilters.ratingRange,
    firstStrings: initialFilters.firstStrings,
  });

  const dailyOrder = useMemo(() => getDailyOrder(currentDay), [currentDay]);

  const filteredData = useMemo(() => {
    return dailyOrder.filter((candidate) => {
      const matchesTeam =
        selectedTeams.length === 0 || selectedTeams.includes(candidate.team);
      const matchesPosition =
        selectedPositions.length === 0 ||
        selectedPositions.includes(candidate.position);
      const matchesRating =
        candidate.overallMaddenRating >= ratingRange[0] &&
        candidate.overallMaddenRating <= ratingRange[1];
      const highestRating = highestRatingByTeamPosition.get(
        getTeamPositionKey(candidate)
      );
      const matchesFirstStrings =
        !isFirstStrings ||
        (highestRating !== undefined &&
          candidate.overallMaddenRating === highestRating);

      return (
        matchesTeam && matchesPosition && matchesRating && matchesFirstStrings
      );
    });
  }, [
    dailyOrder,
    isFirstStrings,
    ratingRange,
    selectedPositions,
    selectedTeams,
  ]);

  const hasMatches = filteredData.length > 0;
  const currentEntry = filteredData[currentQuestionIndex] ?? null;

  useEffect(() => {
    if (!hasMatches) {
      if (currentQuestionIndex !== 0) {
        setCurrentQuestionIndex(0);
      }
      return;
    }

    if (currentQuestionIndex >= filteredData.length) {
      setCurrentQuestionIndex(filteredData.length - 1);
    }
  }, [currentQuestionIndex, filteredData, hasMatches]);

  useEffect(() => {
    const previousFilters = previousFiltersRef.current;

    if (
      previousFilters.teams !== selectedTeams ||
      previousFilters.positions !== selectedPositions ||
      previousFilters.ratingRange !== ratingRange ||
      previousFilters.firstStrings !== isFirstStrings
    ) {
      previousFiltersRef.current = {
        teams: selectedTeams,
        positions: selectedPositions,
        ratingRange,
        firstStrings: isFirstStrings,
      };
      setCurrentQuestionIndex(0);
    }
  }, [isFirstStrings, ratingRange, selectedPositions, selectedTeams]);

  const changeDay = (nextDay: string) => {
    setCurrentDay(nextDay);
    setDayInput(nextDay);
    setCurrentQuestionIndex(0);
  };

  const shiftDay = (delta: number) => {
    const parsed = parseDayString(currentDay);
    if (!parsed) {
      return;
    }

    const shifted = new Date(parsed.getTime());
    shifted.setUTCDate(shifted.getUTCDate() + delta);
    changeDay(formatDayString(shifted));
  };

  const applyDayInput = () => {
    const parsed = parseDayString(dayInput);
    if (parsed) {
      changeDay(formatDayString(parsed));
    } else {
      setDayInput(currentDay);
    }
  };

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((index) => Math.max(0, index - 1));
  };

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((index) =>
      Math.min(filteredData.length - 1, index + 1)
    );
  };

  const canGoNext =
    hasMatches && currentQuestionIndex < filteredData.length - 1;
  const canGoPrevious = hasMatches && currentQuestionIndex > 0;

  const sortTeams = (teams: string[]) =>
    [...teams].sort((teamA, teamB) => teamA.localeCompare(teamB));
  const sortPositions = (positions: string[]) =>
    [...positions].sort((positionA, positionB) =>
      positionA.localeCompare(positionB)
    );

  const handleTeamsChange = (teams: string[]) => {
    setSelectedTeams(sortTeams(teams));
  };

  const handlePositionsChange = (positions: string[]) => {
    setSelectedPositions(sortPositions(positions));
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

  const togglePositionGroup = (groupName: string) => {
    const groupPositions = POSITION_GROUPS[groupName] ?? [];

    setSelectedPositions((currentPositions) => {
      const hasEntireGroup = groupPositions.every((position) =>
        currentPositions.includes(position)
      );

      if (hasEntireGroup) {
        return sortPositions(
          currentPositions.filter((position) =>
            !groupPositions.includes(position)
          )
        );
      }

      return sortPositions([
        ...new Set([...currentPositions, ...groupPositions]),
      ]);
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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (selectedTeams.length > 0) {
      params.set("teams", selectedTeams.join("."));
    } else {
      params.delete("teams");
    }

    if (selectedPositions.length > 0) {
      params.set("positions", selectedPositions.join("."));
    } else {
      params.delete("positions");
    }

    if (ratingRange[0] !== MIN_RATING) {
      params.set("ratingMin", ratingRange[0].toString());
    } else {
      params.delete("ratingMin");
    }

    if (ratingRange[1] !== MAX_RATING) {
      params.set("ratingMax", ratingRange[1].toString());
    } else {
      params.delete("ratingMax");
    }

    if (isFirstStrings) {
      params.set("firstStrings", "1");
    } else {
      params.delete("firstStrings");
    }

    const today = formatDayString(new Date());
    if (currentDay !== today) {
      params.set("day", currentDay);
    } else {
      params.delete("day");
    }

    if (hasMatches && currentQuestionIndex > 0) {
      params.set("question", (currentQuestionIndex + 1).toString());
    } else {
      params.delete("question");
    }

    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${
      nextSearch ? `?${nextSearch}` : ""
    }${window.location.hash}`;
    window.history.replaceState(null, "", nextUrl);
  }, [
    currentDay,
    currentQuestionIndex,
    hasMatches,
    isFirstStrings,
    ratingRange,
    selectedPositions,
    selectedTeams,
  ]);

  return (
    <Stack gap="lg" p="md">
      <Stack gap="md">
        <Group gap="xs" align="center">
          <ActionIcon
            variant="default"
            aria-label="Previous question"
            disabled={!canGoPrevious}
            onClick={handlePreviousQuestion}
          >
            ←
          </ActionIcon>
          <Text size="sm">
            {hasMatches
              ? `${currentQuestionIndex + 1} / ${filteredData.length}`
              : "No available questions for the selected filters."}
          </Text>
          <ActionIcon
            variant="default"
            aria-label="Next question"
            disabled={!canGoNext}
            onClick={handleNextQuestion}
          >
            →
          </ActionIcon>
        </Group>

        {!currentEntry ? null : (
          <Question
            entry={currentEntry}
            key={`${currentDay}-${currentQuestionIndex}-${currentEntry.playerName}`}
          />
        )}
      </Stack>

      <Stack gap="md">
        <Stack gap="xs">
          <Text fw={500}>Day</Text>
          <Group gap="xs" align="center">
            <ActionIcon
              variant="default"
              aria-label="Previous day"
              onClick={() => shiftDay(-1)}
            >
              ←
            </ActionIcon>
            <TextInput
              value={dayInput}
              onChange={(event) => setDayInput(event.currentTarget.value)}
              onBlur={applyDayInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyDayInput();
                }
              }}
              size="sm"
              aria-label="Day (MM-DD-YYYY)"
              w={140}
              placeholder="MM-DD-YYYY"
            />
            <ActionIcon
              variant="default"
              aria-label="Next day"
              onClick={() => shiftDay(1)}
            >
              →
            </ActionIcon>
          </Group>
        </Stack>
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
          onChange={handlePositionsChange}
          searchable
          clearable
          nothingFoundMessage="No matching positions"
          checkIconPosition="right"
        />
        <Stack gap="xs">
          <Text fw={500}>Position groups</Text>
          <Group gap="xs">
            {Object.entries(POSITION_GROUPS).map(([groupName, positions]) => {
              const isSelected = positions.every((position) =>
                selectedPositions.includes(position)
              );

              return (
                <Button
                  key={groupName}
                  variant={isSelected ? "filled" : "outline"}
                  onClick={() => togglePositionGroup(groupName)}
                  size="xs"
                >
                  {groupName}
                </Button>
              );
            })}
          </Group>
        </Stack>
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
            {sliderRange[0]} - {sliderRange[1]}
          </Text>
          {!hasMatches ? (
            <Text size="sm" c="dimmed">
              No players found matching the selected filters.
            </Text>
          ) : null}
        </Stack>
        <Checkbox
          label="Only show first-string players"
          description="Limit results to the highest-rated player for each team and position."
          checked={isFirstStrings}
          onChange={(event) => setIsFirstStrings(event.currentTarget.checked)}
        />
      </Stack>
    </Stack>
  );
}
