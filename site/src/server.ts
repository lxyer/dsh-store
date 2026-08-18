import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleSite } from "./app.js";

function send(res: ServerResponse, status: number, body: string, type: string): void {
  res.statusCode = status;
  res.setHeader("content-type", type);
  res.end(body);
}

function headerMap(req: IncomingMessage): Record<string, string | undefined> {
  const headers: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    headers[key] = Array.isArray(value) ? value[0] : value;
  }
  return headers;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseJson(raw: string): unknown {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { error: "invalid json" };
  }
}

export function handleHttp(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const run = async (): Promise<void> => {
    let body: unknown;
    if (req.method === "POST") body = parseJson(await readBody(req));
    const result = await handleSite({
      method: req.method ?? "GET",
      url,
      headers: headerMap(req),
      body,
    });
    send(res, result.status, typeof result.body === "string" ? result.body : JSON.stringify(result.body, null, 2), result.type);
  };
  void run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT || 4173);
  createServer(handleHttp).listen(port, "127.0.0.1", () => {
    console.log(`DSH Store site http://127.0.0.1:${port}`);
  });
}
