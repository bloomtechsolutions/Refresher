import type { Lead, LeadStatus, Team } from "./live";

// Adh. Maamigili (Alif Dhaal Atoll). Map fits to the businesses once loaded.
export const MAAMIGILI_CENTER: [number, number] = [3.4765, 72.8375];
// south, west, north, east – Maamigili only (excludes the Dhiffushi resort island to the west)
export const MAAMIGILI_BBOX = [3.466, 72.829, 3.486, 72.849];
export const FIELD_MINUTES = 120;

export const STATUS: Record<LeadStatus, { label: string; color: string; icon: string }> = {
  todo: { label: "Not visited", color: "#8892B0", icon: "⚪" },
  visited: { label: "Visited", color: "#38BDF8", icon: "👋" },
  branded: { label: "Branding updated", color: "#22C55E", icon: "✅" },
  followup: { label: "Follow-up needed", color: "#FFB020", icon: "🔁" },
  declined: { label: "Declined", color: "#FF5A5F", icon: "✖️" },
};
export const STATUS_ORDER: LeadStatus[] = ["branded", "visited", "followup", "declined", "todo"];

export const CATEGORIES = ["Shop", "Guesthouse", "Café / Restaurant", "Hardware", "Pharmacy", "Workshop", "Office", "Other business"];

function categorise(tags: Record<string, string>): string {
  if (tags.tourism && /guest_house|hotel|hostel|apartment|resort|motel/.test(tags.tourism)) return "Guesthouse";
  if (tags.amenity && /cafe|restaurant|fast_food|bar/.test(tags.amenity)) return "Café / Restaurant";
  if (tags.amenity === "pharmacy" || tags.shop === "chemist") return "Pharmacy";
  if (tags.shop && /hardware|doityourself|building/.test(tags.shop)) return "Hardware";
  if (tags.shop) return "Shop";
  if (tags.craft) return "Workshop";
  if (tags.office) return "Office";
  return "Other business";
}

// Runs in the browser (phones/laptops have internet; works without any server).
export async function fetchOsmBusinesses() {
  const [s, w, n, e] = MAAMIGILI_BBOX;
  const bb = `${s},${w},${n},${e}`;
  const q = `[out:json][timeout:25];(
    nwr["shop"](${bb});
    nwr["tourism"~"guest_house|hotel|hostel|apartment|motel"](${bb});
    nwr["amenity"~"cafe|restaurant|fast_food|pharmacy|marketplace|fuel|clinic|doctors|bar"](${bb});
    nwr["office"](${bb});
    nwr["craft"](${bb});
  );out center tags;`;
  const mirrors = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  let lastErr: unknown;
  for (const url of mirrors) {
    try {
      const r = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      return (j.elements as any[])
        .map((el) => {
          const tags = el.tags || {};
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          const name = tags.name || tags["name:en"] || tags.brand || "";
          return { osm_id: `${el.type}/${el.id}`, name, category: categorise(tags), lat, lon };
        })
        .filter((x) => x.name && typeof x.lat === "number" && typeof x.lon === "number");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export function leadsCsv(leads: Lead[], teams: Team[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Business", "Category", "Status", "Team", "Contact", "Notes", "Latitude", "Longitude", "Last update"];
  const rows = leads.map((l) => [
    l.name,
    l.category,
    STATUS[l.status].label,
    teams.find((t) => t.id === l.team_id)?.name || "",
    l.contact,
    l.notes,
    l.lat,
    l.lon,
    new Date(l.updated_at).toLocaleString(),
  ]);
  return [head, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function downloadText(name: string, text: string, type = "text/csv") {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function distanceM(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b[0] - a[0]);
  const dLon = toR(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function fieldStats(leads: Lead[], teamId: number) {
  const mine = leads.filter((l) => l.team_id === teamId);
  return {
    branded: mine.filter((l) => l.status === "branded").length,
    visited: mine.filter((l) => l.status !== "todo").length,
    followup: mine.filter((l) => l.status === "followup").length,
  };
}
