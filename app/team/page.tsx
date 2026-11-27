"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Live, Team, quizPoints, rpcError, useLive, useNow, visibleScores } from "@/lib/live";
import { OPTION_COLORS, OPTION_SHAPES, Scene, sceneById } from "@/lib/content";

type Auth = { team: number; pin: string };
const KEY = "bml-refresher-team";

export default function TeamPage() {
  const live = useLive();
  const [auth, setAuth] = useState<Auth | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s) setAuth(JSON.parse(s));
    } catch {}
    setLoaded(true);
  }, []);
  if (!loaded || !live.ready) return <main className="app" />;
  const team = auth ? live.teams.find((t) => t.id === auth.team) : undefined;
  if (!auth || !team)
    return (
      <main className="app">
        <Login
          teams={live.teams}
          onDone={(a) => {
            try {
              localStorage.setItem(KEY, JSON.stringify(a));
            } catch {}
            setAuth(a);
          }}
        />
      </main>
    );
  return (
    <main className="app">
      <TeamApp
        live={live}
        team={team}
        auth={auth}
        onLogout={() => {
          try {
            localStorage.removeItem(KEY);
          } catch {}
          setAuth(null);
        }}
      />
    </main>
  );
}

function Login({ teams, onDone }: { teams: Team[]; onDone: (a: Auth) => void }) {
  const [team, setTeam] = useState<number | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!team) return;
    setBusy(true);
    setErr("");
    const { data, error } = await supabase.rpc("refresher_is_team", { p_team: team, p_pin: pin.trim() });
    setBusy(false);
    if (error) return setErr(error.message);
    if (!data) return setErr("That PIN doesn’t match this team.");
    onDone({ team, pin: pin.trim() });
  };
  return (
    <div className="login">
      <div className="kicker" style={{ fontSize: 13 }}>
        Team leader
      </div>
      <h1>Join your team</h1>
      <p className="dim">Pick your team, then enter the PIN from the trainer.</p>
      <div className="team-pick">
        {teams.map((t) => (
          <button key={t.id} className={team === t.id ? "on" : ""} style={{ ["--c" as any]: t.color }} onClick={() => setTeam(t.id)}>
            <span className="em">{t.emoji}</span>
            <span>
              <b>{t.name}</b>
              <br />
              <small className="dim">{t.leader || "Leader"}</small>
            </span>
          </button>
        ))}
      </div>
      <input className="input" inputMode="numeric" placeholder="Team PIN" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      {err && <p style={{ color: "#ff8fa3" }}>{err}</p>}
      <button className="btn primary" style={{ width: "100%", marginTop: 12, padding: 16 }} disabled={!team || !pin || busy} onClick={go}>
        {busy ? "Checking…" : "Join"}
      </button>
    </div>
  );
}

function TeamApp({ live, team, auth, onLogout }: { live: Live; team: Team; auth: Auth; onLogout: () => void }) {
  const scene = sceneById(live.state.scene);
  const sc = visibleScores(live);
  const rank = sc.findIndex((x) => x.team.id === team.id);
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <div className="team-app" style={{ ["--c" as any]: team.color }}>
      <div className="t-head">
        <span className="em">{team.emoji}</span>
        <div>
          <b>{team.name}</b>
          <small>
            {team.leader || "Team leader"} ·{" "}
            <a onClick={onLogout} style={{ cursor: "pointer", textDecoration: "underline" }}>
              switch
            </a>
          </small>
        </div>
        <div className="t-score">
          <small className="dim">#{rank + 1}</small> <b>{sc[rank]?.score ?? 0}</b>
          <small className="dim"> pts</small>
        </div>
      </div>
      <div className="t-body" key={scene.id}>
        <Body live={live} scene={scene} team={team} auth={auth} toast={setToast} />
      </div>
      <div style={{ textAlign: "center", fontSize: 12 }} className="dim">
        <span className={"dot " + (live.connected ? "on" : "")} style={{ width: 8, height: 8, marginRight: 6 }} />
        {live.connected ? "Live" : "Reconnecting…"}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Body({ live, scene, team, auth, toast }: { live: Live; scene: Scene; team: Team; auth: Auth; toast: (s: string) => void }) {
  const phase = live.state.phase;
  if (scene.type === "wordcloud") return <CloudInput live={live} scene={scene} team={team} auth={auth} toast={toast} />;
  if (scene.type === "quiz") return <QuizInput live={live} scene={scene} team={team} auth={auth} toast={toast} />;
  if (scene.type === "scenario") return <ScenarioInput live={live} scene={scene} team={team} auth={auth} toast={toast} />;
  const sc = visibleScores(live);
  return (
    <div className="t-wait">
      <div className="big">{scene.type === "leaderboard" ? "🏆" : scene.type === "splitpay" ? "🧮" : scene.type === "thanks" ? "🎉" : "👀"}</div>
      <h2>{scene.type === "leaderboard" ? "Check the leaderboard!" : "Eyes on the screen"}</h2>
      <p>{"title" in scene ? (scene as any).title : scene.label}</p>
      <p style={{ fontSize: 13 }}>Discuss with your team. The next activity will pop up here automatically.</p>
      <div className="mini-board">
        {sc.map((x, i) => (
          <div key={x.team.id} className={x.team.id === team.id ? "me" : ""}>
            <b>{i + 1}</b> {x.team.emoji} {x.team.name} <b>{x.score}</b>
          </div>
        ))}
      </div>
      {phase && null}
    </div>
  );
}

type P<T extends Scene["type"]> = { live: Live; scene: Extract<Scene, { type: T }>; team: Team; auth: Auth; toast: (s: string) => void };

function CloudInput({ live, scene, team, auth, toast }: P<"wordcloud">) {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const open = live.state.phase === "open";
  const mine = live.responses.filter((r) => r.activity === scene.id && r.team_id === team.id);
  const send = async () => {
    const value = v.trim();
    if (!value) return;
    setBusy(true);
    const { error } = await supabase.rpc("refresher_submit_text", { p_team: auth.team, p_pin: auth.pin, p_activity: scene.id, p_value: value.slice(0, 40), p_replace: false });
    setBusy(false);
    if (error) return toast(rpcError(error));
    setV("");
    toast("Sent to the screen ✨");
    live.refresh();
  };
  const del = async (id: number) => {
    await supabase.rpc("refresher_delete_own", { p_team: auth.team, p_pin: auth.pin, p_id: id });
    live.refresh();
  };
  return (
    <>
      <div className="t-kicker">Word cloud · {open ? "open" : "closed"}</div>
      <div className="t-title">{scene.prompt}</div>
      <p className="dim" style={{ marginTop: 0 }}>
        {scene.hint}
      </p>
      <div className="row">
        <input className="input" maxLength={40} placeholder={open ? "A word or short phrase" : "Waiting for the trainer to open…"} disabled={!open} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="btn primary" disabled={!open || busy || !v.trim()} onClick={send}>
          Send
        </button>
      </div>
      <div className="dim" style={{ fontSize: 13, marginTop: 8 }}>
        {mine.length}/15 sent
      </div>
      <div className="chips">
        {mine.map((r) => (
          <span key={r.id} className="chip">
            {r.value}
            {open && <button onClick={() => del(r.id)}>✕</button>}
          </span>
        ))}
      </div>
    </>
  );
}

function QuizInput({ live, scene, team, auth, toast }: P<"quiz">) {
  const phase = live.state.phase;
  const now = useNow(live.offset, 100);
  const limit = Number(live.state.data.limit || scene.limit);
  const opened = live.state.opened_at ? new Date(live.state.opened_at).getTime() : now;
  const left = phase === "open" ? Math.max(0, limit - (now - opened) / 1000) : 0;
  const mine = live.answers.find((a) => a.activity === scene.id && a.team_id === team.id);
  const [pending, setPending] = useState<number | null>(null);
  const pick = async (i: number) => {
    if (mine || pending !== null || phase !== "open") return;
    setPending(i);
    const { error } = await supabase.rpc("refresher_submit_choice", { p_team: auth.team, p_pin: auth.pin, p_activity: scene.id, p_choice: i });
    if (error) {
      setPending(null);
      return toast(rpcError(error));
    }
    if (navigator.vibrate) navigator.vibrate(60);
    live.refresh();
  };
  const chosen = mine?.choice ?? pending;

  if (phase === "revealed") {
    const pts = quizPoints(scene.id, mine);
    return (
      <>
        <div className="t-kicker">{scene.kicker}</div>
        <div className="t-title">{scene.question}</div>
        <div className={"t-result " + (pts ? "ok" : "no")}>
          <div className="big">{pts ? "🎉" : mine ? "😬" : "⌛"}</div>
          <h2>{pts ? `+${pts} points!` : mine ? "Not this time" : "No answer"}</h2>
          <p>
            Answer: <b>{scene.options[scene.answer]}</b>
          </p>
          <p className="dim">{scene.explain}</p>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="t-kicker">
        {scene.kicker} · {scene.points} pts
      </div>
      <div className="t-title">{scene.question}</div>
      {phase === "open" && (
        <div className="t-bar">
          <i style={{ width: `${(left / limit) * 100}%` }} />
        </div>
      )}
      {phase === "idle" && <p className="dim">Get ready… discuss with your team. Buttons unlock when the timer starts.</p>}
      {phase === "locked" && !mine && <p style={{ color: "#ffb36b" }}>Time’s up. Wait for the reveal.</p>}
      {chosen !== null && chosen !== undefined && <p style={{ color: "#7dffad" }}>🔒 Locked in{mine ? ` (${(mine.elapsed_ms / 1000).toFixed(1)}s)` : "…"}. Watch the screen!</p>}
      <div className="t-opts">
        {scene.options.map((o, i) => (
          <button
            key={i}
            className={"t-opt " + (chosen === i ? "picked" : chosen != null ? "faded" : "")}
            style={{ ["--c" as any]: OPTION_COLORS[i], opacity: phase !== "open" && chosen == null ? 0.5 : undefined }}
            disabled={phase !== "open" || chosen != null}
            onClick={() => pick(i)}
          >
            <span className="shape">{OPTION_SHAPES[i]}</span> {o}
          </button>
        ))}
      </div>
    </>
  );
}

function ScenarioInput({ live, scene, team, auth, toast }: P<"scenario">) {
  const mine = live.responses.filter((r) => r.activity === scene.id && r.team_id === team.id).slice(-1)[0];
  const [v, setV] = useState(mine?.value || "");
  const [busy, setBusy] = useState(false);
  const open = live.state.phase === "open";
  const send = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("refresher_submit_text", { p_team: auth.team, p_pin: auth.pin, p_activity: scene.id, p_value: v.trim(), p_replace: true });
    setBusy(false);
    if (error) return toast(rpcError(error));
    toast("Team answer submitted ✅");
    live.refresh();
  };
  const award = live.bonus.filter((b) => b.team_id === team.id && b.reason === scene.id).reduce((a, b) => a + b.points, 0);
  return (
    <>
      <div className="t-kicker">{scene.kicker}</div>
      <div className="t-title">{scene.title}</div>
      <p style={{ marginTop: 0, lineHeight: 1.45 }}>{scene.prompt}</p>
      <div className="chips" style={{ marginTop: 0, marginBottom: 12 }}>
        {scene.tips.map((t) => (
          <span key={t} className="chip">
            {t}
          </span>
        ))}
      </div>
      <textarea className="input" rows={6} maxLength={600} disabled={!open} placeholder={open ? "Agree on your team’s answer and type it here" : "Waiting for the trainer to open…"} value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn primary" style={{ marginTop: 10, padding: 14 }} disabled={!open || busy || !v.trim()} onClick={send}>
        {mine ? "Update answer" : "Submit answer"}
      </button>
      {mine && <p style={{ color: "#7dffad" }}>✓ Submitted. You can still edit until the trainer closes it.</p>}
      {award > 0 && <div className="t-result ok">🏅 Trainer awarded +{award} points!</div>}
    </>
  );
}
