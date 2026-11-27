import Link from "next/link";

export default function Home() {
  return (
    <main className="app">
      <div className="landing">
        <div className="kicker" style={{ fontSize: 14 }}>Bank of Maldives</div>
        <h1>
          BML <span className="grad">Refresher</span>
        </h1>
        <p>One app for the whole programme. Team leaders submit, the trainer drives, the big screen comes alive.</p>
        <div className="roles">
          <Link href="/team" className="glass role">
            <div className="ic">📱</div>
            <h2>Team Leader</h2>
            <p className="dim">Join your team, discuss, and submit answers live.</p>
          </Link>
          <Link href="/trainer" className="glass role">
            <div className="ic">🎛️</div>
            <h2>Trainer</h2>
            <p className="dim">Run the agenda, open activities, reveal answers, award points.</p>
          </Link>
          <Link href="/screen" className="glass role">
            <div className="ic">🖥️</div>
            <h2>Screen</h2>
            <p className="dim">Open on the projector. Press F for full screen.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
