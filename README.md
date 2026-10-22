# Bernabe Bertiz Maboloc Jr. — Portfolio

Personal portfolio of Bernabe Bertiz Maboloc Jr., a fourth-year BS Information Technology student at National University – Fairview.

- **Live site:** <https://mabsb.github.io/> (after it has been published; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))
- **Built with:** plain HTML, CSS and JavaScript. No framework, no build step, no database, no backend, no paid services.
- **Hosting:** GitHub Pages (free).

---

## Preview it on your computer

The simplest way: open `index.html` in Chrome, Edge, Firefox or Safari (double-click it). Everything works offline.

For a preview that behaves exactly like GitHub Pages, run a small local server from this folder and open <http://localhost:8000>:

```bash
python -m http.server 8000
```

---

## What's where

```
mabsb.github.io/
├── index.html              The page: hero, about, education, resume and contact text
├── 404.html                Shown for broken links on your site
├── content/                ← Edit these to update the lists on the page
│   ├── projects.js         Projects
│   ├── skills.js           Technical skills
│   └── certificates.js     Certifications and training
├── assets/
│   ├── css/styles.css      Design: colors, fonts, layout (colors are at the top)
│   ├── js/main.js          Interactions (you normally don't need to touch this)
│   ├── resume/             Your resume PDF
│   ├── certificates/       Certificate files you've approved for public view
│   ├── img/                Icons, social-preview image, project screenshots
│   └── fonts/              Bricolage Grotesque, Instrument Sans, JetBrains Mono (self-hosted)
├── docs/
│   ├── DEPLOYMENT.md       Step-by-step publishing guide and troubleshooting
│   └── TESTING-CHECKLIST.md
├── tools/validate.mjs      Optional checker for mistakes and private data
├── robots.txt, sitemap.xml Search-engine files
└── .nojekyll               Tells GitHub Pages to serve the files as they are
```

---

## Updating the content

You only need a text editor (Visual Studio Code works well). After any change, reload the page to check it.

### Projects — `content/projects.js`

Each project is one block between `{` and `}`. Copy an existing block to add a new one. The comments at the top of the file explain every field. A few rules keep the section honest and clear:

- Put things that exist today in `built`. Put requirements or plans in `spec`; they show with a dashed border and an "As specified" label.
- Set `status` to `"live"` only when the public link works.
- `areas` (`"web"`, `"iot"`, `"mobile"`, `"ai"`, `"networking"`) create the filter buttons automatically.
- `flow` (optional, featured projects) draws the signal chain at the top of the card, step by step.
- `visible: false` hides a project without deleting it. **NoteBud** is set up this way: fill in its fields, then change `visible` to `true`.

**Adding screenshots:** save them in `assets/img/projects/` (see the README there), then list them in the project's `images`:

```js
images: [
  { src: "assets/img/projects/mrt-bigasan-shop.webp", alt: "MRT Bigasan shop page listing rice products", width: 1600, height: 1000 }
]
```

### Skills — `content/skills.js`

Add a skill inside the right group, for example `{ name: "Docker" }`. If you've used it in a project on the site, add `usedIn: ["Smart Gate"]` with the project's exact title; the skill then moves into the skill × project table with a mark under that project. Skills without `usedIn` appear under "Coursework and self-study". Keep coursework-only skills labeled, like `"Kotlin (coursework)"`.

### Certifications — `content/certificates.js`

Add one line per **unique** credential. Copy the official title from the certificate itself, and fill in `issuer` and `year` only from what the certificate says (leave them `null` otherwise; they won't show).

To add a **View certificate** button, first read [`assets/certificates/README.md`](assets/certificates/README.md), then set `file` (or `verifyUrl` for an official verification link such as a Credly badge).

When you pass an industry exam (for example CCST or CCNA), add it with `type: "certification"`. Use `type: "in-progress"` for anything not finished yet.

### Text in `index.html`

Search the file (Ctrl+F / Cmd+F) for the words you want to change. Each section is marked with a comment such as `<!-- ABOUT -->`. Keep the HTML tags as they are and edit only the words between them.

- **GWA:** in the Education card (inside the About section) there's a comment showing where to add a GWA row once you've confirmed the figure and its scale.
- **LinkedIn:** copy the "GitHub: MabsB" button in the Contact section and change the link and label.
- **Hero numbers:** the project, certificate and live-site counts in "At a glance" are counted from the content files automatically.
- **Name or headline:** update both the page text and the `<title>` / `description` lines at the top of the file.

### Resume — `assets/resume/`

Replace `Bernabe-Maboloc-Jr-Resume.pdf` with your new PDF **using the same file name**, then update the line "PDF, 1 page, 53 KB. Updated October 2026." in the Resume section of `index.html`. If you change the file name, update the three links in `index.html` that point to it.

### Colors and fonts — `assets/css/styles.css`

The color palette is in the `:root` block at the top; the light theme repeats the same names below it. Change a value once and it updates everywhere.

---

## Before you publish: privacy

GitHub Pages on a free account publishes from a **public** repository. That means:

- **Every file in the repository is public**, even if no page links to it. Keep unapproved certificates, IDs, drafts and notes **outside this folder**.
- **Git remembers deleted files.** If something private is pushed by mistake, deleting it later doesn't remove it from the history. See "A private file was published" in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#a-private-file-was-published-by-mistake).
- **Your resume PDF is downloadable by anyone**, including everything printed on it.
- Never add Firebase configuration, API keys, passwords, resident or customer data, or RFID tag numbers to this site.

If you have [Node.js](https://nodejs.org/) installed, run the checker before each publish. It finds syntax errors, duplicate certificates, missing files, unsafe links, phone numbers, keys and stray email addresses:

```bash
node tools/validate.mjs
```

---

## Publishing and testing

- Publishing step by step, plus troubleshooting: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- What to check on desktop and mobile after each publish: [docs/TESTING-CHECKLIST.md](docs/TESTING-CHECKLIST.md)

---

## Credits

Fonts: Bricolage Grotesque (headings), Instrument Sans (text) and JetBrains Mono (labels), each by its project authors and licensed under the SIL Open Font License 1.1 ([assets/fonts/OFL.txt](assets/fonts/OFL.txt)). Icons and the Smart Gate signal chain are drawn for this site.
