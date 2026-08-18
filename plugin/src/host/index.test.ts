import assert from "node:assert/strict";
import test from "node:test";
import { apply } from "./index.js";

type ToolRuntime = { register(definition: unknown): () => void };

function cordisLike(getTools?: ToolRuntime) {
  const calls: { label?: string; factory: () => unknown }[] = [];
  const ctx = {
    webServer: {
      register() {
        return () => undefined;
      },
    },
    get(name: string) {
      return name === "tools" ? getTools : undefined;
    },
    effect(factory: () => unknown, label?: string) {
      calls.push({ factory, label });
    },
  };
  Object.defineProperty(ctx, "tools", {
    get() {
      throw new Error('cannot get property "tools" without inject');
    },
  });
  return { ctx, calls };
}

test("host apply does not read undeclared ctx.tools", () => {
  const { ctx, calls } = cordisLike();
  assert.doesNotThrow(() => apply(ctx));
  for (const call of calls) assert.doesNotThrow(() => call.factory());
});

test("host apply keeps routes by returning the register disposer from effect", () => {
  let registered = 0;
  let disposed = 0;
  const { ctx, calls } = cordisLike();
  ctx.webServer.register = () => {
    registered += 1;
    return () => {
      disposed += 1;
    };
  };
  apply(ctx);
  assert.equal(registered, 0);
  assert.equal(calls[0]?.label, "dsh-store: routes");
  const dispose = calls[0]?.factory();
  assert.equal(registered, 1);
  assert.equal(typeof dispose, "function");
  (dispose as () => void)();
  assert.equal(disposed, 1);
});
