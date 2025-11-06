import { MantineProvider } from "@mantine/core";
import Game from "./Game";
import "./index.css";

export default function WhosThatPlayermon() {
  return (
    <MantineProvider defaultColorScheme="dark">
      <div className="wtp-app-shell">
        <Game />
      </div>
    </MantineProvider>
  );
}
