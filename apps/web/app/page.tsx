export default function Home() {
  return (
    <div className="psg1-placeholder">
      <div className="psg1-placeholder__inner">
        <p className="psg1-placeholder__label">Your game renders here</p>
        <p className="psg1-placeholder__hint">
          Add <code>?gp</code> to the URL to activate the PSG1 simulator.{" "}
          The controller widget will appear in the bottom-right corner.
        </p>
      </div>
    </div>
  );
}
