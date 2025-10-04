import { DOMParser, HTMLDocument } from "@b-fuze/deno-dom";
import { extractYaml } from "@std/front-matter";
import { marked } from "marked";
import { markedSmartypantsLite } from "marked-smartypants-lite";
import { loadHistory } from "./history.ts";

marked.use(markedSmartypantsLite());

const decoder = new TextDecoder("utf-8");
const parser = new DOMParser();

async function loadText(filepath: string) {
  return decoder.decode(await Deno.readFile(filepath));
}

async function loadHTML(filepath: string) {
  return parser.parseFromString(await loadText(filepath), "text/html");
}

type MarkdownResult = { data?: { [key:string]: unknown }; html: HTMLDocument };
async function loadMD(filepath: string): Promise<MarkdownResult> {
  const file_contents = await loadText(filepath);
  let data: MarkdownResult["data"];
  let markdown: string = file_contents;
  if (file_contents.match(/^\s*---/m)) {
    const { attrs, body } = extractYaml<MarkdownResult["data"]>(file_contents);
    data = attrs;
    markdown = body;
  }
  return { data, html: parser.parseFromString(await marked.parse(markdown), "text/html") };
}

function dateString(date: Temporal.PlainDate) {
  return `${date.day} ${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][date.month - 1]} ${date.year}`;
}

function dateStringShort(date: Temporal.PlainDate) {
  return `${["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"][date.month - 1]} ${date.day}`;
}

export {
  loadText,
  loadHTML,
  loadMD,
  loadHistory,
  dateString,
  dateStringShort,
  type MarkdownResult,
};
