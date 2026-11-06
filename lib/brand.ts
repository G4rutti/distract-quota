// Marca do Porteiro: uma porta em arco cujo topo é um mostrador.
// O setor preenchido vai de 0 a 60 graus, que no relógio de segundos são os 10s de espera.
// Tudo num viewBox 0 0 64 64, pra o ícone do app, a landing e a extensão usarem o mesmo desenho.

export const BRAND = {
  accent: "#2F7BEF",
  ink: "#0D0F13",
  paper: "#FBFCFD",
};

export const MARK = {
  viewBox: "0 0 64 64",
  /** Batente da porta (stroke). */
  frame: "M13 59V31a19 19 0 0 1 38 0v28",
  frameWidth: 8.5,
  /** Centro do mostrador e raio do setor. */
  cx: 32,
  cy: 31,
  r: 11.5,
};

/** Setor do mostrador de 0 até `deg` graus (sentido horário, a partir das 12h). */
export function sectorPath(deg: number, { cx, cy, r } = MARK): string {
  const d = Math.max(0.01, Math.min(359.99, deg));
  const a = (d * Math.PI) / 180;
  const x = cx + Math.sin(a) * r;
  const y = cy - Math.cos(a) * r;
  const large = d > 180 ? 1 : 0;
  return `M${cx} ${cy}V${cy - r}A${r} ${r} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)}Z`;
}
