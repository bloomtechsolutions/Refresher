"use client";
import { useEffect, useRef, useState } from "react";
import SceneView, { Stage } from "@/components/SceneView";
import { useLive } from "@/lib/live";

export default function ScreenPage() {
  const live = useLive();
  const [full, setFull] = useState(false);
  const [awake, setAwake] = useState(true);
  const idle = useRef<any>(null);

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggle();
    };
    // show the button (and cursor) while the mouse moves; hide after 2.5s of stillness
    const wake = () => {
      setAwake(true);
      clearTimeout(idle.current);
      idle.current = setTimeout(() => setAwake(false), 2500);
    };
    wake();
    document.addEventListener("fullscreenchange", onFs);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousemove", wake);
    window.addEventListener("touchstart", wake);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("touchstart", wake);
      clearTimeout(idle.current);
    };
  }, []);

  const showBtn = !full || awake;
  return (
    <div style={{ position: "fixed", inset: 0, cursor: awake ? "default" : "none" }} onDoubleClick={toggle}>
      <Stage>{live.ready ? <SceneView live={live} /> : <div className="screen" />}</Stage>
      <button className={"fs-btn " + (showBtn ? "" : "hide")} onClick={toggle} title="Full screen (F)">
        {full ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
          </svg>
        )}
        <span>{full ? "Exit full screen" : "Full screen"}</span>
      </button>
    </div>
  );
}
