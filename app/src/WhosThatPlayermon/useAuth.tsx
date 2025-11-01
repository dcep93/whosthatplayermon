import { useState } from "react";

export type User = { email: string; key: string };

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  return [
    user,
    () => setUser(user ? null : { key: "key", email: Date.now().toString() }),
  ] as const;
}
