import type { User } from "./useAuth";

export type PicData = {
  answer: string;
  src: string;
};

export default function fetchPic(user: User): Promise<PicData> {
  return fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.oauth_token}`,
    },
    body: JSON.stringify({
      prompt:
        "Find a published action shot of a random football player during the 2025 season. This will be used for a quiz, so if their name is visible on their jersey, blur it out. I need to know the player's name too.",
      size: "512x512",
    }),
  }).then((resp) => resp.json());
}
