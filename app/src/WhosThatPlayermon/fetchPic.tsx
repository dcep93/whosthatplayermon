import type { User } from "./useAuth";

export type PicData = {
  answer: string;
  src: string;
};

export default async function fetchPic(user: User): Promise<PicData> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.oauth_token}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a search assistant that finds real, published sports photos.",
        },
        {
          role: "user",
          content: `
Find a published action shot of a random football player during the 2025 season.
Return a JSON object: { "answer": "<player name>", "src": "<image url>" }.
Make sure the URL points to a real published image (not generated).`,
        },
      ],
      temperature: 0.8,
    }),
  });

  const data = await resp.json();

  const content = data.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("Model did not return valid JSON: " + content);
  }
}
