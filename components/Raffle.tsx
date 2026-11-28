"use client";
import { useMemo } from "react";
import type { Live, RaffleEntry } from "@/lib/live";
import { useNow } from "@/lib/live";

export type RaffleState = { phase?: "spin"; started_at?: string; duration?: number; winner_id?: number; draw_no?: number; seed?: number };

export function raffleState(live: Live): RaffleState {
  try {
    return JSON.parse(live.settings.raffle || "{}");
  } catch {
    return {};
  }
}

export function maskPhone(p: string, mask: boolean) {
  if (!mask) return p;
  const d = p.replace(/[^0-9]/g, "");
  if (d.length < 6) return p;
  return d.slice(0, 3) + "•".repeat(Math.max(2, d.length - 5)) + d.slice(-2);
}

function hash(n: number) {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) >>> 0;
}

const STEPS = 75;

// Which entry is lit at time t: fast at first, slowing down (ease-out), landing on the winner.
export function litEntry(pool: RaffleEntry[], st: RaffleState, elapsed: number) {
  if (!pool.length || !st.duration) return null;
  const D = st.duration;
  if (elapsed >= D) return st.winner_id ?? null;
  const p = 1 - Math.pow(1 - Math.max(0, elapsed) / D, 3);
  const k = Math.min(STEPS - 1, Math.floor(p * STEPS));
  if (k >= STEPS - 1) return st.winner_id ?? null;
  const pick = pool[hash((st.seed || 1) * 1000 + k) % pool.length];
  // avoid lighting the winner too early (keeps the suspense)
  if (pick.id === st.winner_id && pool.length > 1) return pool[(pool.indexOf(pick) + 1) % pool.length].id;
  return pick.id;
}

export default function RaffleScreen({ live }: { live: Live }) {
  const st = raffleState(live);
  const spinning = st.phase === "spin";
  const now = useNow(live.offset, spinning ? 40 : 1000);
  const elapsed = spinning && st.started_at ? now - new Date(st.started_at).getTime() : 0;
  const done = spinning && elapsed >= (st.duration || 0);
  const mask = live.settings.raffle_mask === "1";

  const entries = live.raffle;
  // numbers eligible in this draw: never won, or the winner of the current draw
  const pool = useMemo(() => entries.filter((e) => !e.won_at || e.id === st.winner_id), [entries, st.winner_id]);
  const lit = spinning && !done ? litEntry(pool, st, elapsed) : null;
  const winner = done ? entries.find((e) => e.id === st.winner_id) : null;
  const pastWinners = entries.filter((e) => e.won_at && !(spinning && e.id === st.winner_id && !done)).sort((a, b) => (a.draw_no || 0) - (b.draw_no || 0));

  const n = entries.length;
  const scale = Math.max(0.5, Math.min(1.25, 1.45 - n / 130));
  const left = spinning && !done ? Math.max(0, Math.ceil(((st.duration || 0) - elapsed) / 1000)) : 0;

  return (
    <div className={"raffle " + (spinning && !done ? "spinning" : "") + (done ? " done" : "")}>
      <div className="rf-head">
        <div>
          <div className="kicker">SME raffle draw</div>
          <h2 className="h2" style={{ fontSize: 60, margin: "6px 0 0" }}>
            {spinning && !done ? "Drawing…" : done ? `Draw #${st.draw_no} winner` : "Who will be our lucky winner?"}
          </h2>
        </div>
        <div className="rf-count">
          <b>{pool.length}</b>
          <small>{n !== pool.length ? `in the draw · ${n} entries` : "entries"}</small>
        </div>
      </div>

      <div className="rf-cloud">
        {entries.map((e) => {
          const won = !!e.won_at && !(spinning && e.id === st.winner_id);
          const size = Math.round((26 + (hash(e.id) % 34)) * scale);
          return (
            <span
              key={e.id}
              className={"rf-num " + (lit === e.id ? "lit" : "") + (won ? " won" : "")}
              style={{ fontSize: size, ["--h" as any]: (hash(e.id * 7) % 360) + "deg", animationDelay: `${(hash(e.id) % 30) / 10}s` }}
            >
              {maskPhone(e.phone, mask)}
            </span>
          );
        })}
        {n === 0 && <div className="cloud-empty" style={{ position: "static" }}>Waiting for entries…</div>}
      </div>

      {spinning && !done && <div className="rf-timer">{left}</div>}

      {winner && (
        <div className="rf-win">
          <div className="confetti">
            {Array.from({ length: 60 }).map((_, i) => (
              <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 12) * 0.25}s`, background: ["#FF5A5F", "#FFD166", "#00B8D9", "#22C55E", "#B9A6FF"][i % 5] }} />
            ))}
          </div>
          <div className="rf-win-card">
            <div className="rf-trophy">🏆</div>
            <small>Congratulations!</small>
            <div className="rf-win-name">{winner.name}</div>
            <div className="rf-win-phone">{maskPhone(winner.phone, mask)}</div>
          </div>
        </div>
      )}

      {pastWinners.length > 0 && !winner && (
        <div className="rf-past">
          🏆 Winners:
          {pastWinners.map((w) => (
            <span key={w.id}>
              #{w.draw_no} {w.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
