import { parse } from "yaml";

export function parseYaml<T = unknown>(text: string): T {
  return parse(text) as T;
}

export { parse };
