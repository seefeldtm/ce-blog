import { dateString, dateStringShort, loadHistory, loadHTML, loadMD, MarkdownResult } from "./util.ts";
import { updateHistoryFile } from "./history.ts";

const OUT = "docs";
const STATIC = "gen/static";
const DEFS = "defs.md";

async function build() {
  console.log("Building...");
  await updateHistoryFile();
  await Deno.mkdir(OUT, { recursive: true });
  for await (const entry of Deno.readDir(OUT)) {
    await Deno.remove(`${OUT}/${entry.name}`, { recursive: true });
  }
  const promises = [];
  let defs: any = undefined;
  for await (const entry of Deno.readDir("md")) {
    if (entry.isFile && entry.name.endsWith(".md")) {
      if (entry.name !== DEFS) {
        promises.push(loadMD(`md/${entry.name}`).then(md => ({
          md,
          filename: entry.name,
          slug: entry.name.replace(/\.md$/, ""),
          title: getTitle(md),
          date: typeof md.data?.date === "string" && new Date(md.data.date).toTemporalInstant().toZonedDateTimeISO("America/Chicago").toPlainDate()
        })));
      } else {
        defs = await loadMD(`md/${entry.name}`).then(({data}) => data);
      }
    }
  }
  const files = await Promise.all(promises);
  for (const file of files) {
    const article = (await loadHTML("gen/template/article.html")).querySelector("article")!;
    {
      const article_header = article.querySelector(".article-header")!;
      const title = article_header.querySelector("h1")!;
      if (file.title) {
        title.textContent = file.title;
      } else {
        title.parentNode!.removeChild(title);
      }
      const date = article_header.querySelector("time")!;
      if (file.date) {
        date.textContent = dateStringShort(file.date);
      } else {
        date.parentNode!.removeChild(date);
      }
    }
    {
      const article_body = article.querySelector(".article-body")!;
      const elements = file.md.html.querySelector("body")!.children;
      while (elements.length > 0) {
        for (const refd_file of files) {
          if (refd_file === file) {
            continue;
          }
          // a very basic version of what we want to do
          elements[0].innerHTML = elements[0].innerHTML.replaceAll(refd_file.slug, `<a href="${refd_file.slug}.html">${refd_file.slug}</a>`);
        }
        article_body.append(elements[0]);
      }
    }
    const html_template = await loadHTML("gen/template/main.html");
    {
      const copyright = html_template.querySelector(".copyright")!;
      copyright.innerHTML = copyright.innerHTML.replace("Year", new Date().getFullYear().toString());
    }
    const main = html_template.querySelector("main")!;
    main.append(article);
    for (const p of article.querySelectorAll("p")) {
      if (p.children.length === 1 && p.children[0].tagName === "IMG") {
        const img = p.children[0];
        p.replaceWith(img);
        // const image_column = main.querySelector(".image-column") ?? makeImageColumn(html_template);
        // image_column.append(img.cloneNode(true));
      }
    }
    await Deno.writeTextFile(`${OUT}/${file.slug}.html`, html_template.documentElement!.outerHTML);
  }

  const history = await loadHistory(files.map(({filename}) => filename));

  const html_template = await loadHTML("gen/template/main.html");
  {
    const copyright = html_template.querySelector(".copyright")!;
    copyright.innerHTML = copyright.innerHTML.replace("Year", new Date().getFullYear().toString());
  }
  const main = html_template.querySelector("main")!;
  main.classList.add("all-text");
  // {
  //   const thing = html_template.createElement("div");
  //   thing.classList.add("current-thing");
  //   thing.innerHTML = `The current thing is <b>${defs.thing}</b>`;
  //   main.append(thing);
  // }
  {
    const header = html_template.createElement("h2");
    header.textContent = "Recently updated";
    main.appendChild(header);
    for (const entry of history.reverse()) {
      const header = html_template.createElement("h3");
      header.textContent = dateString(entry.date);
      main.appendChild(header);
      const ul = html_template.createElement("ul");
      main.appendChild(ul);
      for (const filename of entry.files.reverse()) {
        const slug = filename.replace(/\.md$/, "");
        const li = html_template.createElement("li");
        const a = html_template.createElement("a");
        a.setAttribute("href", `${slug}.html`);
        a.textContent = slug;
        li.appendChild(a);
        ul.appendChild(li);
      }
    }
  }
  await Deno.writeTextFile(`${OUT}/index.html`, html_template.documentElement!.outerHTML);

  await copyFilesRecursive(STATIC, OUT);

  console.log("Built");
}

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
  }
}

function getTitle(md: MarkdownResult): string|undefined {
  if (typeof md.data?.title === "string") {
    return md.data.title;
  } else {
    const h1 = md.html.querySelector("h1:first-child");
    if (h1) {
      const title = h1.textContent;
      h1.parentNode!.removeChild(h1);
      return title;
    }
  }
  return undefined;
}

if (import.meta.main) {
  await build();
}

export default build;
