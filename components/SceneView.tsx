"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AGENDA, OPTION_COLORS, OPTION_SHAPES, SCENES, Scene, TAKEAWAYS, WORD_PROMPTS, sceneById } from "@/lib/content";
import { Live, quizPoints, useNow, visibleScores } from "@/lib/live";
import WordCloud from "./WordCloud";
import Qr from "./Qr";

// A fixed 1920×1080 stage scaled to fit its container: the projector and the
// trainer preview render exactly the same picture.
export function Stage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current!;
    const fit = () => setS(Math.min(el.clientWidth / 1920, el.clientHeight / 1080));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className="stage-wrap">
      <div className="stage" style={{ transform: `translate(-50%,-50%) scale(${s})`, opacity: s ? 1 : 0 }}>
        {children}
      </div>
    </div>
  );
}

export function joinUrl() {
  if (typeof window === "undefined") return "";
  return window.location.origin + "/team";
}

export default function SceneView({ live, sceneId }: { live: Live; sceneId?: string }) {
  const scene = sceneById(sceneId || live.state.scene);
  return (
    <div className="screen">
      <div className="aurora">
        <i className="a1" />
        <i className="a2" />
        <i className="a3" />
      </div>
      <div className="grain" />
      <div key={scene.id} className="scene-in">
        <SceneBody scene={scene} live={live} />
      </div>
      <Footer live={live} scene={scene} />
    </div>
  );
}

function Footer({ live, scene }: { live: Live; scene: Scene }) {
  const sc = visibleScores(live);
  if (scene.type === "welcome" || scene.type === "slides" || scene.type === "attendance") return null;
  return (
    <div className="footer">
      <div className="ticker">
        {sc.map((x, i) => (
          <span key={x.team.id} className="tick" style={{ ["--c" as any]: x.team.color }}>
            <b>{i + 1}</b> {x.team.emoji} {x.team.name.replace(/^Team /, "")} <em>{x.score}</em>
          </span>
        ))}
      </div>
    </div>
  );
}

function SceneBody({ scene, live }: { scene: Scene; live: Live }) {
  switch (scene.type) {
    case "attendance":
      return <Attendance live={live} />;
    case "welcome":
      return <Welcome live={live} />;
    case "leaderboard":
      return scene.id === "teams" ? <Lineup live={live} title="Meet the teams" /> : <Leaderboard live={live} />;
    case "lineup":
      return <Spotlight live={live} />;
    case "title":
      return (
        <div className="title-scene">
          {scene.number && <div className="big-num">{scene.number}</div>}
          <div className="kicker">{scene.kicker}</div>
          <h1 className="mega">{scene.title}</h1>
          {scene.subtitle && <p className="lead">{scene.subtitle}</p>}
          {scene.presenter && (
            <div className="presenter">
              <span className="mic">🎤</span> {scene.presenter}
            </div>
          )}
        </div>
      );
    case "holding":
      return (
        <div className="title-scene holding">
          <div className="live-pill">
            <span className="pulse" /> Session in progress
          </div>
          <div className="kicker">{scene.kicker}</div>
          <h1 className="mega">{scene.title}</h1>
          <p className="lead">{scene.subtitle}</p>
          <div className="presenter">
            <span className="mic">🎤</span> {scene.presenter}
          </div>
          <div className="rings">
            <i />
            <i />
            <i />
          </div>
        </div>
      );
    case "wordcloud":
      return <CloudScene live={live} scene={scene} />;
    case "wordwall":
      return (
        <div className="pad">
          <div className="kicker">Session 1 · Team voices</div>
          <h2 className="h2">What you have said</h2>
          <div className="wall">
            {["wc-why", "wc-known", "wc-better"].map((id, i) => (
              <div className="glass wall-col" key={id}>
                <div className="wall-q">{WORD_PROMPTS[i]}</div>
                <WordCloud responses={live.responses.filter((r) => r.activity === id)} teams={live.teams} scale={0.95} />
              </div>
            ))}
          </div>
        </div>
      );
    case "agenda":
      return <Agenda />;
    case "cards": {
      const step = live.state.scene === scene.id && typeof live.state.data.step === "number" ? live.state.data.step : scene.cards.length;
      return (
        <div className="pad">
          <div className="kicker">{scene.kicker}</div>
          <h2 className="h2">{scene.title}</h2>
          {scene.subtitle && <p className="sub">{scene.subtitle}</p>}
          <div className={"cards n" + scene.cards.length}>
            {scene.cards.map((c, i) => (
              <div key={c.title} className={"glass card " + (i < step ? "shown" : "hidden")} style={{ animationDelay: `${i * 0.12}s` }}>
                <div className="card-icon">{c.icon}</div>
                {c.tag && <div className="tag">{c.tag}</div>}
                <h3>{c.title}</h3>
                <p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "steps":
      return (
        <div className="pad">
          <div className="kicker">{scene.kicker}</div>
          <h2 className="h2">{scene.title}</h2>
          {scene.subtitle && <p className="sub">{scene.subtitle}</p>}
          <div className="steps">
            {scene.steps.map((s, i) => (
              <div className="step" key={s.title} style={{ animationDelay: `${0.2 + i * 0.25}s` }}>
                <div className="step-n">{i + 1}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
            <div className="step-line" />
          </div>
          {scene.note && <div className="note">💡 {scene.note}</div>}
        </div>
      );
    case "countdown":
      return <CountdownScene live={live} scene={scene} />;
    case "facts":
      return (
        <div className="pad">
          <div className="kicker">{scene.kicker}</div>
          <h2 className="h2">{scene.title}</h2>
          <div className="facts">
            {scene.facts.map((f, i) => (
              <div className="glass fact" key={f.label} style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="fact-v">{f.value}</div>
                <div className="fact-l">{f.label}</div>
                {f.sub && <div className="fact-s">{f.sub}</div>}
              </div>
            ))}
          </div>
          {scene.note && <div className="note">💡 {scene.note}</div>}
        </div>
      );
    case "slides": {
      const i = Math.max(0, Math.min(scene.images.length - 1, Number(live.state.scene === scene.id ? live.state.data.slide || 0 : 0)));
      return (
        <div className="slides">
          {scene.images.map((src, k) => (
            <img key={src} src={src} alt="" className={k === i ? "on" : ""} />
          ))}
          <div className="slide-dots">
            {scene.images.map((_, k) => (
              <i key={k} className={k === i ? "on" : ""} />
            ))}
          </div>
        </div>
      );
    }
    case "quiz":
      return <QuizScene live={live} scene={scene} />;
    case "scenario":
      return <ScenarioScene live={live} scene={scene} />;
    case "splitpay":
      return <SplitPayScene live={live} />;
    case "ams":
      return <AmsScene live={live} />;
    case "thanks":
      return <Thanks live={live} />;
  }
}

// ───────────────────────── Attendance (external QR set from the trainer view)
function Attendance({ live }: { live: Live }) {
  const url = live.settings.attendance_url || "";
  const img = live.settings.attendance_image || "";
  return (
    <div className="welcome attend">
      <div className="welcome-left">
        <div className="kicker">Bank of Maldives</div>
        <div className="att-welcome">
          Welcome to <span className="grad">Central Refresher 2026</span>
        </div>
        <h1 className="hero" style={{ fontSize: 150 }}>
          Mark your
          <br />
          <span className="grad">attendance</span>
        </h1>
        <div className="att-steps">
          <div>
            <b>1</b> Open your phone camera
          </div>
          <div>
            <b>2</b> Scan the QR code
          </div>
          <div>
            <b>3</b> Submit your attendance
          </div>
        </div>
      </div>
      <div className="welcome-right glass">
        <div className="join-t">Scan to sign in</div>
        {img ? (
          <img src={img} alt="Attendance QR code" style={{ width: 420, height: 420, objectFit: "contain", borderRadius: 16, background: "#fff", padding: 10 }} />
        ) : url ? (
          <Qr text={url} size={420} />
        ) : (
          <div className="qr-empty">QR code coming soon</div>
        )}
        <div className="join-s">Everyone, please sign in individually</div>
      </div>
    </div>
  );
}

// ───────────────────────── Welcome
function Welcome({ live }: { live: Live }) {
  const [url, setUrl] = useState("");
  useEffect(() => setUrl(joinUrl()), []);
  return (
    <div className="welcome">
      <div className="welcome-left">
        <div className="kicker">Bank of Maldives</div>
        <h1 className="hero">
          Central <span className="grad">Refresher</span>
          <br />
          2026
        </h1>
        <div className="team-chips">
          {live.teams.map((t, i) => (
            <div key={t.id} className="team-chip" style={{ ["--c" as any]: t.color, animationDelay: `${0.3 + i * 0.1}s` }}>
              <span className="em">{t.emoji}</span>
              <div>
                <b>{t.name}</b>
                <small>{t.leader || "Leader to be named"}</small>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="welcome-right glass">
        <div className="join-t">Team leaders, join here</div>
        {url && <Qr text={url} size={340} />}
        <div className="join-url">{url.replace(/^https?:\/\//, "")}</div>
        <div className="join-s">Pick your team · enter your team PIN</div>
      </div>
    </div>
  );
}

// ───────────────────────── Line-up
function Lineup({ live, title = "Find your team" }: { live: Live; title?: string }) {
  return (
    <div className="pad" style={{ paddingTop: 50 }}>
      <h2 className="h2" style={{ fontSize: 64, margin: "0 0 6px" }}>{title}</h2>
      <div className="lineup">
        {live.teams.map((t, i) => {
          const ms = live.members
            .filter((m) => m.team_id === t.id)
            .sort((a, b) => Number(b.is_leader) - Number(a.is_leader) || a.name.localeCompare(b.name));
          return (
            <div key={t.id} className="lu-col" style={{ ["--c" as any]: t.color, animationDelay: `${i * 0.12}s` }}>
              <div className="lu-head">
                <span>{t.emoji}</span>
                {t.name.replace(/^Team /, "")}
              </div>
              {ms.map((m) => (
                <div key={m.name} className={"lu-m " + (m.is_leader ? "lead-m" : "")}>
                  <b>
                    {m.is_leader && "★ "}
                    {m.name}
                  </b>
                  <small>{m.is_leader ? "Team leader" : m.unit}</small>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Spotlight: one team at a time, big enough for the back row
function Spotlight({ live }: { live: Live }) {
  const now = useNow(live.offset, 1000);
  const active = live.state.scene === "lineup";
  const pick = active ? Number(live.state.data.focus || 0) : 0;
  const n = Math.max(1, live.teams.length);
  const t = pick ? live.teams.find((x) => x.id === pick) : live.teams[Math.floor(now / 8000) % n];
  if (!t) return null;
  const ms = live.members
    .filter((m) => m.team_id === t.id)
    .sort((a, b) => Number(b.is_leader) - Number(a.is_leader) || a.name.localeCompare(b.name));
  const leader = ms.find((m) => m.is_leader);
  const rest = ms.filter((m) => !m.is_leader);
  return (
    <div className="spot" style={{ ["--c" as any]: t.color }}>
      <div className="spot-left" key={"l" + t.id}>
        <div className="kicker">Find your team</div>
        <div className="spot-em">{t.emoji}</div>
        <div className="spot-name">{t.name}</div>
        {leader && (
          <div className="spot-leader">
            <small>★ Team leader</small>
            {leader.name}
          </div>
        )}
      </div>
      <div className="spot-list" key={"r" + t.id}>
        {rest.map((m, i) => (
          <div key={m.name} className="spot-m" style={{ animationDelay: `${0.1 + i * 0.06}s` }}>
            <b>{m.name}</b>
            <small>{m.unit}</small>
          </div>
        ))}
      </div>
      <div className="spot-dots">
        {live.teams.map((x) => (
          <span key={x.id} className={x.id === t.id ? "on" : ""} style={{ ["--c" as any]: x.color }}>
            {x.emoji} {x.name.replace(/^Team /, "")}
          </span>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Leaderboard
function Leaderboard({ live }: { live: Live }) {
  const sc = visibleScores(live);
  const max = Math.max(1, ...sc.map((x) => x.score));
  const order = [...live.teams].sort((a, b) => a.id - b.id);
  return (
    <div className="pad">
      <div className="kicker">Standings</div>
      <h2 className="h2">Leaderboard</h2>
      <div className="board" style={{ height: sc.length * 136 }}>
        {order.map((t) => {
          const rank = sc.findIndex((x) => x.team.id === t.id);
          const score = sc[rank]?.score || 0;
          return (
            <div key={t.id} className={"board-row " + (rank === 0 && score > 0 ? "first" : "")} style={{ transform: `translateY(${rank * 136}px)`, ["--c" as any]: t.color }}>
              <div className="board-rank">{rank === 0 && score > 0 ? "👑" : rank + 1}</div>
              <div className="board-em">{t.emoji}</div>
              <div className="board-name">
                {t.name}
                <small>{t.leader}</small>
              </div>
              <div className="board-bar">
                <i style={{ width: `${(score / max) * 100}%` }} />
              </div>
              <div className="board-score">{score}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Word cloud
function CloudScene({ live, scene }: { live: Live; scene: Extract<Scene, { type: "wordcloud" }> }) {
  const rs = live.responses.filter((r) => r.activity === scene.id);
  const open = live.state.scene === scene.id && live.state.phase === "open";
  return (
    <div className="pad cloud-scene">
      <div className="cloud-head">
        <div>
          <div className="kicker">
            Word cloud · Question {scene.index + 1} of 3 {open ? <span className="badge open">● Open</span> : <span className="badge">Closed</span>}
          </div>
          <h2 className="h2">{scene.prompt}</h2>
        </div>
        <div className="cloud-count">
          <b>{rs.length}</b>
        </div>
      </div>
      <div className="cloud-box glass">
        <WordCloud responses={rs} teams={live.teams} />
      </div>
      <div className="team-progress">
        {live.teams.map((t) => {
          const n = rs.filter((r) => r.team_id === t.id).length;
          return (
            <span key={t.id} className={"tp " + (n ? "on" : "")} style={{ ["--c" as any]: t.color }}>
              {t.emoji} {t.name.replace(/^Team /, "")} <b>{n}</b>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────── Agenda
function Agenda() {
  const total = AGENDA.reduce((a, b) => a + b.min, 0);
  const colors = ["#8892B0", "#FF5A5F", "#00B8D9", "#7C5CFF", "#22C55E", "#FFB020"];
  return (
    <div className="pad">
      <div className="kicker">Session 3 · Commercial Updates</div>
      <h2 className="h2">How the hour runs</h2>
      <p className="sub">Four parts, four presenters, and a knowledge check to close</p>
      <div className="timeline">
        {AGENDA.map((a, i) => (
          <div key={a.part} className="tl-seg" style={{ flex: a.min / total, background: colors[i], animationDelay: `${i * 0.1}s` }}>
            {a.min >= 5 ? `${a.min}′` : ""}
          </div>
        ))}
      </div>
      <div className="agenda">
        {AGENDA.map((a, i) => (
          <div key={a.part} className="glass ag" style={{ ["--c" as any]: colors[i], animationDelay: `${0.2 + i * 0.1}s` }}>
            <div className="ag-time">{a.time}</div>
            <div className="ag-part">{a.part}</div>
            <div className="ag-topic">{a.topic}</div>
            <div className="ag-who">🎤 {a.who}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Countdown
function CountdownScene({ live, scene }: { live: Live; scene: Extract<Scene, { type: "countdown" }> }) {
  const now = useNow(live.offset, 1000);
  const diff = Math.max(0, new Date(scene.target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="pad">
      <div className="kicker">{scene.kicker}</div>
      <h2 className="h2">{scene.title}</h2>
      <div className="cd-wrap">
        <div className="glass cd">
          <div className="cd-label">{diff > 0 ? "Applications open in" : "Applications are OPEN"}</div>
          <div className="cd-digits">
            {[
              [d, "days"],
              [h, "hours"],
              [m, "min"],
              [s, "sec"],
            ].map(([v, l]) => (
              <div key={l as string} className="cd-cell">
                <b>{pad(v as number)}</b>
                <small>{l}</small>
              </div>
            ))}
          </div>
          <div className="cd-target">{scene.targetLabel}</div>
          <div className="cd-schemes">
            {scene.schemes.map((x) => (
              <span key={x}>🏠 {x}</span>
            ))}
          </div>
        </div>
        <div className="cd-side">
          <div className="glass card shown">
            <div className="card-icon">📣</div>
            <p>{scene.note}</p>
          </div>
          {scene.extra && (
            <div className="glass card shown">
              <div className="card-icon">⛵</div>
              <h3>{scene.extra.title}</h3>
              <p>{scene.extra.body}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Quiz
function QuizScene({ live, scene }: { live: Live; scene: Extract<Scene, { type: "quiz" }> }) {
  const active = live.state.scene === scene.id;
  const phase = active ? live.state.phase : "idle";
  const now = useNow(live.offset, 100);
  const limit = Number(live.state.data.limit || scene.limit);
  const opened = live.state.opened_at ? new Date(live.state.opened_at).getTime() : now;
  const left = phase === "open" ? Math.max(0, limit - (now - opened) / 1000) : phase === "idle" ? limit : 0;
  const ans = live.answers.filter((a) => a.activity === scene.id);
  const revealed = phase === "revealed";
  const counts = scene.options.map((_, i) => ans.filter((a) => a.choice === i).length);
  const maxC = Math.max(1, ...counts);
  const two = scene.options.length <= 2;

  return (
    <div className="pad quiz">
      <div className="quiz-top">
        <div>
          <div className="kicker">
            {scene.kicker} · {scene.points} pts
          </div>
          <h2 className="quiz-q">{scene.question}</h2>
        </div>
        <Timer left={left} limit={limit} phase={phase} />
      </div>
      <div className={"options " + (two ? "two" : "")}>
        {scene.options.map((o, i) => {
          const right = revealed && i === scene.answer;
          const wrong = revealed && i !== scene.answer;
          return (
            <div key={i} className={"opt " + (right ? "right" : "") + (wrong ? " wrong" : "")} style={{ ["--c" as any]: OPTION_COLORS[i], animationDelay: `${i * 0.08}s` }}>
              <span className="shape">{OPTION_SHAPES[i]}</span>
              <span className="opt-t">{o}</span>
              {revealed && (
                <span className="opt-c">
                  <i style={{ width: `${(counts[i] / maxC) * 100}%` }} />
                  <b>{counts[i]}</b>
                </span>
              )}
              {right && <span className="tick-big">✓</span>}
            </div>
          );
        })}
      </div>
      <div className="quiz-teams">
        {live.teams.map((t) => {
          const a = ans.find((x) => x.team_id === t.id);
          const pts = quizPoints(scene.id, a);
          return (
            <div key={t.id} className={"qt " + (a ? "in" : "") + (revealed ? (pts ? " ok" : " no") : "")} style={{ ["--c" as any]: t.color }}>
              <span className="em">{t.emoji}</span>
              <span className="qt-n">{t.name.replace(/^Team /, "")}</span>
              <span className="qt-s">{revealed ? (a ? (pts ? `+${pts}` : "✗") : "–") : a ? `🔒 ${(a.elapsed_ms / 1000).toFixed(1)}s` : phase === "open" ? "thinking…" : ""}</span>
            </div>
          );
        })}
      </div>
      {revealed && <div className="explain">✅ {scene.explain}</div>}
    </div>
  );
}

function Timer({ left, limit, phase }: { left: number; limit: number; phase: string }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const frac = limit ? left / limit : 0;
  const urgent = phase === "open" && left <= 5;
  return (
    <div className={"timer " + (urgent ? "urgent" : "")}>
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} stroke="rgba(255,255,255,.12)" strokeWidth="14" fill="none" />
        <circle cx="90" cy="90" r={r} stroke={urgent ? "#FF5A5F" : "#FFD166"} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset .1s linear" }} />
      </svg>
      <div className="timer-t">{phase === "idle" ? "Ready" : phase === "open" ? Math.ceil(left) : phase === "revealed" ? "✓" : "⏱"}</div>
    </div>
  );
}

// ───────────────────────── Scenario
function ScenarioScene({ live, scene }: { live: Live; scene: Extract<Scene, { type: "scenario" }> }) {
  const active = live.state.scene === scene.id;
  const phase = active ? live.state.phase : "idle";
  const rs = live.responses.filter((r) => r.activity === scene.id);
  const shown = active && phase === "revealed" ? Number(live.state.data.show ?? 99) : 0;
  const bonusFor = (team: number) => live.bonus.filter((b) => b.team_id === team && b.reason === scene.id).reduce((a, b) => a + b.points, 0);
  const ordered = live.teams.filter((t) => rs.some((r) => r.team_id === t.id));
  return (
    <div className="pad">
      <div className="kicker">{scene.kicker}</div>
      <h2 className="h2">{scene.title}</h2>
      {shown === 0 ? (
        <div className="scenario">
          <div className="glass scen-prompt">
            <div className="quote">“</div>
            <p>{scene.prompt}</p>
            <div className="tips">
              {scene.tips.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
          <div className="scen-status">
            {live.teams.map((t) => {
              const done = rs.some((r) => r.team_id === t.id);
              return (
                <div key={t.id} className={"ss " + (done ? "done" : "")} style={{ ["--c" as any]: t.color }}>
                  <span>{t.emoji}</span> {t.name} <b>{done ? "Submitted ✓" : phase === "open" ? "Writing…" : "—"}</b>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="scen-answers">
          {ordered.slice(0, shown).map((t, i) => {
            const r = rs.filter((x) => x.team_id === t.id).slice(-1)[0];
            const b = bonusFor(t.id);
            return (
              <div key={t.id} className="glass scen-a" style={{ ["--c" as any]: t.color, animationDelay: `${i * 0.05}s` }}>
                <div className="scen-a-h">
                  {t.emoji} {t.name} {b > 0 && <span className="award">+{b} 🏅</span>}
                </div>
                <p>{r?.value}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── SplitPay calculator
export function splitCalc(amount: number, months: number) {
  const finance = Math.round(amount * 0.09 * (months / 12) * 100) / 100;
  const total = amount + finance;
  return { finance, total, monthly: total / months, principal: amount / months, charge: finance / months };
}
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: n % 1 ? 2 : 0 });

function SplitPayScene({ live }: { live: Live }) {
  const active = live.state.scene === "p3-calc";
  const amount = Number((active && live.state.data.amount) || 12000);
  const months = Number((active && live.state.data.months) || 12);
  const c = splitCalc(amount, months);
  const ok = amount >= 1500;
  return (
    <div className="pad">
      <div className="kicker">BML SplitPay · live calculator</div>
      <h2 className="h2">See the cost before you choose</h2>
      <div className="sp">
        <div className="glass sp-main">
          <div className="sp-row">
            <div>
              <small>Purchase</small>
              <b>MVR {fmt(amount)}</b>
            </div>
            <div>
              <small>Plan</small>
              <b>{months} months</b>
            </div>
            <div>
              <small>Rate</small>
              <b>9% p.a.</b>
            </div>
          </div>
          <div className="sp-terms">
            {[3, 6, 12, 18, 24].map((m) => (
              <span key={m} className={m === months ? "on" : ""}>
                {m}
              </span>
            ))}
          </div>
          {ok ? (
            <>
              <div className="sp-big">
                <small>Monthly payment</small>
                <b key={amount + "-" + months}>MVR {fmt(Math.round(c.monthly * 100) / 100)}</b>
              </div>
              <div className="sp-formula">
                Finance charge = {fmt(amount)} × 9% × {months} ÷ 12 = <b>MVR {fmt(c.finance)}</b> · Total <b>MVR {fmt(c.total)}</b>
              </div>
            </>
          ) : (
            <div className="sp-big warn">Below the MVR 1,500 minimum ✗</div>
          )}
        </div>
        <div className="sp-months">
          {Array.from({ length: months }).map((_, i) => (
            <div key={months + "-" + i} className="sp-m" style={{ animationDelay: `${i * 0.04}s` }}>
              <i style={{ height: `${(c.principal / c.monthly) * 100}%` }} />
              <em style={{ height: `${(c.charge / c.monthly) * 100}%` }} />
              <small>{String(i + 1).padStart(2, "0")}</small>
            </div>
          ))}
        </div>
        <div className="sp-legend">
          <span>
            <i className="p" /> Principal
          </span>
          <span>
            <i className="f" /> Finance charge
          </span>
          <span>🚫 No rewards points · 🚫 No POS void · 📅 Keep the agreed term</span>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── AMS ladder
export const AMS_LADDER = [
  { months: 6, amount: "Below MVR 500K", h: 25 },
  { months: 12, amount: "Up to MVR 1.0M", h: 50 },
  { months: 18, amount: "Up to MVR 1.5M", h: 75 },
  { months: 24, amount: "Up to MVR 2.0M", h: 100 },
];
function AmsScene({ live }: { live: Live }) {
  const active = live.state.scene === "p2-ladder";
  const hi = active && typeof live.state.data.highlight === "number" ? live.state.data.highlight : -1;
  return (
    <div className="pad">
      <div className="kicker">Advance Merchant Settlement</div>
      <h2 className="h2">More history, bigger facility</h2>
      <div className="ams">
        <div className="ladder">
          {AMS_LADDER.map((l, i) => (
            <div key={l.months} className={"rung " + (hi === i ? "hi" : hi >= 0 ? "dim" : "")} style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="rung-bar" style={{ height: `${l.h * 4.2}px` }}>
                <b>{l.amount}</b>
              </div>
              <div className="rung-m">
                {l.months} <small>months history</small>
              </div>
            </div>
          ))}
        </div>
        <div className="glass ams-split">
          <div className="donut" />
          <div>
            <h3>Repay as you earn</h3>
            <p>
              Max <b className="red">20%</b> of each daily settlement goes to repayment. At least <b>80%</b> stays with the business.
            </p>
            <p className="dim">Sized on the past 6 months of settlements · min. MVR 20K monthly average · clean credit record</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Thanks
function Thanks({ live }: { live: Live }) {
  const sc = visibleScores(live);
  const top = sc[0];
  return (
    <div className="pad thanks">
      <div className="kicker">Five things to take back to the counter</div>
      <h2 className="h2">Thank you!</h2>
      <div className="thanks-grid">
        <ol className="takeaways">
          {TAKEAWAYS.map((t, i) => (
            <li key={t} style={{ animationDelay: `${i * 0.15}s` }}>
              <span>{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        {top && top.score > 0 && (
          <div className="glass champ" style={{ ["--c" as any]: top.team.color }}>
            <div className="crown">🏆</div>
            <small>Champions</small>
            <div className="champ-n">
              {top.team.emoji} {top.team.name}
            </div>
            <div className="champ-s">{top.score} pts</div>
            <div className="confetti">
              {Array.from({ length: 30 }).map((_, i) => (
                <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 10) * 0.3}s`, background: ["#FF5A5F", "#FFD166", "#00B8D9", "#22C55E", "#B9A6FF"][i % 5] }} />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="presenter">Shaig · Mahuza · Zima · Umran</div>
    </div>
  );
}

export { SCENES };
