"use client";
import { useEffect } from "react";
import SceneView, { Stage } from "@/components/SceneView";
import { useLive } from "@/lib/live";

export default function ScreenPage() {
  const live = useLive();
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, cursor: "none" }} onDoubleClick={() => document.documentElement.requestFullscreen().catch(() => {})}>
      <Stage>{live.ready ? <SceneView live={live} /> : <div className="screen" />}</Stage>
    </div>
  );
}
