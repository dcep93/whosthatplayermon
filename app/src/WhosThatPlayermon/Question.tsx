import { Stack } from "@mantine/core";
import type { Entry } from "./Game";

export default function Question(props: { entry: Entry }) {
  return (
    <Stack gap="sm">
      <pre>
        {JSON.stringify({ ...props.entry, imgSrc: undefined }, null, 2)}
      </pre>
      {props.entry.imgSrc ? (
        <img
          alt={props.entry.playerName}
          src={props.entry.imgSrc}
          style={{ maxWidth: "300px" }}
        />
      ) : null}
    </Stack>
  );
}
