import { DOMParser } from "@b-fuze/deno-dom";

const arg = Deno.args[1];

if (!arg) {
  console.error("Please provide a playlist link");
  Deno.exit(1);
}

const url = URL.parse(arg);

if (!url || url.hostname !== "open.spotify.com" || !url.pathname.startsWith("/playlist")) {
  console.error("Invalid argument: must be a Spotify playlist url");
  Deno.exit(1);
}

url.searchParams.delete("si");

const response = await fetch(url);
if (!response.ok) {
  console.error("fetch failed :(");
  Deno.exit(1);
}

const parser = new DOMParser();
const playlist_html = parser.parseFromString(await response.text(), "text/html");
const playlist_title = playlist_html.querySelector("meta[property='og:title']")!.getAttribute("content")!;

let document = `---\ntitle: ${playlist_title}\ndate: ${Date.now().toString()}\n---\n`;

let i = 1;
for (const meta of playlist_html.querySelectorAll("meta[name='music:song']")) {
  const track_url = URL.parse(meta.getAttribute("content")!)!;
  const response = await fetch(track_url);
  if (!response.ok) {
    console.error("fetch failed :(");
    Deno.exit(1);
  }
  const track_html = parser.parseFromString(await response.text(), "text/html");
  const [artist, album] = track_html.querySelector("meta[property='og:description']")!.getAttribute("content")!.split(" · ");
  const title = track_html.querySelector("meta[property='og:title']")!.getAttribute("content")!;
  
  document = document + `### ${i}. ${title} — ${artist}\n\n*${album}*\n\n\n\n`;
  i++;
}

await Deno.writeTextFile(`md/${slugify(playlist_title)}.md`, document)

function slugify(string: string) {
  return string.replaceAll(" ", "-").toLowerCase();
}
