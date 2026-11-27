"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Live, quizPoints, rpcError, useLive, useNow, visibleScores } from "@/lib/live";
import { OPTION_COLORS, SCENES, SECTIONS, Scene, sceneById, Phase } from "@/lib/content";
import SceneView, { AMS_LADDER, Stage, splitCalc } from "@/components/SceneView";

const KEY = "bml-refresher-trainer";
const ICON: Record<string, string> = { welcome: "👋", attendance: "📝", title: "🎬", holding: "🎤", wordcloud: "☁️", wordwall: "🧱", agenda: "🗓", cards: "🃏", steps: "➡️", countdown: "⏳", facts: "🔢", slides: "🖼", quiz: "❓", scenario: "💬", splitpay: "🧮", ams: "📈", leaderboard: "🏆", lineup: "👥", thanks: "🎉" };

export default function TrainerPage() {
  const [pin, setPin] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      setPin(localStorage.getItem(KEY));
    } catch {}
    setLoaded(true);
  }, []);
  if (!loaded) return <main className="app" />;
  if (!pin)
    return (
      <main className="app">
        <Login
          onDone={(p) => {
            try {
              localStorage.setItem(KEY, p);
            } catch {}
            setPin(p);
          }}
        />
      </main>
    );
  return (
    <main className="app">
      <Console
        pin={pin}
        onLogout={() => {
          try {
            localStorage.removeItem(KEY);
          } catch {}
          setPin(null);
        }}
      />
    </main>
  );
}

function Login({ onDone }: { onDone: (p: string) => void }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState("");
  const go = async () => {
    const { data, error } = await supabase.rpc("refresher_is_trainer", { p_pin: v.trim() });
    if (error) return setErr(error.message);
    if (!data) return setErr("Wrong trainer PIN");
    onDone(v.trim());
  };
  return (
    <div className="login">
      <div className="kicker" style={{ fontSize: 13 }}>
        Trainer studio
      </div>
      <h1>Sign in</h1>
      <input className="input" type="password" placeholder="Trainer PIN" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
      {err && <p style={{ color: "#ff8fa3" }}>{err}</p>}
      <button className="btn primary" style={{ width: "100%", marginTop: 12, padding: 14 }} onClick={go}>
        Enter
      </button>
    </div>
  );
}

function defaultData(s: Scene): Record<string, any> {
  if (s.type === "quiz") return { limit: s.limit };
  if (s.type === "cards") return { step: s.cards.length };
  if (s.type === "slides") return { slide: 0 };
  if (s.type === "splitpay") return { amount: 12000, months: 12 };
  return {};
}

function Console({ pin, onLogout }: { pin: string; onLogout: () => void }) {
  const live = useLive();
  const [tab, setTab] = useState<"run" | "teams" | "reset">("run");
  const [err, setErr] = useState("");
  const scene = sceneById(live.state.scene);
  const idx = SCENES.findIndex((s) => s.id === scene.id);

  const setState = useCallback(
    async (sceneId: string, phase: Phase, data: Record<string, any>) => {
      const { error } = await supabase.rpc("refresher_set_state", { p_pin: pin, p_scene: sceneId, p_phase: phase, p_data: data });
      if (error) setErr(rpcError(error));
      else setErr("");
    },
    [pin]
  );
  const go = useCallback((s: Scene) => setState(s.id, "idle", defaultData(s)), [setState]);
  const patch = useCallback((p: Record<string, any>, phase?: Phase) => setState(live.state.scene, phase || live.state.phase, { ...live.state.data, ...p }), [live.state, setState]);
  const phaseTo = useCallback((phase: Phase) => setState(live.state.scene, phase, live.state.data), [live.state, setState]);

  // Keyboard / presenter clicker: → / PageDown next, ← / PageUp previous. Steps through deck slides first.
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const fwd = e.key === "ArrowRight" || e.key === "PageDown";
    const back = e.key === "ArrowLeft" || e.key === "PageUp";
    if (!fwd && !back) return;
    e.preventDefault();
    if (scene.type === "slides") {
      const i = Number(live.state.data.slide || 0);
      if (fwd && i < scene.images.length - 1) return patch({ slide: i + 1 });
      if (back && i > 0) return patch({ slide: i - 1 });
    }
    const n = SCENES[idx + (fwd ? 1 : -1)];
    if (n) go(n);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Auto-lock a quiz when its timer runs out.
  const now = useNow(live.offset, 250);
  useEffect(() => {
    if (scene.type !== "quiz" || live.state.phase !== "open" || !live.state.opened_at) return;
    const limit = Number(live.state.data.limit || scene.limit);
    const elapsed = (now - new Date(live.state.opened_at).getTime()) / 1000;
    const allIn = live.teams.length > 0 && live.answers.filter((a) => a.activity === scene.id).length >= live.teams.length;
    if (elapsed > limit + 0.5 || allIn) phaseTo("locked");
  }, [now, scene, live.state, live.answers, live.teams, phaseTo]);

  return (
    <div className="tr">
      <aside className="tr-side">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <b style={{ fontFamily: "var(--display)" }}>🎛️ Trainer studio</b>
          <button className="btn sm" onClick={onLogout}>
            Sign out
          </button>
        </div>
        {SECTIONS.map((sec) => (
          <div key={sec.key}>
            <div className="tr-sec">{sec.name}</div>
            {SCENES.filter((s) => s.section === sec.key).map((s) => (
              <button key={s.id} className={"tr-scene " + (s.id === scene.id ? "on" : "")} onClick={() => go(s)}>
                <span className="ty">{ICON[s.type]}</span>
                {s.label}
              </button>
            ))}
          </div>
        ))}
      </aside>
      <section className="tr-main">
        <div className="tr-top">
          <h1>
            {ICON[scene.type]} {scene.label} <span className={"phase " + live.state.phase}>{live.state.phase}</span>
          </h1>
          <span className={"dot " + (live.connected ? "on" : "")} title={live.connected ? "Live" : "Offline"} />
          <button className="btn sm" disabled={idx <= 0} onClick={() => go(SCENES[idx - 1])}>
            ← Prev
          </button>
          <button className="btn sm primary" disabled={idx >= SCENES.length - 1} onClick={() => go(SCENES[idx + 1])}>
            Next →
          </button>
          <a className="btn sm" href="/screen" target="_blank">
            🖥 Open screen
          </a>
          <div className="tabs">
            {(["run", "teams", "reset"] as const).map((t) => (
              <button key={t} className={"btn sm " + (tab === t ? "on" : "")} onClick={() => setTab(t)}>
                {t === "run" ? "Run" : t === "teams" ? "Teams & PINs" : "Reset"}
              </button>
            ))}
          </div>
        </div>
        {err && <div style={{ color: "#ff8fa3" }}>{err}</div>}
        {tab === "run" && (
          <div className="tr-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="tr-preview">
                <Stage>
                  <SceneView live={live} />
                </Stage>
              </div>
              <div className="dim" style={{ fontSize: 13 }}>
                Live preview of the projector. Keys: ← → or a presenter clicker. Deck scenes step through slides first.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Controls live={live} scene={scene} pin={pin} patch={patch} phaseTo={phaseTo} />
              <Scores live={live} pin={pin} />
            </div>
          </div>
        )}
        {tab === "teams" && <TeamsAdmin live={live} pin={pin} />}
        {tab === "reset" && <ResetAdmin live={live} pin={pin} scene={scene} />}
      </section>
    </div>
  );
}

function Controls({ live, scene, pin, patch, phaseTo }: { live: Live; scene: Scene; pin: string; patch: (p: Record<string, any>, phase?: Phase) => void; phaseTo: (p: Phase) => void }) {
  const phase = live.state.phase;
  const d = live.state.data;
  const award = async (team: number, pts: number, reason: string) => {
    await supabase.rpc("refresher_award", { p_pin: pin, p_team: team, p_points: pts, p_reason: reason });
    live.refresh();
  };

  if (scene.type === "wordcloud") {
    const rs = live.responses.filter((r) => r.activity === scene.id).slice().reverse();
    return (
      <div className="panel">
        <h3>Word cloud</h3>
        <div className="ctrl">
          {phase !== "open" ? (
            <button className="btn go" onClick={() => phaseTo("open")}>
              ▶ Open for submissions
            </button>
          ) : (
            <button className="btn warn" onClick={() => phaseTo("locked")}>
              ■ Close
            </button>
          )}
          <span className="dim">{rs.length} submissions</span>
        </div>
        <div className="feed" style={{ marginTop: 12 }}>
          {rs.map((r) => {
            const t = live.teams.find((x) => x.id === r.team_id);
            return (
              <div key={r.id} className="feed-i" style={{ ["--c" as any]: t?.color }}>
                {t?.emoji} {r.value}
                <button
                  className="btn sm"
                  title="Remove from cloud"
                  onClick={async () => {
                    await supabase.rpc("refresher_moderate", { p_pin: pin, p_id: r.id });
                    live.refresh();
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (scene.type === "quiz") {
    const ans = live.answers.filter((a) => a.activity === scene.id);
    return (
      <div className="panel">
        <h3>Quiz controls</h3>
        <div className="ctrl">
          <label className="row dim" style={{ fontSize: 14 }}>
            Timer
            <input className="input" style={{ width: 70, padding: 8 }} type="number" min={5} max={120} value={d.limit ?? scene.limit} disabled={phase === "open"} onChange={(e) => patch({ limit: Number(e.target.value) })} />s
          </label>
          {(phase === "idle" || phase === "locked") && ans.length === 0 && (
            <button className="btn go" onClick={() => phaseTo("open")}>
              ▶ Start timer
            </button>
          )}
          {phase === "open" && (
            <button className="btn warn" onClick={() => phaseTo("locked")}>
              ■ Lock now
            </button>
          )}
          {(phase === "locked" || phase === "open") && (
            <button className="btn gold" onClick={() => phaseTo("revealed")}>
              ★ Reveal answer
            </button>
          )}
          {phase === "revealed" && <span className="dim">Revealed. Press Next →</span>}
        </div>
        <p className="dim" style={{ fontSize: 13 }}>
          Correct answer: <b style={{ color: OPTION_COLORS[scene.answer] }}>{scene.options[scene.answer]}</b> · Locks automatically when time runs out or all teams answer.
        </p>
        <table className="tbl">
          <tbody>
            {live.teams.map((t) => {
              const a = ans.find((x) => x.team_id === t.id);
              return (
                <tr key={t.id}>
                  <td>
                    {t.emoji} {t.name}
                  </td>
                  <td>{a ? scene.options[a.choice] : "—"}</td>
                  <td>{a ? `${(a.elapsed_ms / 1000).toFixed(1)}s` : ""}</td>
                  <td style={{ textAlign: "right" }}>{a ? (a.choice === scene.answer ? `✅ ${quizPoints(scene.id, a)}` : "❌") : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (scene.type === "scenario") {
    const rs = live.responses.filter((r) => r.activity === scene.id);
    const teamsIn = live.teams.filter((t) => rs.some((r) => r.team_id === t.id));
    const shown = Number(d.show ?? 0);
    return (
      <div className="panel">
        <h3>Team challenge</h3>
        <div className="ctrl">
          {phase === "idle" && (
            <button className="btn go" onClick={() => phaseTo("open")}>
              ▶ Open for answers
            </button>
          )}
          {phase === "open" && (
            <button className="btn warn" onClick={() => phaseTo("locked")}>
              ■ Close answers
            </button>
          )}
          {phase === "locked" && (
            <button className="btn gold" onClick={() => patch({ show: 1 }, "revealed")}>
              ★ Reveal first answer
            </button>
          )}
          {phase === "revealed" && (
            <>
              <button className="btn gold" disabled={shown >= teamsIn.length} onClick={() => patch({ show: shown + 1 })}>
                Reveal next ({Math.min(shown, teamsIn.length)}/{teamsIn.length})
              </button>
              <button className="btn" onClick={() => patch({ show: 99 })}>
                Show all
              </button>
            </>
          )}
        </div>
        <div className="feed" style={{ marginTop: 12, maxHeight: 420 }}>
          {live.teams.map((t) => {
            const r = rs.filter((x) => x.team_id === t.id).slice(-1)[0];
            const b = live.bonus.filter((x) => x.team_id === t.id && x.reason === scene.id).reduce((a, x) => a + x.points, 0);
            return (
              <div key={t.id} className="feed-i" style={{ ["--c" as any]: t.color, flexDirection: "column", alignItems: "stretch" }}>
                <div className="row">
                  <b>
                    {t.emoji} {t.name}
                  </b>
                  <span style={{ marginLeft: "auto" }} className="dim">
                    {b ? `+${b}` : ""}
                  </span>
                  {[50, 100].map((p) => (
                    <button key={p} className="btn sm" disabled={!r} onClick={() => award(t.id, p, scene.id)}>
                      +{p}
                    </button>
                  ))}
                </div>
                <div className={r ? "" : "dim"}>{r?.value || "No answer yet"}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (scene.type === "cards") {
    const step = Number(d.step ?? scene.cards.length);
    return (
      <div className="panel">
        <h3>Reveal cards</h3>
        <div className="ctrl">
          <button className="btn" onClick={() => patch({ step: 0 })}>
            Hide all
          </button>
          <button className="btn gold" disabled={step >= scene.cards.length} onClick={() => patch({ step: step + 1 })}>
            Reveal next ({step}/{scene.cards.length})
          </button>
          <button className="btn" onClick={() => patch({ step: scene.cards.length })}>
            Show all
          </button>
        </div>
      </div>
    );
  }

  if (scene.type === "slides") {
    const i = Number(d.slide || 0);
    return (
      <div className="panel">
        <h3>
          Deck · slide {i + 1} of {scene.images.length}
        </h3>
        <div className="ctrl">
          <button className="btn" disabled={i <= 0} onClick={() => patch({ slide: i - 1 })}>
            ← Slide
          </button>
          <button className="btn primary" disabled={i >= scene.images.length - 1} onClick={() => patch({ slide: i + 1 })}>
            Slide →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 10 }}>
          {scene.images.map((src, k) => (
            <img key={src} src={src} alt="" onClick={() => patch({ slide: k })} style={{ width: "100%", borderRadius: 6, cursor: "pointer", outline: k === i ? "3px solid var(--gold)" : "none", opacity: k === i ? 1 : 0.6 }} />
          ))}
        </div>
      </div>
    );
  }

  if (scene.type === "splitpay") {
    const amount = Number(d.amount || 12000);
    const months = Number(d.months || 12);
    const c = splitCalc(amount, months);
    return (
      <div className="panel">
        <h3>SplitPay calculator</h3>
        <label className="dim" style={{ fontSize: 14 }}>
          Purchase amount (MVR)
        </label>
        <div className="row">
          <input type="range" min={500} max={50000} step={500} value={amount} onChange={(e) => patch({ amount: Number(e.target.value) })} style={{ flex: 1 }} />
          <input className="input" style={{ width: 110, padding: 8 }} type="number" value={amount} onChange={(e) => patch({ amount: Number(e.target.value) })} />
        </div>
        <div className="ctrl" style={{ marginTop: 10 }}>
          {[3, 6, 12, 18, 24].map((m) => (
            <button key={m} className={"btn sm " + (m === months ? "primary" : "")} onClick={() => patch({ months: m })}>
              {m} mo
            </button>
          ))}
        </div>
        <p className="dim" style={{ fontSize: 13 }}>
          Finance {c.finance.toFixed(2)} · Total {c.total.toFixed(2)} · Monthly {c.monthly.toFixed(2)}
        </p>
        <div className="ctrl">
          {[
            [12000, 12],
            [1500, 3],
            [6000, 6],
            [30000, 24],
          ].map(([a, m]) => (
            <button key={a + "-" + m} className="btn sm" onClick={() => patch({ amount: a, months: m })}>
              {a.toLocaleString()} / {m}m
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (scene.type === "attendance") return <AttendanceCtrl live={live} pin={pin} />;

  if (scene.type === "lineup") {
    const f = Number(d.focus || 0);
    return (
      <div className="panel">
        <h3>Find your team · spotlight</h3>
        <div className="ctrl">
          <button className={"btn sm " + (!f ? "primary" : "")} onClick={() => patch({ focus: 0 })}>
            🔄 Auto-rotate (8s)
          </button>
          {live.teams.map((t) => (
            <button key={t.id} className={"btn sm " + (f === t.id ? "primary" : "")} onClick={() => patch({ focus: t.id })}>
              {t.emoji} {t.name.replace(/^Team /, "")}
            </button>
          ))}
        </div>
        <p className="dim" style={{ fontSize: 13 }}>
          Shows one team at a time in large text. “Meet the teams” (previous scene) shows all five teams together.
        </p>
      </div>
    );
  }

  if (scene.type === "ams") {
    const hi = typeof d.highlight === "number" ? d.highlight : -1;
    return (
      <div className="panel">
        <h3>Highlight a rung</h3>
        <div className="ctrl">
          <button className={"btn sm " + (hi < 0 ? "primary" : "")} onClick={() => patch({ highlight: -1 })}>
            None
          </button>
          {AMS_LADDER.map((l, i) => (
            <button key={l.months} className={"btn sm " + (hi === i ? "primary" : "")} onClick={() => patch({ highlight: i })}>
              {l.months} mo
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3>This scene</h3>
      <p className="dim" style={{ margin: 0 }}>
        Nothing to control here. Team leaders see “Eyes on the screen” and the live leaderboard. Press Next → when ready.
      </p>
    </div>
  );
}

function AttendanceCtrl({ live, pin }: { live: Live; pin: string }) {
  const [url, setUrl] = useState(live.settings.attendance_url || "");
  const [img, setImg] = useState(live.settings.attendance_image || "");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    setUrl(live.settings.attendance_url || "");
    setImg(live.settings.attendance_image || "");
  }, [live.settings.attendance_url, live.settings.attendance_image]);
  const save = async () => {
    const a = await supabase.rpc("refresher_set_setting", { p_pin: pin, p_key: "attendance_url", p_value: url });
    const b = await supabase.rpc("refresher_set_setting", { p_pin: pin, p_key: "attendance_image", p_value: img });
    setMsg(a.error || b.error ? rpcError(a.error || b.error) : "Saved ✓ The screen updates now.");
    live.refresh();
  };
  return (
    <div className="panel">
      <h3>Attendance QR</h3>
      <label className="dim" style={{ fontSize: 13 }}>
        Attendance form link (we generate the QR from it)
      </label>
      <input className="input" placeholder="https://forms.office.com/…" value={url} onChange={(e) => setUrl(e.target.value)} />
      <label className="dim" style={{ fontSize: 13, display: "block", marginTop: 10 }}>
        Or a link to a ready-made QR image (used instead, if filled)
      </label>
      <input className="input" placeholder="https://…/qr.png" value={img} onChange={(e) => setImg(e.target.value)} />
      <div className="ctrl" style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={save}>
          Save
        </button>
        <span className="dim" style={{ fontSize: 13 }}>
          {msg}
        </span>
      </div>
    </div>
  );
}

function Scores({ live, pin }: { live: Live; pin: string }) {
  const sc = visibleScores(live);
  const [pts, setPts] = useState(50);
  const award = async (team: number, p: number) => {
    await supabase.rpc("refresher_award", { p_pin: pin, p_team: team, p_points: p, p_reason: "manual" });
    live.refresh();
  };
  return (
    <div className="panel">
      <h3>Leaderboard & bonus points</h3>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className="dim" style={{ fontSize: 13 }}>
          Points
        </span>
        <input className="input" style={{ width: 80, padding: 6 }} type="number" value={pts} onChange={(e) => setPts(Number(e.target.value))} />
      </div>
      <table className="tbl">
        <tbody>
          {sc.map((x, i) => (
            <tr key={x.team.id}>
              <td>{i + 1}</td>
              <td>
                {x.team.emoji} {x.team.name}
              </td>
              <td style={{ fontWeight: 800 }}>{x.score}</td>
              <td style={{ textAlign: "right" }}>
                <button className="btn sm" onClick={() => award(x.team.id, pts)}>
                  +{pts}
                </button>{" "}
                <button className="btn sm" onClick={() => award(x.team.id, -pts)}>
                  −
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamsAdmin({ live, pin }: { live: Live; pin: string }) {
  const [edits, setEdits] = useState<Record<number, { name: string; leader: string; pin: string }>>({});
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const e: typeof edits = {};
    live.teams.forEach((t) => (e[t.id] = { name: t.name, leader: t.leader, pin: "" }));
    setEdits(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live.teams.length]);
  const save = async (id: number) => {
    const e = edits[id];
    const { error } = await supabase.rpc("refresher_update_team", { p_pin: pin, p_team: id, p_name: e.name, p_leader: e.leader, p_team_pin: e.pin || null });
    setMsg(error ? rpcError(error) : "Saved ✓");
    live.refresh();
  };
  return (
    <div className="panel">
      <h3>Teams, leaders & PINs</h3>
      <p className="dim" style={{ fontSize: 13 }}>
        Default team PINs are 1111, 2222, 3333, 4444, 5555. Set new PINs before the event and hand them to each leader. Leave PIN blank to keep the current one.
      </p>
      {live.teams.map((t) => {
        const e = edits[t.id];
        if (!e) return null;
        const set = (k: "name" | "leader" | "pin", v: string) => setEdits({ ...edits, [t.id]: { ...e, [k]: v } });
        return (
          <div key={t.id} className="row" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: 26 }}>{t.emoji}</span>
            <input className="input" value={e.name} onChange={(x) => set("name", x.target.value)} placeholder="Team name" />
            <input className="input" value={e.leader} onChange={(x) => set("leader", x.target.value)} placeholder="Leader name" />
            <input className="input" style={{ width: 130 }} value={e.pin} onChange={(x) => set("pin", x.target.value)} placeholder="New PIN" />
            <button className="btn primary" onClick={() => save(t.id)}>
              Save
            </button>
          </div>
        );
      })}
      {msg && <p>{msg}</p>}
      <Members live={live} pin={pin} />
    </div>
  );
}

function Members({ live, pin }: { live: Live; pin: string }) {
  const [msg, setMsg] = useState("");
  const balance = async () => {
    if (live.members.some((m) => m.team_id) && !confirm("Re-shuffle all participants into new balanced teams? Leaders stay with their teams.")) return;
    const { error } = await supabase.rpc("refresher_balance_teams", { p_pin: pin });
    setMsg(error ? rpcError(error) : "Teams balanced ✓");
    live.refresh();
  };
  const move = async (name: string, team: number) => {
    const { error } = await supabase.rpc("refresher_move_member", { p_pin: pin, p_name: name, p_team: team });
    if (error) setMsg(rpcError(error));
    live.refresh();
  };
  const unassigned = live.members.filter((m) => !m.team_id);
  return (
    <div style={{ marginTop: 24 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3 style={{ margin: 0 }}>Participants ({live.members.length})</h3>
        <button className="btn gold" onClick={balance}>
          ⚖️ Auto-balance teams
        </button>
      </div>
      <p className="dim" style={{ fontSize: 13 }}>
        Spreads each branch across as many teams as possible while keeping 9 per team and genders balanced (tries 150 shuffles, keeps the best). Use the dropdown to move someone by hand. {msg}
      </p>
      {unassigned.length > 0 && <p style={{ color: "#ffb36b" }}>{unassigned.length} not assigned yet</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
        {live.teams.map((t) => {
          const ms = live.members.filter((m) => m.team_id === t.id).sort((a, b) => Number(b.is_leader) - Number(a.is_leader) || a.name.localeCompare(b.name));
          const f = ms.filter((m) => m.gender === "Female").length;
          return (
            <div key={t.id} className="panel" style={{ borderTop: `4px solid ${t.color}` }}>
              <b>
                {t.emoji} {t.name}
              </b>
              <div className="dim" style={{ fontSize: 13, margin: "4px 0 8px" }}>
                {ms.length} people · ♀ {f} · ♂ {ms.length - f} · ✅ {ms.filter((m) => m.present).length} here
              </div>
              {ms.map((m) => (
                <div key={m.name} className="row" style={{ fontSize: 13, padding: "3px 0" }}>
                  <span style={{ flex: 1 }}>
                    {m.present ? "✅ " : ""}
                    {m.is_leader ? "★ " : ""}
                    {m.name} <span className="dim">· {m.gender[0]} · {m.unit}</span>
                  </span>
                  {!m.is_leader && (
                    <select className="input" style={{ width: 64, padding: "2px 4px", fontSize: 12 }} value={t.id} onChange={(e) => move(m.name, Number(e.target.value))}>
                      {live.teams.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.emoji}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResetAdmin({ live, pin, scene }: { live: Live; pin: string; scene: Scene }) {
  const [msg, setMsg] = useState("");
  const reset = async (activity: string | null) => {
    if (!confirm(activity ? `Clear all submissions for “${scene.label}”?` : "Clear ALL submissions, answers and points for the whole event?")) return;
    const { error } = await supabase.rpc("refresher_reset", { p_pin: pin, p_activity: activity });
    setMsg(error ? rpcError(error) : "Cleared ✓");
    live.refresh();
  };
  return (
    <div className="panel" style={{ maxWidth: 700 }}>
      <h3>Reset</h3>
      <div className="ctrl">
        <button className="btn warn" onClick={() => reset(scene.id)}>
          Clear current scene ({scene.label})
        </button>
        <button className="btn primary" onClick={() => reset(null)}>
          Clear everything (after rehearsal)
        </button>
      </div>
      {msg && <p>{msg}</p>}
    </div>
  );
}
