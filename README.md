# Posting System (CEPS)

## Requirements

1. [Git](https://git-scm.com/)
2. [Deno](https://deno.com/)

#### Deno installation command

```
curl -fsSL https://deno.land/install.sh | sh
```

## First-time setup

If you don't have a copy of the repository locally yet, open your terminal,
`cd` to the directory you want to house the repo directory in (e.g., your Documents folder), and run these commands:

```
git clone git@github.com:seefeldtm/ce-blog.git
cd ce-blog
git config --local core.hooksPath .githooks/
```

### SSH key setup

You will be able to pull the repository without an SSH key set up, but if you want to push your changes back to GitHub,
you'll need one set up on your GitHub account for the machine you're working on.

To do that, go into your user **Settings** (click your avatar) and then **SSH and GPG keys** in the left bar on that page.
There, you can add a public key for your machine.

To get your public key from your machine, run this command, follow the prompts to create a key if you don't have one, and then copy the last line it outputs.

```
[ -f "$HOME/.ssh/id_ed25519.pub" ] || ssh-keygen -t ed25519 -f "$HOME/.ssh/id_ed25519"; cat "$HOME/.ssh/id_ed25519.pub"
```

### GitHub Pages setup

*(This is already taken care of; leaving it in for reference if we ever have change it)*

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
git commit -m "<commit message>"
git push
```

## Organization

- **md**: put Markdown files in here
- **gen**: contains files & code relevant to generating the site
- **docs**: this is where the generated site goes

