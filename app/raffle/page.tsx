"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { rpcError, useLive } from "@/lib/live";

const KEY = "bml-refresher-raffle-pin";

// Staff entry screen for the SME raffle: name + phone, open to the trainer PIN or any team PIN.
export default function RaffleEntryPage() {
  const live = useLive();
  const [pin, setPin] = useState<string | null>(null);
  const [who, setWho] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [q, setQ] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem(KEY);
      if (p) check(p);
    } catch {}
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  async function check(p: string) {
    const { data } = await supabase.rpc("refresher_staff_who", { p_pin: p.trim() });
    if (!data) {
      setErr("Wrong PIN");
      try {
        localStorage.removeItem(KEY);
      } catch {}
      return;
    }
    try {
      localStorage.setItem(KEY, p.trim());
    } catch {}
    setPin(p.trim());
    setWho(String(data));
  }

  const add = async () => {
    if (!pin || !name.trim() || !phone.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("refresher_raffle_add", { p_pin: pin, p_name: name.trim(), p_phone: phone.trim() });
    setBusy(false);
    if (error) {
      const m = rpcError(error);
      return setToast(m.includes("invalid") ? "Enter a name and a valid phone number" : m);
    }
    setToast(`✓ ${name.trim()} entered`);
    setName("");
    setPhone("");
    live.refresh();
    nameRef.current?.focus();
  };
  const del = async (id: number, label: string) => {
    if (!pin || !confirm(`Remove ${label} from the draw?`)) return;
    const { error } = await supabase.rpc("refresher_raffle_delete", { p_pin: pin, p_id: id });
    if (error) setToast(rpcError(error));
    live.refresh();
  };

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return [...live.raffle].reverse().filter((e) => !t || e.name.toLowerCase().includes(t) || e.phone.includes(t));
  }, [live.raffle, q]);

  if (!loaded) return <main className="app" />;
  if (!pin)
    return (
      <main className="app">
        <div className="login">
          <div className="kicker" style={{ fontSize: 13 }}>
            SME raffle
          </div>
          <h1>Staff entry</h1>
          <p className="dim">Enter the trainer PIN or your team PIN.</p>
          <input className="input" type="password" inputMode="numeric" placeholder="PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && check(pinInput)} />
          {err && <p style={{ color: "#ff8fa3" }}>{err}</p>}
          <button className="btn primary" style={{ width: "100%", marginTop: 12, padding: 14 }} onClick={() => check(pinInput)}>
            Continue
          </button>
        </div>
      </main>
    );

  return (
    <main className="app">
      <div className="team-app">
        <div className="t-head" style={{ ["--c" as any]: "#E4002B" }}>
          <span className="em">🎟️</span>
          <div>
            <b>SME raffle entries</b>
            <small>
              Signed in as {who === "trainer" ? "trainer" : who.replace("team", "Team ")} ·{" "}
              <a
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => {
                  try {
                    localStorage.removeItem(KEY);
                  } catch {}
                  setPin(null);
                }}
              >
                sign out
              </a>
            </small>
          </div>
          <div className="t-score">
            <b>{live.raffle.length}</b>
            <small className="dim"> entries</small>
          </div>
        </div>

        <div className="cp-form" style={{ marginTop: 14 }}>
          <input ref={nameRef} className="input" placeholder="Participant name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" type="tel" inputMode="tel" placeholder="Phone number, e.g. 7771234" autoComplete="off" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <button className="btn primary" style={{ padding: 14 }} disabled={busy || !name.trim() || !phone.trim()} onClick={add}>
            ➕ Add to the draw
          </button>
        </div>

        <input className="input" style={{ marginTop: 14 }} placeholder="🔍 Search entries" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="rf-entry-list">
          {list.map((e) => (
            <div key={e.id} className="rf-entry">
              <span style={{ flex: 1 }}>
                <b>
                  {e.won_at ? "🏆 " : ""}
                  {e.name}
                </b>
                <small>
                  {e.phone}
                  {e.won_at ? ` · winner of draw #${e.draw_no}${e.prize ? ` · 🎁 ${e.prize}` : ""}` : ""}
                </small>
              </span>
              {!e.won_at && (
                <button className="btn sm" onClick={() => del(e.id, e.name)}>
                  ✕
                </button>
              )}
            </div>
          ))}
          {live.raffle.length === 0 && <p className="dim">No entries yet.</p>}
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
    </main>
  );
}
