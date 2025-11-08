import rawData from "./data.json";

export type Entry = {
  playerName: string;
  team: string;
  position: string;
  overallMaddenRating: number;
  jerseyNum: number;
};
export const data: Entry[] = rawData;
