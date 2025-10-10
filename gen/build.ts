import { dateString, dateStringShort, loadHistory, loadHTML, loadMD, loadText, MarkdownResult } from "./util.ts";
import { updateHistoryFile } from "./history.ts";

const OUT = "docs";
const GEN = "gen"
const STATIC = GEN + "/static";
const DEFS = "defs.md";
const MAIN_TEMPLATE = GEN + "/template/main.html";

async function build() {
  console.log("Building...");
  // updated history file will be used in build
  await updateHistoryFile();
  // ensure OUT directory exists (recursive: true prevents it from complaining if not exist)
  await Deno.mkdir(OUT, { recursive: true });
  // and then clear the OUT directory
  for await (const entry of Deno.readDir(OUT)) {
    await Deno.remove(`${OUT}/${entry.name}`, { recursive: true });
  }
  // deno-lint-ignore no-unused-vars,no-explicit-any
  let defs: any = undefined;
  // read in all markdown files ("posts")
  const post_promises = [];
  for await (const entry of Deno.readDir("md")) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      if (entry.name !== DEFS) {
        post_promises.push(loadMD(`md/${entry.name}`).then(md => ({
          md,
          filename: entry.name,
          slug: entry.name.replace(/\.md$/, ""),
          title: getTitle(md),
          date: typeof md.data?.date === "string" ? new Date(md.data.date).toTemporalInstant().toZonedDateTimeISO("America/Chicago").toPlainDate() : undefined
        })));
      } else {
        defs = await loadMD(`md/${entry.name}`).then(({data}) => data);
      }
    }
  }
  const posts = await Promise.all(post_promises);

  // generate an HTML file for each post
  for (const post of posts) {
    // start with the article element template
    const article = (await loadHTML("gen/template/article.html")).querySelector("article")!;
    { // article header
      const article_header = article.querySelector(".article-header")!;
      const title = article_header.querySelector("h1")!;
      if (post.title) {
        title.textContent = post.title;
      } else {
        title.parentNode!.removeChild(title);
      }
      const date = article_header.querySelector("time")!;
      if (post.date) {
        date.textContent = dateStringShort(post.date);
      } else {
        date.parentNode!.removeChild(date);
      }
    }
    { // article body
      const article_body = article.querySelector(".article-body")!;
      const elements = post.md.html.querySelector("body")!.children;
      // crosslinking implementation
      while (elements.length > 0) {
        for (const refd_post of posts) {
          if (refd_post === post) {
            continue;
          }
          // replace any instance of the referenced post's slug with a link to that post
          elements[0].innerHTML = elements[0].innerHTML.replaceAll(refd_post.slug, `<a href="/${refd_post.slug}.html">${refd_post.slug}</a>`);
        }
        article_body.append(elements[0]);
      }
    }

    const html_template = await createTemplateDocument();
    const main = html_template.querySelector("main")!;
    main.append(article);
    for (const p of article.querySelectorAll("p")) {
      // check for any <img> elements singly wrapped in <p>s, and unwrap them
      if (p.children.length === 1 && p.children[0].tagName === "IMG") {
        const img = p.children[0];
        p.replaceWith(img);
      }
    }
    await Deno.writeTextFile(`${OUT}/${post.slug}.html`, html_template.documentElement!.outerHTML);
  }

  { // generate home page "index.html"
    // load post history data
    const history = await loadHistory(posts.map(({filename}) => filename));

    const html_template = await createTemplateDocument();
    const main = html_template.querySelector("main")!;
    main.classList.add("all-text");
    // {
    //   const thing = html_template.createElement("div");
    //   thing.classList.add("current-thing");
    //   thing.innerHTML = `The current thing is <b>${defs.thing}</b>`;
    //   main.append(thing);
    // }
    { // header (this could be a template file if the homepage gets any more complex)
      const header = html_template.createElement("h2");
      header.textContent = "Recently updated";
      main.appendChild(header);
    }
    // process history entries, starting with most recent day and going backwards
    for (const entry of history.reverse()) {
      { // header for given day (again this could be a template file)
        const header = html_template.createElement("h3");
        header.textContent = dateString(entry.date);
        main.appendChild(header);
      }
      { // list of posts edited that day
        const ul = html_template.createElement("ul");
        main.appendChild(ul);
        // go in reverse order again, most recently edited file shows first
        for (const filename of entry.files.reverse()) {
          const slug = filename.replace(/\.md$/, "");
          const li = html_template.createElement("li");
          const a = html_template.createElement("a");
          a.setAttribute("href", `/${slug}.html`);
          a.textContent = slug;
          li.appendChild(a);
          ul.appendChild(li);
        }
      }
    }
    await Deno.writeTextFile(`${OUT}/index.html`, html_template.documentElement!.outerHTML);
  }

  // deno-lint-ignore no-constant-condition
  if (false) { // generate RSS feed "feed.xml"
    const FEED_ITEM_TEMPLATE = `
      <item>
        <title>{Title}</title>
        <author>alex@musical.garden (Alex)</author>
        <pubDate>{Date}</pubDate>
        <link>{URL}</link>
        <guid>{URL}</guid>
        <description>Blog post on Musical Garden</description>
        <content:encoded><![CDATA[{HTML Content}]]></content:encoded>
      </item>`;
    let xml = await loadText("gen/template/feed.xml");

    for (const post of posts) {
      const insert = xml.indexOf("\n  </channel>");
      xml = xml.slice(0, insert) +
        FEED_ITEM_TEMPLATE
          .replaceAll("{URL}", "https://catenc.com/" + post.slug)
          .replace("{Title}", post.title ?? "")
          .replace("{Date}",
            post.date ? new Date(
              post.date
                .toZonedDateTime({ timeZone: "America/Chicago", plainTime: "12:00" })
                .toString({ timeZoneName: "never", offset: "auto" }))
              .toUTCString() : "")
          .replace("{HTML Content}", (await loadHTML(`${OUT}/${post.slug}.html`)).querySelector("article")!.innerHTML) +
        xml.slice(insert);
    }

    await Deno.writeTextFile(`${OUT}/feed.xml`, xml);
  }

  // copy all static files to OUT
  await copyFilesRecursive(STATIC, OUT);

  console.log("Built");
}

// reproduce a possibly nested directory structure under another directory
async function copyFilesRecursive(from: string, to: string) {
  for await (const entry of Deno.readDir(from)) {
    const from_entry_path = `${from}/${entry.name}`;
    const to_entry_path = `${to}/${entry.name}`;
    if (entry.isFile) {
      await Deno.copyFile(from_entry_path, to_entry_path);
    } else if (entry.isDirectory) {
      await Deno.mkdir(to_entry_path, { recursive: true });
      await copyFilesRecursive(from_entry_path, to_entry_path);
    }
    // symlinks don't get handled right now... don't use em
  }
}

// get the title from a parsed markdown file
function getTitle(md: MarkdownResult): string|undefined {
  if (typeof md.data?.title === "string") {
    // if specified in the YAML frontmatter, use that
    return md.data.title;
  } else {
    // otherwise, the first h1 to appear is the title
    const h1 = md.html.querySelector("h1:first-child");
    if (h1) {
      const title = h1.textContent;
      h1.parentNode!.removeChild(h1);
      return title;
    }
  }
  return undefined;
}

// get the main HTML that all pages are wrapped in, and set the copyright on it dynamically
async function createTemplateDocument() {
  const html_template = await loadHTML(MAIN_TEMPLATE);
  { // add correct copyright year
    const copyright = html_template.querySelector(".copyright")!;
    copyright.innerHTML = copyright.innerHTML.replace("Year", new Date().getFullYear().toString());
  }
  return html_template;
}

if (import.meta.main) {
  await build();
}

export default build;
