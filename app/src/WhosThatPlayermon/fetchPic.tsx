import type { User } from "./useAuth";

export type PicData = {
  answer: string;
  src: string;
};

export default function fetchPic(user: User): Promise<PicData> {
  return Promise.resolve({ answer: "answer", src: "src" });
}
