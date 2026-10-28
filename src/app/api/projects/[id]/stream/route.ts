import { handle } from "@/server/auth";
import { projectFor, type Ctx } from "@/server/route-helpers";
import { subscribe } from "@/server/ai/runner";
import type { AgentEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Server-sent events for the project's current (or last) agent run. Replays events so far, then streams live. */
export const GET = handle(async (req: Request, ctx: Ctx<{ id: string }>) => {
  const { project } = await projectFor(ctx);
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (ev: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
          if (ev.type === "done") {
            cleanup();
            controller.close();
          }
        } catch {
          cleanup();
        }
      };
      const sub = subscribe(project.id, send);
      if (!sub) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "idle" })}\n\n`));
        controller.close();
        return;
      }
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 15000);
      cleanup = () => {
        clearInterval(ping);
        sub.unsubscribe();
      };
      req.signal.addEventListener("abort", () => cleanup());
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/event-stream", "cache-control": "no-cache, no-transform", connection: "keep-alive" },
  });
});
