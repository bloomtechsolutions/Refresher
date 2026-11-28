"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import { SCENES, Phase } from "./content";

export type Team = { id: number; name: string; leader: string; color: string; emoji: string };
export type State = { scene: string; phase: Phase; opened_at: string | null; data: Record<string, any>; updated_at: string };
export type Resp = { id: number; activity: string; team_id: number; value: string; created_at: string };
export type Answer = { activity: string; team_id: number; choice: number; elapsed_ms: number; answered_at: string };
export type Member = { name: string; gender: string; job: string; unit: string; is_leader: boolean; team_id: number | null; present: boolean };
export type Lead = { id: number; name: string; category: string; lat: number; lon: number; osm_id: string | null; team_id: number | null; status: LeadStatus; contact: string; notes: string; added_by: number | null; updated_at: string };
export type LeadStatus = "todo" | "visited" | "branded" | "declined" | "followup";
export type Challenge = { id: number; team_id: number; assigned_team: number | null; area: string; title: string; details: string; status: "pending" | "approved" | "rejected" | "solved"; trainer_note: string; solution: string; next_step: string; created_at: string; updated_at: string };
export type RaffleEntry = { id: number; name: string; phone: string; added_by: string; created_at: string; won_at: string | null; draw_no: number | null; prize: string };
export type Bonus = { id: number; team_id: number; points: number; reason: string; created_at: string };

export type Live = {
  ready: boolean;
  connected: boolean;
  teams: Team[];
  state: State;
  responses: Resp[];
  answers: Answer[];
  bonus: Bonus[];
  members: Member[];
  settings: Record<string, string>;
  leads: Lead[];
  challenges: Challenge[];
  raffle: RaffleEntry[];
  offset: number; // serverNow - localNow (ms)
  refresh: () => void;
};

const EMPTY_STATE: State = { scene: "welcome", phase: "idle", opened_at: null, data: {}, updated_at: "" };

export function useLive(): Live {
  const [teams, setTeams] = useState<Team[]>([]);
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [responses, setResponses] = useState<Resp[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [bonus, setBonus] = useState<Bonus[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [raffle, setRaffle] = useState<RaffleEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [offset, setOffset] = useState(0);
  const timers = useRef<Record<string, any>>({});

  const loaders = useMemo(
    () => ({
      teams: async () => {
        const { data } = await supabase.from("refresher_teams").select("*").order("id");
        if (data) setTeams(data as Team[]);
      },
      state: async () => {
        const { data } = await supabase.from("refresher_state").select("*").eq("id", 1).single();
        if (data) setState(data as State);
      },
      responses: async () => {
        const { data } = await supabase.from("refresher_responses").select("*").order("id").limit(5000);
        if (data) setResponses(data as Resp[]);
      },
      answers: async () => {
        const { data } = await supabase.from("refresher_answers").select("*").limit(5000);
        if (data) setAnswers(data as Answer[]);
      },
      raffle: async () => {
        const { data } = await supabase.from("refresher_raffle").select("*").order("id").limit(3000);
        if (data) setRaffle(data as RaffleEntry[]);
      },
      challenges: async () => {
        const { data } = await supabase.from("refresher_challenges").select("*").order("id");
        if (data) setChallenges(data as Challenge[]);
      },
      leads: async () => {
        const { data } = await supabase.from("refresher_leads").select("*").order("name").limit(2000);
        if (data) setLeads(data as Lead[]);
      },
      settings: async () => {
        const { data } = await supabase.from("refresher_settings").select("key,value");
        if (data) setSettings(Object.fromEntries((data as { key: string; value: string }[]).map((r) => [r.key, r.value])));
      },
      members: async () => {
        const { data } = await supabase.from("refresher_members").select("name,gender,job,unit,is_leader,team_id,present").order("name");
        if (data) setMembers(data as Member[]);
      },
      bonus: async () => {
        const { data } = await supabase.from("refresher_bonus").select("*").order("id");
        if (data) setBonus(data as Bonus[]);
      },
    }),
    []
  );

  const refresh = () => {
    Object.values(loaders).forEach((f) => f());
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const t0 = Date.now();
      const { data } = await supabase.rpc("refresher_now");
      const t1 = Date.now();
      if (data && alive) setOffset(new Date(data as string).getTime() - (t0 + t1) / 2);
      await Promise.all(Object.values(loaders).map((f) => f()));
      if (alive) setReady(true);
    })();

    // debounce reloads per table so bursts of submissions don't hammer the API
    const reload = (key: keyof typeof loaders) => {
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => loaders[key](), key === "state" ? 0 : 150);
    };

    const ch = supabase
      .channel("refresher-live-" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_state" }, (p: any) => {
        if (p.new && p.new.scene) setState(p.new as State);
        else reload("state");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_responses" }, () => reload("responses"))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_answers" }, () => reload("answers"))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_bonus" }, () => reload("bonus"))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_teams" }, () => reload("teams"))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_members" }, () => reload("members"))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_settings" }, () => reload("settings"))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_leads" }, () => reload("leads"))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_challenges" }, () => reload("challenges"))
      .on("postgres_changes", { event: "*", schema: "public", table: "refresher_raffle" }, () => reload("raffle"))
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    // safety net polling in case a websocket drops on venue Wi-Fi
    const poll = setInterval(() => {
      loaders.state();
      loaders.answers();
      loaders.responses();
      loaders.bonus();
      loaders.members();
      loaders.settings();
      loaders.leads();
      loaders.challenges();
      loaders.raffle();
    }, 6000);

    const fastPoll = setInterval(() => loaders.settings(), 1500);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(fastPoll);
      supabase.removeChannel(ch);
    };
  }, [loaders]);

  return { ready, connected, teams, state, responses, answers, bonus, members, settings, leads, challenges, raffle, offset, refresh };
}

// ───────── scoring
export function quizPoints(sceneId: string, a: Answer | undefined): number {
  if (!a) return 0;
  const s = SCENES.find((x) => x.id === sceneId);
  if (!s || s.type !== "quiz") return 0;
  if (a.choice !== s.answer) return 0;
  const speed = Math.max(0, 1 - a.elapsed_ms / (s.limit * 1000));
  return Math.round(s.points * (0.6 + 0.4 * speed));
}

export const BRANDED_POINTS = 50;

export function scores(live: Pick<Live, "teams" | "answers" | "bonus"> & { leads?: Lead[] }, revealedOnly?: Set<string>) {
  const map = new Map<number, number>();
  live.teams.forEach((t) => map.set(t.id, 0));
  live.answers.forEach((a) => {
    if (revealedOnly && !revealedOnly.has(a.activity)) return;
    map.set(a.team_id, (map.get(a.team_id) || 0) + quizPoints(a.activity, a));
  });
  live.bonus.forEach((b) => map.set(b.team_id, (map.get(b.team_id) || 0) + b.points));
  // field activity: every business that took BML branding earns points automatically
  (live.leads || []).forEach((l) => {
    if (l.status === "branded" && l.team_id) map.set(l.team_id, (map.get(l.team_id) || 0) + BRANDED_POINTS);
  });
  return live.teams
    .map((t) => ({ team: t, score: map.get(t.id) || 0 }))
    .sort((a, b) => b.score - a.score || a.team.id - b.team.id);
}

// The quiz currently open/locked hasn't been revealed yet; hide its points from leaderboards.
export function hiddenActivity(state: State): string | null {
  const s = SCENES.find((x) => x.id === state.scene);
  if (s?.type === "quiz" && state.phase !== "revealed") return s.id;
  return null;
}

export function visibleScores(live: Live) {
  const hidden = hiddenActivity(live.state);
  const filtered = hidden ? { ...live, answers: live.answers.filter((a) => a.activity !== hidden) } : live;
  return scores(filtered);
}

export function useNow(offset: number, every = 250) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() + offset), every);
    return () => clearInterval(t);
  }, [offset, every]);
  return now;
}

export function rpcError(e: any): string {
  const m = (e?.message || String(e)) as string;
  if (m.includes("bad pin")) return "Wrong PIN";
  if (m.includes("not open")) return "This activity isn’t open right now";
  if (m.includes("time up")) return "Time’s up!";
  if (m.includes("duplicate")) return "This phone number is already entered";
  if (m.includes("no entries")) return "No eligible entries left to draw";
  if (m.includes("taken")) return "Another team is already handling this business";
  if (m.includes("limit")) return "Your team has reached the limit for this question";
  return m;
}
