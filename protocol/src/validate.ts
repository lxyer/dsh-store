import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface ErrorObject {
  instancePath?: string;
  message?: string;
}

interface ValidateFunction {
  (data: unknown): boolean;
  errors?: ErrorObject[] | null;
}

interface AjvInstance {
  addSchema(schema: object): unknown;
  getSchema(id: string): ValidateFunction | undefined;
}

export type SchemaName =
  | "plugin"
  | "plugin-version"
  | "passport"
  | "pack"
  | "pack-lock"
  | "install-target"
  | "capability"
  | "search-query"
  | "review";

export interface ValidationResult {
  ok: boolean;
  errors: ErrorObject[];
}

const schemaFiles = [
  "ids.json",
  "capability.json",
  "install-target.json",
  "plugin-version.json",
  "plugin.json",
  "passport.json",
  "pack.json",
  "pack-lock.json",
  "search-query.json",
  "review.json",
] as const;

const validators = new Map<SchemaName, ValidateFunction>();
let ajv: AjvInstance | undefined;
let loadFailed = false;

function loadEngine(): AjvInstance | undefined {
  if (ajv) return ajv;
  if (loadFailed) return undefined;
  try {
    if (!import.meta.url) {
      loadFailed = true;
      return undefined;
    }
    const require = createRequire(import.meta.url);
    const Ajv2020 = require("ajv/dist/2020.js");
    const addFormats = require("ajv-formats");
    const schemaDir = join(dirname(fileURLToPath(import.meta.url)), "../schemas");
    const engine = new Ajv2020({
      allErrors: true,
      strict: false,
      validateFormats: true,
    }) as AjvInstance;
    addFormats(engine);
    for (const file of schemaFiles) {
      engine.addSchema(JSON.parse(readFileSync(join(schemaDir, file), "utf8")) as Record<string, unknown>);
    }
    ajv = engine;
    return engine;
  } catch {
    loadFailed = true;
    return undefined;
  }
}

function validatorFor(name: SchemaName): ValidateFunction | undefined {
  const cached = validators.get(name);
  if (cached) return cached;
  const engine = loadEngine();
  if (!engine) return undefined;
  const validateFn = engine.getSchema(`https://store.dsh.dev/protocol/${name}.json`);
  if (!validateFn) {
    throw new Error(`schema not registered: ${name}`);
  }
  validators.set(name, validateFn);
  return validateFn;
}

export function validate(name: SchemaName, data: unknown): ValidationResult {
  const validateFn = validatorFor(name);
  if (!validateFn) return { ok: true, errors: [] };
  const ok = validateFn(data);
  return {
    ok: Boolean(ok),
    errors: ok ? [] : (validateFn.errors ?? []),
  };
}

export function assertValid(name: SchemaName, data: unknown): void {
  const result = validate(name, data);
  if (!result.ok) {
    const details = result.errors
      .map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`)
      .join("; ");
    throw new Error(`${name} failed validation: ${details}`);
  }
}
