import type { ProfileSnapshot } from "./activation.js";
import { isUserDshHome } from "./isolate.js";
import { persistJournalEntry } from "./persist.js";
import { nextId, type JournalEntry, type JobRecord, type LocalStore } from "./store.js";

export function snapshotProfile(profile: ProfileSnapshot): JournalEntry["before"] {
  return {
    bundles: [...profile.bundles],
    dependencies: { ...profile.dependencies },
  };
}

export function writeJournal(
  store: LocalStore,
  input: Omit<JournalEntry, "journalId" | "at" | "persisted" | "mutatesHome" | "rollbackRef">,
): JournalEntry {
  const previous = store.journal.at(-1);
  const entry: JournalEntry = {
    ...input,
    journalId: nextId("jrnl", store.now()),
    at: new Date(store.now()).toISOString(),
    rollbackRef: previous?.journalId,
    persisted: Boolean(store.stateDir),
    mutatesHome: Boolean(store.dshHome && isUserDshHome(store.dshHome) && store.profile.profile === "web"),
  };
  store.journal.push(entry);
  if (store.stateDir) persistJournalEntry(store.stateDir, entry);
  return entry;
}

export function applySnapshot(store: LocalStore, snapshot: JournalEntry["before"]): void {
  store.profile.bundles = [...snapshot.bundles];
  store.profile.dependencies = { ...snapshot.dependencies };
}

export function latestJournal(store: LocalStore, action?: JobRecord["action"]): JournalEntry | undefined {
  return [...store.journal].reverse().find((entry) => (action ? entry.action === action : true));
}
