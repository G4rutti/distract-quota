// Banco em memória só pra desenvolvimento: PORTEIRO_MOCK=1 npm run dev
// Implementa só o pedaço do supabase-js que o app usa, com duas semanas de dados inventados.
// Fica no globalThis pra página, rota de API e server action enxergarem os mesmos dados no dev.

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;
type Store = { tables: Record<string, Row[]>; nextId: number };

const g = globalThis as unknown as { __porteiroMock?: Store };
const store: Store = (g.__porteiroMock ??= seed());

function seed(): Store {
  const s: Store = {
    tables: { porteiro_events: [], porteiro_passes: [], porteiro_diary: [], saude: [], treinos: [], treinos_relogio: [] },
    nextId: 1,
  };
  const ev = s.tables.porteiro_events;
  const now = Date.now();
  const min = 60_000;
  const day = 24 * 60 * min;
  const apps = ["tiktok", "instagram", "twitter"];
  const key = (t: number) => new Date(t - 3 * 60 * min).toISOString().slice(0, 10); // SP = UTC-3

  // 13 dias atrás até ontem; o uso cai com o tempo, pra ter tendência
  for (let d = 13; d >= 1; d--) {
    const base = now - d * day;
    const scale = 0.55 + d * 0.06;
    [
      { h: 8, len: 10 },
      { h: 13, len: 18 },
      { h: 22, len: 35 + (d % 3) * 12 },
      { h: 23, len: 15 },
    ].forEach((x, i) => {
      const t = new Date(base);
      t.setUTCHours(x.h + 3, (i * 13) % 60, 0, 0);
      const app = apps[(d + i) % 3];
      if (i === 2) ev.push({ id: s.nextId++, app, kind: "open", allowed: false, at: new Date(t.getTime() - 25 * min).toISOString() });
      ev.push({ id: s.nextId++, app, kind: "open", allowed: true, at: t.toISOString() });
      ev.push({ id: s.nextId++, app, kind: "close", allowed: null, at: new Date(t.getTime() + x.len * scale * min).toISOString() });
    });
    if (d % 2) ev.push({ id: s.nextId++, app: "tiktok", kind: "open", allowed: false, at: new Date(base - 2 * 60 * min).toISOString() });

    const k = key(base);
    s.tables.saude.push({ dia: k, sono_min: 330 + ((d * 37) % 140), passos: 3000 + ((d * 1931) % 9000) });
    if (d % 3 !== 0) s.tables.treinos.push({ dia: k, titulo: ["Puxar", "Empurrar", "Perna"][d % 3], dur_s: 3600 });
    if (d % 4 === 1) s.tables.treinos_relogio.push({ dia: k, tipo: "Corrida", duracao_min: 28 });
    if (d <= 9) s.tables.porteiro_diary.push({ dia: k, humor: 1 + ((d * 3) % 5), energia: 1 + ((d * 2) % 5) });
  }

  // hoje: uma sessão de manhã e duas barradas
  const morning = now - 3 * 60 * min;
  ev.push({ id: s.nextId++, app: "tiktok", kind: "open", allowed: false, at: new Date(morning - 40 * min).toISOString() });
  ev.push({ id: s.nextId++, app: "tiktok", kind: "open", allowed: true, at: new Date(morning).toISOString() });
  ev.push({ id: s.nextId++, app: "tiktok", kind: "close", allowed: null, at: new Date(morning + 34 * min).toISOString() });
  ev.push({ id: s.nextId++, app: "instagram", kind: "open", allowed: false, at: new Date(now - 30 * min).toISOString() });
  s.tables.porteiro_passes.push(
    { id: s.nextId++, app: "tiktok", intent: "Responder DM", minutes: 10, created_at: new Date(morning - 30_000).toISOString(), expires_at: new Date(morning + 10 * min).toISOString() },
    { id: s.nextId++, app: "instagram", intent: "Postar algo", minutes: 15, created_at: new Date(now - day - 5 * 60 * min).toISOString(), expires_at: new Date(now - day - 4.75 * 60 * min).toISOString() },
  );
  ev.sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return s;
}

type Result = { data: unknown; error: null; count?: number };

class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private sorts: [string, boolean][] = [];
  private lim = Infinity;
  private from = 0;
  private single = false;
  private head = false;
  private inserted: Row | null = null;
  private upserted: { row: Row; key: string } | null = null;

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) { this.head = Boolean(opts?.head); return this; }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this; }
  gt(col: string, v: string) { this.filters.push((r) => String(r[col]) > v); return this; }
  gte(col: string, v: string) { this.filters.push((r) => String(r[col]) >= v); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.sorts.push([col, opts?.ascending ?? true]); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.from = a; this.lim = b - a + 1; return this; }
  maybeSingle() { this.single = true; return this; }
  insert(row: Row) {
    this.inserted = { id: store.nextId++, at: new Date().toISOString(), allowed: null, created_at: new Date().toISOString(), ...row };
    return this;
  }
  upsert(row: Row, opts?: { onConflict?: string }) {
    this.upserted = { row, key: opts?.onConflict ?? "id" };
    return this;
  }

  private run(): Result {
    const t = (store.tables[this.table] ??= []);
    if (this.inserted) {
      t.push(this.inserted);
      return { data: null, error: null };
    }
    if (this.upserted) {
      const { row, key } = this.upserted;
      const i = t.findIndex((r) => r[key] === row[key]);
      if (i >= 0) t[i] = { ...t[i], ...row };
      else t.push(row);
      return { data: null, error: null };
    }
    let rows = t.filter((r) => this.filters.every((f) => f(r)));
    rows = [...rows].sort((x, y) => {
      for (const [col, asc] of this.sorts) {
        const a = x[col] as string | number;
        const b = y[col] as string | number;
        if (a !== b) return (a < b ? -1 : 1) * (asc ? 1 : -1);
      }
      return 0;
    });
    if (this.head) return { data: null, error: null, count: rows.length };
    rows = rows.slice(this.from, this.from + this.lim);
    return { data: this.single ? rows[0] ?? null : rows, error: null };
  }

  then<T1 = Result, T2 = never>(
    ok?: ((v: Result) => T1 | PromiseLike<T1>) | null,
    fail?: ((e: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.run()).then(ok, fail);
  }
}

export const mockClient = { from: (table: string) => new Query(table) };
