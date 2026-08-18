const SECRET = /(token|secret|password|credential|api[_-]?key|cookie|authorization)=([^\s]+)/gi;
const HOME = /(\/Users\/[^/\s]+|\/home\/[^/\s]+|[A-Za-z]:\\Users\\[^\\\s]+)/g;

export function sanitizeLog(line: string): string {
  return line.replace(SECRET, "$1=***").replace(HOME, "~");
}

export function sanitizeUnknown<T>(value: T): T {
  if (typeof value === "string") return sanitizeLog(value) as T;
  if (Array.isArray(value)) return value.map((item) => sanitizeUnknown(item)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (/(token|secret|password|credential|api[_-]?key|cookie)/i.test(key)) continue;
      out[key] = sanitizeUnknown(item);
    }
    return out as T;
  }
  return value;
}
