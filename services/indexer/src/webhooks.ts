import fs from "node:fs";
import path from "node:path";

type IndexedEvent = {
  id: string;
  signature: string;
  slot: number;
  name: string;
  createdAtUnix: number;
  payload: Record<string, unknown>;
};

type ProjectedReadModel = {
  lastSlot: number;
  eventCount: number;
  totalsByEvent: Record<string, number>;
};

const DATA_DIR = path.join(process.cwd(), ".indexer");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const READ_MODEL_FILE = path.join(DATA_DIR, "read-model.json");

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, "[]", "utf8");
  }

  if (!fs.existsSync(READ_MODEL_FILE)) {
    const initialReadModel: ProjectedReadModel = {
      lastSlot: 0,
      eventCount: 0,
      totalsByEvent: {},
    };
    fs.writeFileSync(READ_MODEL_FILE, JSON.stringify(initialReadModel, null, 2), "utf8");
  }
}

function readEvents(): IndexedEvent[] {
  ensureStorage();
  return JSON.parse(fs.readFileSync(EVENTS_FILE, "utf8")) as IndexedEvent[];
}

function writeEvents(events: IndexedEvent[]): void {
  ensureStorage();
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), "utf8");
}

function writeReadModel(readModel: ProjectedReadModel): void {
  ensureStorage();
  fs.writeFileSync(READ_MODEL_FILE, JSON.stringify(readModel, null, 2), "utf8");
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

function createEventId(): string {
  return `evt-${Math.random().toString(36).slice(2, 12)}`;
}

export function normalizeEvent(raw: unknown): IndexedEvent {
  const parsed = (raw ?? {}) as Record<string, unknown>;
  return {
    id: createEventId(),
    signature: String(parsed.signature ?? ""),
    slot: Number(parsed.slot ?? 0),
    name: String(parsed.name ?? "unknown"),
    createdAtUnix: nowUnix(),
    payload: (parsed.payload ?? {}) as Record<string, unknown>,
  };
}

export function ingestEvent(raw: unknown): IndexedEvent {
  const event = normalizeEvent(raw);
  const events = readEvents();
  events.push(event);
  writeEvents(events);

  const readModel: ProjectedReadModel = {
    lastSlot: event.slot,
    eventCount: events.length,
    totalsByEvent: events.reduce<Record<string, number>>((accumulator, entry) => {
      accumulator[entry.name] = (accumulator[entry.name] ?? 0) + 1;
      return accumulator;
    }, {}),
  };
  writeReadModel(readModel);

  return event;
}

if (process.env.NODE_ENV !== "test") {
  console.log("Indexer ready: webhook ingestion persists events and projects a read model.");
}
