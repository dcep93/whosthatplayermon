import Game from "./Game";
import useAuth from "./useAuth";

export default function WhosThatPlayermon() {
  const [user, action] = useAuth();
  return (
    <div style={{ height: "100vH", width: "100vW", fontFamily: "monospace" }}>
      <div>WhosThatPlayermon x</div>
      {user ? (
        <div>
          <button onClick={action}>LOG OUT</button>
          <Game user={user} />
        </div>
      ) : (
        <div>
          <button onClick={action}>LOG IN</button>
        </div>
      )}
    </div>
  );
}
