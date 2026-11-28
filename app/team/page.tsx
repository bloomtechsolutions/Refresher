"use client";
import { useEffect, useMemo, useState } from "react";
import { CATEGORIES, MAAMIGILI_CENTER, STATUS, distanceM, fieldStats } from "@/lib/field";
import type { LeadStatus } from "@/lib/live";
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
  const [tab, setTab] = useState<"live" | "team" | "field">("live");
  const mine = live.members.filter((m) => m.team_id === team.id);
  const here = mine.filter((m) => m.present).length;
  // jump back to Live whenever the trainer changes the scene
  useEffect(() => setTab(live.state.scene === "field-brief" || live.state.scene === "field-map" ? "field" : "live"), [live.state.scene]);
  const fieldOn = live.leads.length > 0 || live.state.scene.startsWith("field");
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
      <div className="t-tabs" style={{ gridTemplateColumns: fieldOn ? "1fr 1fr 1fr" : "1fr 1fr" }}>
        <button className={tab === "live" ? "on" : ""} onClick={() => setTab("live")}>
          ⚡ Live
        </button>
        <button className={tab === "team" ? "on" : ""} onClick={() => setTab("team")}>
          👥 Team ({here}/{mine.length})
        </button>
        {fieldOn && (
          <button className={tab === "field" ? "on" : ""} onClick={() => setTab("field")}>
            🗺️ Field
          </button>
        )}
      </div>
      {tab === "field" ? (
        <div className="t-body">
          <FieldTab live={live} team={team} auth={auth} toast={setToast} />
        </div>
      ) : tab === "live" ? (
        <div className="t-body" key={scene.id}>
          <Body live={live} scene={scene} team={team} auth={auth} toast={setToast} />
        </div>
      ) : (
        <div className="t-body">
          <Roster live={live} team={team} auth={auth} toast={setToast} />
        </div>
      )}
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

function FieldTab({ live, team, auth, toast }: { live: Live; team: Team; auth: Auth; toast: (s: string) => void }) {
  const now = useNow(live.offset, 1000);
  const [me, setMe] = useState<[number, number] | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [filter, setFilter] = useState<"near" | "todo" | "mine" | "all">("near");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<{ lat: number; lon: number } | null>(null);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState(CATEGORIES[0]);
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  // follow GPS while the tab is open
  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setMe([p.coords.latitude, p.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const lead = live.leads.find((l) => l.id === sel) || null;
  useEffect(() => {
    setContact(lead?.contact || "");
    setNotes(lead?.notes || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const end = live.settings.field_end ? new Date(live.settings.field_end).getTime() : 0;
  const left = end ? Math.max(0, end - now) : 0;
  const clock = end ? `${Math.floor(left / 3600000)}:${String(Math.floor((left % 3600000) / 60000)).padStart(2, "0")}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}` : "Not started";
  const stats = fieldStats(live.leads, team.id);

  const list = useMemo(() => {
    const ref = me || MAAMIGILI_CENTER;
    // businesses found online have no exact position yet: list them after the located ones
    let ls = live.leads.map((l) => ({ l, d: l.osm_id?.startsWith("web/") ? 1e9 : distanceM(ref, [l.lat, l.lon]) }));
    const term = q.trim().toLowerCase();
    if (term) ls = ls.filter((x) => `${x.l.name} ${x.l.category} ${x.l.notes} ${x.l.contact}`.toLowerCase().includes(term));
    if (filter === "todo") ls = ls.filter((x) => x.l.status === "todo");
    if (filter === "mine") ls = ls.filter((x) => x.l.team_id === team.id);
    if (filter === "all") ls.sort((a, b) => a.l.name.localeCompare(b.l.name));
    else ls.sort((a, b) => a.d - b.d);
    return filter === "near" && !term ? ls.slice(0, 25) : ls;
  }, [live.leads, me, filter, team.id, q]);

  const save = async (status: LeadStatus) => {
    if (!lead) return;
    setBusy(true);
    if (lead.osm_id?.startsWith("web/") && me) {
      await supabase.rpc("refresher_lead_locate", { p_team: auth.team, p_pin: auth.pin, p_id: lead.id, p_lat: me[0], p_lon: me[1] });
    }
    const { error } = await supabase.rpc("refresher_lead_update", { p_team: auth.team, p_pin: auth.pin, p_id: lead.id, p_status: status, p_contact: contact, p_notes: notes });
    setBusy(false);
    if (error) return toast(rpcError(error));
    toast(status === "branded" ? "🎉 Branding updated!" : "Saved ✓");
    if (navigator.vibrate) navigator.vibrate(60);
    live.refresh();
  };
  const add = async () => {
    if (!adding || !newName.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("refresher_lead_add", { p_team: auth.team, p_pin: auth.pin, p_name: newName.trim(), p_category: newCat, p_lat: adding.lat, p_lon: adding.lon });
    setBusy(false);
    if (error) return toast(rpcError(error));
    toast("Business added ✓");
    setAdding(null);
    setNewName("");
    live.refresh();
    if (data) setSel(Number(data));
  };
  const owner = lead?.team_id ? live.teams.find((t) => t.id === lead.team_id) : null;
  const locked = !!lead?.team_id && lead.team_id !== team.id;

  return (
    <>
      <div className="ft-clock">
        <span>⏱ {left === 0 && end ? "Time’s up, head back!" : "Time left"}</span>
        <b>{clock}</b>
      </div>
      <div className="row" style={{ gap: 6, marginBottom: 10, fontSize: 13 }}>
        <span className="chip">✅ {stats.branded} branded (+{stats.branded * 50} pts)</span>
        <span className="chip">👋 {stats.visited} visited</span>
      </div>
      <div className="ft-bar">
        <button
          className={adding ? "on" : ""}
          onClick={() => {
            setSel(null);
            setAdding(adding ? null : { lat: (me || MAAMIGILI_CENTER)[0], lon: (me || MAAMIGILI_CENTER)[1] });
          }}
        >
          ➕ Add business here
        </button>
      </div>

      {adding && (
        <div className="ft-sheet">
          <b>New business</b>
          <p className="dim" style={{ fontSize: 12, margin: "4px 0 8px" }}>
            {me ? "Saved at your current GPS location, so add it while standing at the business." : "Location not available. Allow location access so the business is placed correctly."}
          </p>
          <input className="input" placeholder="Business name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <select className="input" style={{ marginTop: 8 }} value={newCat} onChange={(e) => setNewCat(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <button className="btn primary" style={{ width: "100%", marginTop: 8 }} disabled={busy || !newName.trim()} onClick={add}>
            Add to map
          </button>
        </div>
      )}

      {lead && (
        <div className="ft-sheet">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div>
              <b style={{ fontSize: 18 }}>{lead.name}</b>
              <div className="dim" style={{ fontSize: 12 }}>
                {lead.category}
                {lead.osm_id?.startsWith("web/") ? " · location not pinned yet" : me ? ` · ${Math.round(distanceM(me, [lead.lat, lead.lon]))} m away` : ""}
                {owner ? ` · ${owner.emoji} ${owner.name}` : ""}
              </div>
            </div>
            <a className="btn sm gold" href={
                lead.osm_id?.startsWith("web/")
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ", Maamigili, Maldives")}`
                  : `https://www.google.com/maps/search/?api=1&query=${lead.lat},${lead.lon}`
              } target="_blank" rel="noreferrer">
              📍 Google Maps
            </a>
          </div>
          {locked ? (
            <p style={{ color: "#ffb36b" }}>
              {owner?.emoji} {owner?.name} is handling this business ({STATUS[lead.status].label}).
            </p>
          ) : (
            <>
              <div className="ft-st">
                {(["branded", "visited", "followup", "declined"] as LeadStatus[]).map((k) => (
                  <button key={k} disabled={busy} className={lead.status === k ? "on" : ""} style={{ ["--sc" as any]: STATUS[k].color }} onClick={() => save(k)}>
                    {STATUS[k].icon} {STATUS[k].label}
                  </button>
                ))}
              </div>
              <input className="input" placeholder="Contact person / phone (optional)" value={contact} onChange={(e) => setContact(e.target.value)} />
              <textarea className="input" style={{ marginTop: 6 }} rows={2} placeholder="Notes: what they said, what they need" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <div className="row" style={{ marginTop: 6, flexWrap: "wrap" }}>
                <button className="btn sm" disabled={busy} onClick={() => save(lead.status)}>
                  Save notes
                </button>
                <button
                  className="btn sm"
                  disabled={busy}
                  onClick={async () => {
                    const n = prompt("Business name", lead.name.includes("not mapped") ? "" : lead.name);
                    if (!n || !n.trim()) return;
                    const { error } = await supabase.rpc("refresher_lead_rename", { p_team: auth.team, p_pin: auth.pin, p_id: lead.id, p_name: n.trim() });
                    if (error) return toast(rpcError(error));
                    toast("Name updated ✓");
                    live.refresh();
                  }}
                >
                  ✏️ Rename
                </button>
                {lead.status !== "todo" && !lead.added_by && (
                  <button className="btn sm" disabled={busy} onClick={() => save("todo")}>
                    Undo / release
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="ft-search">
        <input className="input" type="text" enterKeyHint="search" placeholder="🔍 Search businesses (name, type, street, phone)" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && (
          <button className="btn sm" onClick={() => setQ("")}>
            ✕
          </button>
        )}
      </div>
      <div className="ft-bar">
        {(
          [
            ["near", "📍 Nearest"],
            ["todo", "⚪ Not visited"],
            ["mine", "⭐ Ours"],
            ["all", "A–Z"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <div className="ft-list">
        {list.map(({ l, d }) => {
          const t = live.teams.find((x) => x.id === l.team_id);
          return (
            <button key={l.id} className={"ft-item " + (sel === l.id ? "sel" : "")} onClick={() => (setSel(l.id), setAdding(null), window.scrollTo({ top: 0, behavior: "smooth" }))}>
              <span className="ft-dot" style={{ background: STATUS[l.status].color, borderColor: t?.color || "transparent" }} />
              <span style={{ flex: 1 }}>
                <b>{l.name}</b>
                <small>
                  {l.category} · {STATUS[l.status].label}
                  {t ? ` · ${t.emoji}` : ""}
                </small>
              </span>
              <small className="dim">{d >= 1e9 ? "📍?" : d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`}</small>
            </button>
          );
        })}
        {q.trim() && list.length === 0 && (
          <p className="dim">
            No business matches “{q.trim()}”. Not on the list? Tap ➕ Add business here while you’re at the shop.
          </p>
        )}
        {live.leads.length === 0 && <p className="dim">No businesses loaded yet. The trainer can import them, or tap “Add business here” as you find them.</p>}
      </div>
    </>
  );
}

function Roster({ live, team, auth, toast }: { live: Live; team: Team; auth: Auth; toast: (s: string) => void }) {
  const ms = live.members
    .filter((m) => m.team_id === team.id)
    .sort((a, b) => Number(b.is_leader) - Number(a.is_leader) || a.name.localeCompare(b.name));
  const f = ms.filter((m) => m.gender === "Female").length;
  const toggle = async (name: string, present: boolean) => {
    const { error } = await supabase.rpc("refresher_mark_present", { p_team: auth.team, p_pin: auth.pin, p_name: name, p_present: present });
    if (error) return toast(rpcError(error));
    live.refresh();
  };
  const initials = (n: string) =>
    n
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0])
      .join("");
  return (
    <>
      <div className="t-kicker">Your team · {ms.length} people</div>
      <div className="t-title">Find your team members</div>
      <p className="dim" style={{ marginTop: 0, fontSize: 14 }}>
        Call out the names and tap each person as they join your table. {f} women · {ms.length - f} men.
      </p>
      <div className="roster">
        {ms.map((m) => (
          <button key={m.name} className={"r-m " + (m.present ? "here" : "")} onClick={() => toggle(m.name, !m.present)}>
            <span className="r-av">{initials(m.name)}</span>
            <span>
              <b>
                {m.name}
                {m.is_leader ? " ★" : ""}
              </b>
              <small>
                {m.is_leader ? "Team leader · " : ""}
                {m.job} · {m.unit}
              </small>
            </span>
            <span className="r-chk">{m.present ? "✅" : "⬜"}</span>
          </button>
        ))}
        {ms.length === 0 && <p className="dim">The trainer hasn’t assigned members yet.</p>}
      </div>
    </>
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
