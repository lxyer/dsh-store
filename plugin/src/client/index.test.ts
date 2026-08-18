import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { assertNoSettingsSection } from "../core/ids.js";

const clientPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "index.js");

function loadClientFactory(): { id: string; exports: { apply: (ctx: unknown) => void; inject: string[] } } {
  const code = fs.readFileSync(clientPath, "utf8");
  const factories = new Map<string, (require: (spec: string) => unknown) => { apply: (ctx: unknown) => void; inject: string[] }>();
  vm.runInNewContext(code, {
    window: {
      __ModuleLoader__: {
        load(handoff: { id: string; factory: (require: (spec: string) => unknown) => { apply: (ctx: unknown) => void; inject: string[] } }) {
          factories.set(handoff.id, handoff.factory);
        },
      },
    },
  });
  assert.equal(factories.size, 1);
  const [id, factory] = [...factories.entries()][0]!;
  const exported = factory((spec) => {
    if (spec === "react") {
      return {
        createElement() {
          return null;
        },
        useEffect() {},
        useMemo(fn: () => unknown) {
          return fn();
        },
        useState<T>(value: T) {
          return [value, () => undefined];
        },
      };
    }
    throw new Error(`unexpected require("${spec}")`);
  });
  return { id, exports: exported };
}

test("served client is a classic ModuleLoader bundle for @dsh-store/plugin", () => {
  const source = fs.readFileSync(clientPath, "utf8");
  assert.match(source, /^window\.__ModuleLoader__\.load\(\{/);
  assert.match(source, /id: "@dsh-store\/plugin"/);
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /^\s*export\s/m);
  assert.doesNotMatch(source, /from\s+["']react["']/);
  // Official arrive() loads this as a classic <script>, not type=module.
  assert.doesNotThrow(() => new Function(source));
  const loaded = loadClientFactory();
  assert.equal(loaded.id, "@dsh-store/plugin");
  assert.deepEqual([...loaded.exports.inject], ["slots", "locale"]);
  assert.equal(typeof loaded.exports.apply, "function");
});

test("client apply registers only settings.plugins.tab", () => {
  const loaded = loadClientFactory();
  const registrations: Array<{ slot: string; id?: string }> = [];
  loaded.exports.apply({
    slots: {
      inject(name: string, factory: () => unknown) {
        factory();
        return () => undefined;
      },
      register(options: { name: string; id?: string }) {
        registrations.push({ slot: options.name, id: options.id });
        return options;
      },
    },
    locale: {
      getLocale() {
        return { active: "zh" as const };
      },
    },
    effect() {},
  });
  assert.deepEqual(
    registrations.map((item) => item.slot),
    ["settings.plugins.tab", "settings.plugins.tab", "settings.plugins.tab"],
  );
  assert.deepEqual(
    registrations.map((item) => item.id),
    ["store", "installed", "gaps"],
  );
  assertNoSettingsSection(registrations);
});
