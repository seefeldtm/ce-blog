import { loadText } from "./util.ts";
import { exists } from "@std/fs/exists";

const MD_DIR = "md/";
const HISTFILE = "gen/history";
const SPLIT_CHAR = "\t";

const comment_regex = /^#\s*/;

async function updateHistoryFile() {
  const filenames = (async function *() {
    if (Deno.args[0] === "-") {
      // read in stdin
      const reader = Deno.stdin.readable.getReader();
      const { value } = await reader.read();
      reader.releaseLock();
      // split contents of stdin into lines for the list of modified filenames to be checked
      for (const filename of new TextDecoder().decode(value || new Uint8Array()).split("\n")) {
        yield filename;
      }
    } else {
      for await (const entry of Deno.readDir(MD_DIR)) {
        if (entry.isFile) {
          yield MD_DIR + entry.name;
        }
      }
    }
  })();

  // object that stores a map of filename to last modified time
  const file_mtimes: { [key: string]: Temporal.Instant } = {};
  for await (const name of filenames) {
    // only care about md/*.md files
    if (name.startsWith(MD_DIR) && name.endsWith(".md")) {
      try {
        const info = await Deno.stat(name);
        if (info.mtime) {
          // substring(3) cuts off the folder name
          file_mtimes[name.substring(MD_DIR.length)] = info.mtime.toTemporalInstant();
        }
      } catch {
        console.warn("file removed: " + name);
      }
    }
  }

  (await Deno.open(HISTFILE, { create: true, write: true })).close();
  const history_contents = await loadText(HISTFILE);

  for (let line of history_contents.split("\n")) {
    if (line.length > 0) {
      line = line.replace(comment_regex, ""); // uncomment commented lines, we want them to prevent additional modification times from being added if applicable
      const index = line.indexOf(SPLIT_CHAR);
      const time = line.substring(0, index);
      const filename = line.substring(index + 1);
      // if latest file modification happened at or before the time logged in the history
      if (file_mtimes[filename] && Temporal.Instant.compare(file_mtimes[filename], time) <= 0) {
        delete file_mtimes[filename];
      }
    }
  }

  Object.entries(file_mtimes).sort(([,a], [,b]) => Temporal.Instant.compare(a, b)).map(async ([filename, time]) => {
    await Deno.writeTextFile(HISTFILE, `${time.toString()}${SPLIT_CHAR}${filename}\n`, { append: true });
  });
}

async function collapseHistoryFile() {
  const history_contents = await loadText(HISTFILE);
  const parsed_lines = [];

  for (const line of history_contents.split("\n")) {
    if (line.length > 0) {
      const commented = !!line.match(comment_regex);
      const uncommented_line = line.replace(comment_regex, "");
      const index = uncommented_line.indexOf(SPLIT_CHAR);
      const time = uncommented_line.substring(0, index);
      const filename = uncommented_line.substring(index + 1);
      const instant = Temporal.Instant.from(time);
      // all same-day lines for a given filename get the same ID, so all but the latest get removed
      // all commented lines for a given filename get the same ID, so all but the latest get removed
      parsed_lines.push({ filename, instant, id: commented ? `# ${filename}` : `${instantToDateString(instant)} ${filename}`, line });
    }
  }

  parsed_lines.sort((a,b) => Temporal.Instant.compare(a.instant, b.instant));
  const seen: string[] = [];
  for (let i = parsed_lines.length - 1; i >= 0; i--) {
    const item = parsed_lines[i];
    const file_exists = await exists(MD_DIR + item.filename, { isFile: true });
    if (seen.includes(item.id) || !file_exists) {
      parsed_lines.splice(i, 1);
    } else {
      seen.push(item.id);
    }
  }

  await Deno.writeTextFile(HISTFILE, parsed_lines.map(i => i.line).join("\n") + "\n");
}

type HistoryEntry = { date: Temporal.PlainDate; files: string[] };
async function loadHistory(files: string[]): Promise<HistoryEntry[]> {
  const history_contents = await loadText("gen/history");
  const history_map: { [key: string]: string[] } = {};
  for (const line of history_contents.split("\n")) {
    if (line.length > 0 && !line.match(comment_regex)) { // discard commented lines
      const index = line.indexOf(SPLIT_CHAR);
      const timestring = line.substring(0, index);
      const filename = line.substring(index + 1);
      if (!files.includes(filename)) {
        continue;
      }
      const date = instantToDateString(Temporal.Instant.from(timestring));
      if (!history_map[date]) {
        history_map[date] = [filename];
      } else {
        history_map[date] = history_map[date].filter(n => n !== filename);
        history_map[date].push(filename);
      }
    }
  }

  return Object.entries(history_map).sort(([a],[b]) => Temporal.PlainDate.compare(a, b)).map(([date, files]) => ({ date: Temporal.PlainDate.from(date), files }));
}

function instantToDateString(instant: Temporal.Instant) {
  return instant.toZonedDateTimeISO("America/Chicago").toPlainDate().toString();
}

if (import.meta.main) {
  await updateHistoryFile();
  await collapseHistoryFile();
}

export {
  updateHistoryFile,
  loadHistory,
};
