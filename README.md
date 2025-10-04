# \*\*\*\*\*\*\*\* \*\*\*\*\*\*\*\* Posting System (\*\*PS)

## Requirements

1. [Git](https://git-scm.com/)
2. [Deno](https://deno.com/)

## First-time setup

Set up a git repository locally:

```
git init
git config --local core.hooksPath .githooks/
git add .
git commit -m "initial commit"
```

Set up a remote on GitHub and push to it:

```
git remote add origin <ORIGIN-URL>
git push -u origin main
```

### GitHub Pages setup

1. On the page for your repository on GitHub, go to **Settings** > **Pages**.
2. Under **Build and deployment**, make sure "Source" is "Deploy from a branch" and "Branch" is set to "main".

## Usage

Place posts in the `md` directory.

### Preview site

If you want a preview while you work on the site, you can run:

```
deno task dev
```

The site will be visible to you at http://localhost:8000/.

### Publish

Once your changes are ready, you can publish it by committing and pushing it to GitHub:

```
git add .
git commit -m "commit message"
git push
```

## Organization

- **md**: put Markdown files in here
- **gen**: contains files & code relevant to generating the site
- **docs**: this is where the generated site goes
