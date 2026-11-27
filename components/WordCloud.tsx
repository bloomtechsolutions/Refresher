"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Resp, Team } from "@/lib/live";

type Word = { key: string; text: string; count: number; color: string; teams: Set<number> };

function normalise(s: string) {
  return s.trim().replace(/\s+/g, " ").replace(/[.!?,;:]+$/, "");
}

export function groupWords(responses: Resp[], teams: Team[]): Word[] {
  const m = new Map<string, Word>();
  for (const r of responses) {
    const text = normalise(r.value);
    if (!text) continue;
    const key = text.toLowerCase();
    const w = m.get(key) || { key, text, count: 0, color: "", teams: new Set<number>() };
    w.count++;
    w.teams.add(r.team_id);
    m.set(key, w);
  }
  const words = [...m.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
  const pal = ["#FFFFFF", "#FFD166", "#7FDBFF", "#FF8FA3", "#B9A6FF", "#8EF0B0", "#FFB36B"];
  words.forEach((w, i) => {
    const first = [...w.teams][0];
    const t = teams.find((x) => x.id === first);
    w.color = i === 0 ? "#FFFFFF" : w.teams.size > 1 ? pal[i % pal.length] : t?.color || pal[i % pal.length];
  });
  return words;
}

type Placed = { w: Word; x: number; y: number; size: number; rot: number; bw: number; bh: number };

// Archimedean spiral placement with rectangle collision.
function layout(words: Word[], W: number, H: number, scale: number, ctx: CanvasRenderingContext2D): Placed[] {
  const max = Math.max(1, ...words.map((w) => w.count));
  const placed: Placed[] = [];
  const minF = 18 * scale;
  const maxF = Math.min(110 * scale, W / 7);
  for (const w of words.slice(0, 90)) {
    let size = minF + (maxF - minF) * Math.sqrt((w.count - 0) / max);
    if (words.length < 6) size = Math.max(size, maxF * 0.6);
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      ctx.font = `800 ${size}px Outfit, system-ui, sans-serif`;
      const tw = ctx.measureText(w.text).width;
      const rot = placed.length > 0 && w.text.length < 12 && hash(w.key) % 5 === 0 ? 90 : 0;
      const bw = (rot ? size * 1.05 : tw) + 14 * scale;
      const bh = (rot ? tw : size * 1.05) + 6 * scale;
      for (let t = 0; t < 1400; t++) {
        const a = 0.35 * t;
        const r = 2.2 * scale * a;
        const x = W / 2 + r * Math.cos(a) * (W / H) * 0.9 - bw / 2;
        const y = H / 2 + r * Math.sin(a) - bh / 2;
        if (x < 0 || y < 0 || x + bw > W || y + bh > H) continue;
        if (placed.some((p) => x < p.x + p.bw && x + bw > p.x && y < p.y + p.bh && y + bh > p.y)) continue;
        placed.push({ w, x, y, size, rot, bw, bh });
        ok = true;
        break;
      }
      size *= 0.8;
    }
  }
  return placed;
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export default function WordCloud({ responses, teams, scale = 1 }: { responses: Resp[]; teams: Team[]; scale?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const words = useMemo(() => groupWords(responses, teams), [responses, teams]);
  const placed = useMemo(() => {
    if (!box.w || typeof document === "undefined") return [];
    const ctx = document.createElement("canvas").getContext("2d")!;
    const s = scale * Math.min(1, box.w / 1400 + 0.25);
    return layout(words, box.w, box.h, s, ctx);
  }, [words, box, scale]);

  return (
    <div ref={ref} className="cloud">
      {placed.map((p) => (
        <span
          key={p.w.key}
          className="cloud-word"
          title={`${p.w.count} × · ${p.w.teams.size} team(s)`}
          style={{
            left: p.x + p.bw / 2,
            top: p.y + p.bh / 2,
            fontSize: p.size,
            color: p.w.color,
            transform: `translate(-50%,-50%) rotate(${p.rot}deg)`,
            textShadow: `0 0 ${p.size / 3}px ${p.w.color}55`,
          }}
        >
          {p.w.text}
        </span>
      ))}
      {words.length === 0 && <div className="cloud-empty">Waiting for your feedback…</div>}
    </div>
  );
}
