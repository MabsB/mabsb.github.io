#!/usr/bin/env node
/*
 * Content check for the portfolio. Optional: needs Node.js 18 or newer.
 *
 *   node tools/validate.mjs
 *
 * It checks the files in /content for mistakes that would break the page or
 * publish something you didn't mean to: syntax errors, duplicate certificates,
 * missing files, unsafe links, and private data such as phone numbers or keys.
 * Errors must be fixed before publishing; warnings are worth a look.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

// The only email address that should appear on the site.
const PUBLIC_EMAIL = 'bernabemaboloc3@gmail.com';

const root = fileURLToPath(new URL('..', import.meta.url));
const errors = [];
const warnings = [];
const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

/* Load the content files the same way the browser does. ------------------- */
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const file of ['content/skills.js', 'content/projects.js', 'content/certificates.js']) {
  const path = join(root, file);
  if (!existsSync(path)) {
    error(`${file} is missing.`);
    continue;
  }
  try {
    vm.runInContext(readFileSync(path, 'utf8'), sandbox, { filename: file });
  } catch (e) {
    error(`${file} has a syntax error (line ${e.stack?.match(/:(\d+)/)?.[1] ?? '?'}): ${e.message}`);
  }
}
const data = sandbox.window.PORTFOLIO || {};

const isHttps = (url) => /^https:\/\//i.test(url);
const isRelative = (url) => typeof url === 'string' && url && !/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('//');
const fileExists = (rel) => existsSync(join(root, rel));
const norm = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/* Projects ---------------------------------------------------------------- */
const STATUSES = ['live', 'built', 'prototype', 'in-progress', 'coursework', null, undefined];
const AREAS = ['web', 'iot', 'mobile', 'ai', 'networking'];
const projects = Array.isArray(data.projects) ? data.projects : [];
if (!Array.isArray(data.projects)) error('content/projects.js did not define a project list.');
const projectIds = new Set();
const visibleTitles = new Set();
for (const p of projects) {
  const name = p.title || p.id || '(untitled project)';
  if (!p.id) error(`Project "${name}" needs an id.`);
  else if (projectIds.has(p.id)) error(`Two projects share the id "${p.id}".`);
  else projectIds.add(p.id);
  if (p.id && !/^[a-z0-9-]+$/.test(p.id)) error(`Project id "${p.id}" should use only lowercase letters, numbers and hyphens.`);
  if (!STATUSES.includes(p.status)) error(`Project "${name}": unknown status "${p.status}".`);
  for (const area of p.areas || []) if (!AREAS.includes(area)) error(`Project "${name}": unknown area "${area}".`);
  if (p.visible === false) {
    warn(`Project "${name}" is hidden (visible: false).`);
    continue;
  }
  visibleTitles.add(p.title);
  if (!p.title) error('A visible project has no title.');
  if (!p.summary) error(`Project "${name}" is visible but has no summary.`);
  if (!(p.built || []).length) warn(`Project "${name}" has no "built" list.`);
  if (p.status === 'live' && !(p.links || []).some((l) => l.kind === 'live')) {
    warn(`Project "${name}" is marked live but has no live link.`);
  }
  for (const link of p.links || []) {
    if (!isHttps(link.url) && !isRelative(link.url)) error(`Project "${name}": link "${link.url}" must start with https://`);
    if (isRelative(link.url) && !fileExists(link.url)) error(`Project "${name}": linked file "${link.url}" does not exist.`);
  }
  for (const image of p.images || []) {
    if (!image.src || !fileExists(image.src)) error(`Project "${name}": image "${image.src}" does not exist.`);
    if (!image.alt) error(`Project "${name}": image "${image.src}" needs alt text.`);
  }
}

/* Skills ------------------------------------------------------------------ */
const skills = Array.isArray(data.skills) ? data.skills : [];
if (!Array.isArray(data.skills)) error('content/skills.js did not define a skills list.');
const seenSkills = new Map();
for (const group of skills) {
  if (!group.category) error('A skill group is missing its category name.');
  for (const item of group.items || []) {
    const key = norm(item.name);
    if (seenSkills.has(key)) warn(`Skill "${item.name}" appears in both "${seenSkills.get(key)}" and "${group.category}".`);
    seenSkills.set(key, group.category);
    for (const project of item.usedIn || []) {
      if (!visibleTitles.has(project)) {
        error(`Skill "${item.name}" says it was used in "${project}", but no visible project has that exact title.`);
      }
    }
    if (/%|expert|master|advanced level/i.test(item.name)) warn(`Skill "${item.name}" looks like a proficiency rating; list the skill only.`);
  }
}

/* Certificates ------------------------------------------------------------ */
const TYPES = ['career-path', 'course', 'workshop', 'academic-event', 'certification', 'in-progress'];
const categories = Array.isArray(data.certificateCategories) ? data.certificateCategories : [];
const certificates = Array.isArray(data.certificates) ? data.certificates : [];
if (!Array.isArray(data.certificates)) error('content/certificates.js did not define a certificate list.');
const categoryIds = new Set(categories.map((c) => c.id));
const seenTitles = new Map();
const referencedFiles = new Set();
for (const cert of certificates) {
  const title = cert.title || '(untitled certificate)';
  const key = norm(title);
  if (seenTitles.has(key)) error(`Duplicate certificate: "${title}" is listed twice. List each credential once.`);
  seenTitles.set(key, true);
  if (!categoryIds.has(cert.category)) error(`Certificate "${title}": unknown category "${cert.category}".`);
  if (!TYPES.includes(cert.type)) error(`Certificate "${title}": unknown type "${cert.type}".`);
  if (/\.pdf$|certificate_|[0-9a-f]{8}-[0-9a-f]{4}-/i.test(title)) error(`Certificate "${title}" looks like a file name, not an official title.`);
  if (/\bCCNA\b/i.test(title) && cert.type === 'certification') warn(`"${title}" is marked as a certification. Only keep this if you passed the CCNA exam.`);
  if (cert.year && !/^(19|20)\d{2}$/.test(String(cert.year))) error(`Certificate "${title}": year "${cert.year}" should be a four-digit year.`);
  if (cert.file) {
    if (!isRelative(cert.file) || !fileExists(cert.file)) error(`Certificate "${title}": file "${cert.file}" does not exist.`);
    else referencedFiles.add(cert.file.replace(/^\.\//, ''));
  }
  if (cert.verifyUrl && !isHttps(cert.verifyUrl)) error(`Certificate "${title}": verifyUrl must start with https://`);
}

/* Files that are public without being linked --------------------------------- */
const certDir = join(root, 'assets/certificates');
if (existsSync(certDir)) {
  for (const name of readdirSync(certDir)) {
    if (name === 'README.md' || name.startsWith('.')) continue;
    const rel = `assets/certificates/${name}`;
    if (!referencedFiles.has(rel)) {
      warn(`${rel} isn't linked from any certificate, but it is still public once pushed. Remove it if it isn't approved.`);
    }
  }
}

/* Privacy scan of every text file in the repository ----------------------- */
const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.md', '.json', '.xml', '.txt', '.yml', '.yaml', '.svg']);
const SKIP_DIRS = new Set(['.git', 'node_modules']);
const PATTERNS = [
  { re: /(\+?63|0)[\s-]?9\d{2}[\s-]?\d{3}[\s-]?\d{4}/g, what: 'a Philippine mobile number' },
  { re: /AIza[0-9A-Za-z_-]{30,}/g, what: 'a Google/Firebase API key' },
  { re: /\b(firebaseConfig|apiKey|authDomain|messagingSenderId)\b/g, what: 'Firebase configuration' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g, what: 'a private key' },
  { re: /\b(ghp|gho|github_pat)_[A-Za-z0-9_]{20,}/g, what: 'a GitHub token' },
  { re: /\bpassword\s*[:=]\s*\S+/gi, what: 'a password' },
  { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, what: 'an email address', allow: (m) => m.toLowerCase() === PUBLIC_EMAIL }
];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (TEXT.has(extname(name).toLowerCase())) scan(path);
  }
}
function scan(path) {
  const rel = relative(root, path);
  if (rel === join('tools', 'validate.mjs')) return;
  const text = readFileSync(path, 'utf8');
  for (const { re, what, allow } of PATTERNS) {
    for (const match of text.matchAll(re)) {
      if (allow && allow(match[0])) continue;
      const line = text.slice(0, match.index).split('\n').length;
      error(`${rel}:${line} contains what looks like ${what} ("${match[0].slice(0, 24)}"). Remove it before publishing.`);
    }
  }
}
walk(root);

/* Page references ------------------------------------------------------------ */
const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const [, url] of html.matchAll(/\s(?:src|href)="([^"#][^"]*)"/g)) {
  if (/^(https?:|mailto:|data:)/.test(url)) continue;
  if (!fileExists(url.split(/[?#]/)[0])) error(`index.html links to "${url}", which does not exist.`);
}
if (existsSync(join(root, 'assets/resume'))) {
  const pdfs = readdirSync(join(root, 'assets/resume')).filter((n) => n.toLowerCase().endsWith('.pdf'));
  if (!pdfs.length) error('No resume PDF in assets/resume/.');
  else warn(`Reminder: ${pdfs.join(', ')} is public. Anything printed on it (for example your phone number) can be downloaded by anyone.`);
}

/* Report ---------------------------------------------------------------------- */
const visible = projects.filter((p) => p.visible !== false).length;
const skillCount = skills.reduce((n, g) => n + (g.items || []).length, 0);
console.log(`Checked ${visible} visible projects, ${skillCount} skills, ${certificates.length} certificates.\n`);
for (const message of warnings) console.log(`  warning  ${message}`);
for (const message of errors) console.log(`  ERROR    ${message}`);
console.log(
  errors.length
    ? `\n${errors.length} error(s) to fix before publishing.`
    : `\nNo errors${warnings.length ? `, ${warnings.length} warning(s) to review` : ''}. Safe to publish.`
);
process.exit(errors.length ? 1 : 0);
