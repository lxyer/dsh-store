import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { JournalEntry, LocalReview } from "./store.js";

export function persistJournalEntry(stateDir: string, entry: JournalEntry): void {
  const dir = join(stateDir, "journal");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${entry.journalId}.json`), `${JSON.stringify(entry, null, 2)}\n`);
}

export function loadJournalEntries(stateDir: string): JournalEntry[] {
  const dir = join(stateDir, "journal");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")) as JournalEntry);
}

export function persistReviews(stateDir: string, reviews: LocalReview[]): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, "reviews.json"), `${JSON.stringify(reviews, null, 2)}\n`);
}

export function loadReviews(stateDir: string): LocalReview[] {
  const file = join(stateDir, "reviews.json");
  if (!existsSync(file)) return [];
  return JSON.parse(readFileSync(file, "utf8")) as LocalReview[];
}
