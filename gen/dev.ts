import { serveDir } from "@std/http/file-server";
import { ServerSentEventStream } from "@std/http/server-sent-event-stream";
import { debounce } from "@std/async/debounce";
import { DOMParser } from "@b-fuze/deno-dom";
import build from "./build.ts";

await build();

const RELOAD_SNIPPET = "new EventSource('/event').addEventListener('change', () => location.reload()); console.info('Listening for live updates')";

let notify: (()=>void)|undefined;

const on_changed = debounce(async () => {
  try {
    await build();
  } catch (e) {
    console.error(`Build failure: ${e}`);
  }
  notify?.();
}, 200);

(async function watch() {
  for await (const event of Deno.watchFs(["gen","md"])) {
    if (event.kind !== "access" && event.kind !== "any" && !event.paths[0].endsWith(".ts")) {
      on_changed();
    }
  }
})();

const parser = new DOMParser();

(function serve() {
  Deno.serve((req) => {
    const pathname = new URL(req.url).pathname;
    if (pathname.startsWith("/event")) {
      return new Response(new ReadableStream({
        start(controller) {
          notify = () => {
            controller.enqueue({ event: "change", data: "change" });
          }
        },
        cancel() {
          if (notify) {
            notify = undefined;
          }
        }
      }).pipeThrough(new ServerSentEventStream()), {
        headers: {
          "Content-Type": "text/event-stream",
          "X-Accel-Buffering": "no",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        }
      });
    } else {
      return serveDir(req, { fsRoot: "./docs", showDirListing: true })
      .then(response => response.status === 200 && response.headers.get("content-type")?.startsWith("text/html") ? response.text().then(body => {
        const html = parser.parseFromString(body, "text/html");
        const script = html.createElement("script");
        script.textContent = RELOAD_SNIPPET;
        html.head.appendChild(script);
        return new Response(html.documentElement?.innerHTML, response);
      }) : response);
    }
  });
})();

addEventListener("hmr", on_changed);
