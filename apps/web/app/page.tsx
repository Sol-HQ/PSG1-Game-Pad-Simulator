export default function Home() {
  return (
    <div className="psg1-placeholder">
      <div className="psg1-placeholder__inner">
        <p className="psg1-placeholder__label">PSG1 GamePad Simulator</p>
        <p className="psg1-placeholder__hint">
          Add <code>?gp</code> to the URL to activate the PSG1 simulator.{" "}
          The controller widget will appear in the bottom-right corner.
        </p>
        <p className="psg1-placeholder__hint psg1-placeholder__hint--game">
          <a href="/game?gp" className="psg1-placeholder__link">
            Open the Game Sandbox
          </a>{" "}
          — full app layout with header, tabs, leaderboard, profile, settings,
          and Tic-Tac-Toe. Tests every PSG1 control.
        </p>
        <p className="psg1-placeholder__hint psg1-placeholder__hint--game">
          Or run the standalone example:{" "}
          <code>pnpm --filter @psg1/example-tic-tac-toe dev</code>{" "}
          then open <code>localhost:3001?gp</code>
        </p>
      </div>
    </div>
  );
}
