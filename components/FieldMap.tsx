"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { Lead, Team } from "@/lib/live";
import { MAAMIGILI_CENTER, STATUS } from "@/lib/field";

type Props = {
  leads: Lead[];
  teams: Team[];
  big?: boolean; // projector styling
  selected?: number | null;
  onSelect?: (id: number) => void;
  me?: [number, number] | null;
  onMapClick?: (lat: number, lon: number) => void;
  satellite?: boolean;
  base?: "street" | "sat" | "vector";
  draft?: [number, number] | null;
};

export default function FieldMap({ leads, teams, big, selected, onSelect, me, onMapClick, satellite, draft, base: baseProp }: Props) {
  const base = baseProp || (big ? "vector" : satellite ? "sat" : "street");
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const L = useRef<any>(null);
  const layer = useRef<any>(null);
  const meLayer = useRef<any>(null);
  const tiles = useRef<{ street?: any; sat?: any; vector?: any }>({});
  const fitted = useRef(false);
  const [ready, setReady] = useState(false);
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  // create the map once (leaflet needs window)
  useEffect(() => {
    let dead = false;
    import("leaflet").then((mod) => {
      if (dead || !el.current || map.current) return;
      const Lf = mod.default || mod;
      L.current = Lf;
      const m = Lf.map(el.current, { zoomControl: !big, attributionControl: true, zoomSnap: 0.25 }).setView(MAAMIGILI_CENTER, 16);
      tiles.current.street = Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      });
      tiles.current.sat = Lf.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: "Imagery © Esri",
      });
      // our own Maamigili map drawn from the OpenStreetMap extract (works without any tile service)
      m.createPane("island");
      m.getPane("island")!.style.zIndex = "250"; // below markers (overlayPane = 400)
      tiles.current.vector = Lf.layerGroup();
      fetch("/maamigili.json")
        .then((r) => r.json())
        .then((gj) => {
          const dark = !!big;
          const st: Record<string, any> = dark
            ? {
                island: { color: "#3fb7c8", weight: 3, fillColor: "#16263d", fillOpacity: 1 },
                green: { stroke: false, fillColor: "#173a30", fillOpacity: 0.9 },
                beach: { stroke: false, fillColor: "#3a3324", fillOpacity: 0.9 },
                road: { color: "#5b6785", weight: 3, opacity: 0.9 },
                runway: { color: "#2b3446", weight: 14, opacity: 1, fillColor: "#2b3446", fillOpacity: 1 },
                building: { color: "#56688f", weight: 0.6, fillColor: "#33425f", fillOpacity: 1 },
              }
            : {
                island: { color: "#7cc4d8", weight: 2, fillColor: "#f4efe2", fillOpacity: 1 },
                green: { stroke: false, fillColor: "#d4e9c6", fillOpacity: 1 },
                beach: { stroke: false, fillColor: "#f3e3b5", fillOpacity: 1 },
                road: { color: "#ffffff", weight: 4, opacity: 1 },
                runway: { color: "#b8bcc4", weight: 12, opacity: 1, fillColor: "#b8bcc4", fillOpacity: 1 },
                building: { color: "#b5ab98", weight: 0.6, fillColor: "#d8cfbe", fillOpacity: 1 },
              };
          const order = ["island", "beach", "green", "runway", "road", "building"];
          order.forEach((k) =>
            Lf.geoJSON({ ...gj, features: gj.features.filter((f: any) => f.properties.k === k) }, { style: () => st[k], interactive: false, pane: "island" }).addTo(tiles.current.vector)
          );
        })
        .catch(() => {});
      layer.current = Lf.layerGroup().addTo(m);
      meLayer.current = Lf.layerGroup().addTo(m);
      m.on("click", (e: any) => clickRef.current?.(e.latlng.lat, e.latlng.lng));
      map.current = m;
      setReady(true);
      setTimeout(() => m.invalidateSize(), 300);
    });
    return () => {
      dead = true;
      map.current?.remove();
      map.current = null;
    };
  }, [big]);

  // base layer
  useEffect(() => {
    if (!ready) return;
    const m = map.current;
    const all = tiles.current;
    (["street", "sat", "vector"] as const).forEach((k) => {
      if (k === base) all[k].addTo(m);
      else m.removeLayer(all[k]);
    });
    if (base === "vector") all.vector.eachLayer?.((l: any) => l.bringToBack?.());
    el.current!.style.background = base === "vector" ? (big ? "#061a2e" : "#a9d6ec") : "#0b1026";
  }, [ready, base, big]);

  // markers
  useEffect(() => {
    if (!ready) return;
    const Lf = L.current;
    layer.current.clearLayers();
    const r = big ? 11 : 9;
    leads.forEach((l) => {
      const team = teams.find((t) => t.id === l.team_id);
      const st = STATUS[l.status];
      const isSel = selected === l.id;
      const mk = Lf.circleMarker([l.lat, l.lon], {
        radius: isSel ? r + 6 : l.status === "branded" ? r + 2 : r,
        color: isSel ? "#ffffff" : team?.color || "#ffffff",
        weight: isSel ? 5 : team ? 4 : 2,
        fillColor: st.color,
        fillOpacity: 0.95,
      });
      mk.bindTooltip(`${st.icon} ${l.name}${team ? " · " + team.name.replace(/^Team /, "") : ""}`, { direction: "top", offset: [0, -8], permanent: big && l.status === "branded" });
      if (onSelect) mk.on("click", () => onSelect(l.id));
      mk.addTo(layer.current);
    });
    if (!fitted.current && big) {
      // projector: always show the whole of Maamigili
      map.current.fitBounds([[3.4695, 72.8275], [3.4825, 72.8455]], { padding: [20, 20] });
      fitted.current = true;
    }
    if (!fitted.current && leads.length) {
      const b = Lf.latLngBounds(leads.map((l) => [l.lat, l.lon]));
      map.current.fitBounds(b.pad(0.15), { maxZoom: 17 });
      fitted.current = true;
    }
  }, [ready, leads, teams, selected, big, onSelect]);

  // my location
  useEffect(() => {
    if (!ready) return;
    meLayer.current.clearLayers();
    if (me) L.current.circleMarker(me, { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("You").addTo(meLayer.current);
    if (draft) L.current.circleMarker(draft, { radius: 13, color: "#fff", weight: 3, dashArray: "4 4", fillColor: "#FFD166", fillOpacity: 0.9 }).bindTooltip("New business", { permanent: true, direction: "top", offset: [0, -10] }).addTo(meLayer.current);
  }, [ready, me, draft]);

  // pan to selection
  useEffect(() => {
    if (!ready || selected == null) return;
    const l = leads.find((x) => x.id === selected);
    if (l) map.current.panTo([l.lat, l.lon]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected]);

  return <div ref={el} className={"fmap " + (big ? "big" : "")} />;
}
