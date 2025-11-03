import { MantineProvider } from "@mantine/core";
import Game from "./Game";

export default function WhosThatPlayermon() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <div style={{ height: "100vh" }}>
        <Game />
      </div>
    </MantineProvider>
  );
}
