// Banco em memória só pra desenvolvimento: PORTEIRO_MOCK=1 npm run dev
// Implementa só o pedaço do supabase-js que o app usa, com uma semana de dados inventados.

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

const tables: Record<string, Row[]> = { porteiro_events: [], porteiro_passes: [] };
let nextId = 1;

function seed() {
  const now = Date.now();
  const min = 60_000;
  const day = 24 * 60 * min;
  const apps = ["tiktok", "instagram"];
  // de 7 dias atrás até ontem, algumas sessões por dia em horários de pico
  for (let d = 7; d >= 1; d--) {
    const base = now - d * day;
    const sessions = [
      { h: 8, len: 6 + d },
      { h: 13, len: 12 },
      { h: 22, len: 18 + (d % 3) * 9 },
      { h: 23, len: 8 },
    ];
    sessions.forEach((s, i) => {
      const dayStart = new Date(base);
      dayStart.setUTCHours(s.h + 3, (i * 13) % 60, 0, 0); // +3 = SP pra UTC
      const app = apps[(d + i) % 2];
      tables.porteiro_events.push({ id: nextId++, app, kind: "open", allowed: true, at: new Date(dayStart).toISOString() });
      tables.porteiro_events.push({ id: nextId++, app, kind: "close", allowed: null, at: new Date(dayStart.getTime() + s.len * min).toISOString() });
      if (i === 2) tables.porteiro_events.push({ id: nextId++, app, kind: "open", allowed: false, at: new Date(dayStart.getTime() - 20 * min).toISOString() });
    });
  }
  // hoje: uma sessão de manhã e duas barradas
  const morning = now - 3 * 60 * min;
  tables.porteiro_events.push({ id: nextId++, app: "tiktok", kind: "open", allowed: false, at: new Date(morning - 40 * min).toISOString() });
  tables.porteiro_events.push({ id: nextId++, app: "tiktok", kind: "open", allowed: true, at: new Date(morning).toISOString() });
  tables.porteiro_events.push({ id: nextId++, app: "tiktok", kind: "close", allowed: null, at: new Date(morning + 34 * min).toISOString() });
  tables.porteiro_events.push({ id: nextId++, app: "instagram", kind: "open", allowed: false, at: new Date(now - 30 * min).toISOString() });
  tables.porteiro_passes.push({
    id: nextId++,
    app: "tiktok",
    intent: "Responder DM",
    minutes: 10,
    created_at: new Date(morning - 30_000).toISOString(),
    expires_at: new Date(morning + 10 * min).toISOString(),
  });
}
seed();

type Result = { data: unknown; error: null; count?: number };

class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private sorts: [string, boolean][] = [];
  private lim = Infinity;
  private from = 0;
  private single = false;
  private inserted: Row | null = null;

  constructor(private table: string) {}

  private head = false;
  select(_cols?: string, opts?: { count?: string; head?: boolean }) { this.head = Boolean(opts?.head); return this; }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this; }
  gt(col: string, v: string) { this.filters.push((r) => String(r[col]) > v); return this; }
  gte(col: string, v: string) { this.filters.push((r) => String(r[col]) >= v); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.sorts.push([col, opts?.ascending ?? true]); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.from = a; this.lim = b - a + 1; return this; }
  maybeSingle() { this.single = true; return this; }
  insert(row: Row) {
    this.inserted = { id: nextId++, at: new Date().toISOString(), allowed: null, created_at: new Date().toISOString(), ...row };
    return this;
  }

  private run(): Result {
    if (this.inserted) {
      (tables[this.table] ??= []).push(this.inserted);
      return { data: null, error: null };
    }
    let rows = (tables[this.table] ?? []).filter((r) => this.filters.every((f) => f(r)));
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
