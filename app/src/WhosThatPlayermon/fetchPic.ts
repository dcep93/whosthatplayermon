import type { Entry } from "./Data";

type GuardianFields = {
  thumbnail?: string;
  trailText?: string;
};

type GuardianResult = {
  webTitle?: string;
  webPublicationDate?: string;
  fields?: GuardianFields;
};

type GuardianResponse = {
  response?: {
    results?: GuardianResult[];
  };
};

type Candidate = {
  url: string;
  score: number;
  published?: number;
};

const GUARDIAN_ENDPOINT = "https://content.guardianapis.com/search";
const GUARDIAN_API_KEY = "test"; // public test key documented by The Guardian
const DEFAULT_PARAMS: Record<string, string> = {
  section: "sport",
  "api-key": GUARDIAN_API_KEY,
  "show-fields": "thumbnail,trailText",
  "order-by": "relevance",
  "page-size": "12",
};

export const FALLBACK_IMAGE_SRC = "/silhouette-icon.svg";

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, " ");

const normalize = (value: string) => value.toLowerCase();

const buildSearchText = (result: GuardianResult) =>
  [result.webTitle, result.fields?.trailText]
    .filter((part): part is string => Boolean(part))
    .map(stripHtml)
    .map(normalize)
    .join(" ");

const enlargeGuardianThumbnail = (url: string) =>
  /\/\d+\.jpg$/i.test(url) ? url.replace(/\/\d+\.jpg$/i, "/1000.jpg") : url;

const createCandidate = (result: GuardianResult, entry: Entry): Candidate | null => {
  const thumbnail = result.fields?.thumbnail;
  if (!thumbnail) return null;

  const text = buildSearchText(result);
  const tokens = normalize(entry.playerName).split(/\s+/).filter(Boolean);
  const firstName = tokens[0];
  const lastName = tokens.at(-1);
  const teamTokens = normalize(entry.team)
    .split(/\s+/)
    .filter((word) => word.length > 2 && word !== "football" && word !== "team");

  let score = 0;
  if (text.includes("nfl")) score += 0.5;
  if (lastName && text.includes(lastName)) score += 4;
  if (firstName && text.includes(firstName)) score += 1;
  for (const token of teamTokens) {
    if (text.includes(token)) score += 0.75;
  }

  const published = result.webPublicationDate
    ? Date.parse(result.webPublicationDate)
    : undefined;

  return {
    url: enlargeGuardianThumbnail(thumbnail),
    score,
    published: Number.isNaN(published) ? undefined : published,
  };
};

const sortCandidates = (a: Candidate, b: Candidate) => {
  if (b.score !== a.score) return b.score - a.score;
  return (b.published ?? 0) - (a.published ?? 0);
};

const fetchGuardianImage = async (entry: Entry, query: string) => {
  const params = new URLSearchParams(DEFAULT_PARAMS);
  params.set("q", query);

  const response = await fetch(`${GUARDIAN_ENDPOINT}?${params.toString()}`);
  if (!response.ok) throw new Error(`HTTP error ${response.status}`);

  const json = (await response.json()) as GuardianResponse;
  const results = json.response?.results ?? [];

  const candidates = results
    .map((result) => createCandidate(result, entry))
    .filter((candidate): candidate is Candidate => Boolean(candidate));

  if (candidates.length === 0) return null;

  candidates.sort(sortCandidates);
  return candidates[0]?.url ?? null;
};

export default async function fetchPic(entry: Entry) {
  const queries = [
    `${entry.playerName} ${entry.team} nfl`,
    `${entry.playerName} ${entry.team}`,
    `${entry.playerName} nfl`,
    entry.playerName,
  ];

  for (const query of queries) {
    try {
      const image = await fetchGuardianImage(entry, query);
      if (image) return image;
    } catch (error) {
      console.error("Guardian API request failed", error);
    }
  }

  return FALLBACK_IMAGE_SRC;
}
