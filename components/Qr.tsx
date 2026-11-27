"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function Qr({ text, size = 220 }: { text: string; size?: number }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(text, { margin: 1, width: size * 2, color: { dark: "#0B1026", light: "#FFFFFF" } }).then(setSrc);
  }, [text, size]);
  return src ? <img src={src} width={size} height={size} alt="QR code" style={{ borderRadius: 16, background: "#fff", padding: 10 }} /> : <div style={{ width: size, height: size }} />;
}
