import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Uma catraca vista de cima: barra de passagem + pino. Só formas, sem letra.
export function mark(px: number) {
  const s = px / 512;
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#14161a" }}>
      <div style={{ position: "relative", width: 300 * s, height: 300 * s, display: "flex" }}>
        <div style={{ position: "absolute", left: 0, top: 120 * s, width: 300 * s, height: 60 * s, borderRadius: 30 * s, background: "#c6f24a" }} />
        <div style={{ position: "absolute", left: 105 * s, top: 105 * s, width: 90 * s, height: 90 * s, borderRadius: 45 * s, background: "#14161a", border: `${18 * s}px solid #c6f24a` }} />
      </div>
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(mark(512), size);
}
