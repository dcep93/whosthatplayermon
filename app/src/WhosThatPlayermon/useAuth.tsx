import { useState } from "react";

export type User = { email: string; oauth_token: string };

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  return [
    user,
    () =>
      setUser(
        user
          ? null
          : { oauth_token: "oauth_token", email: Date.now().toString() }
      ),
  ] as const;
}
