#!/usr/bin/env node
// Static checks for the gallery files: template.tpl, metadata.yaml and LICENSE.
//
// Covers the Community Template Gallery requirements, the template style
// guide, the contract that installed tags depend on, and the version history
// in metadata.yaml. The template's own tests (___TESTS___) run in the GTM
// template editor: Templates > ByAds Pixel > Tests > Run Tests.
//
// Usage (from the repository root):
//   npm ci --ignore-scripts
//   npm run validate
//
// Versions already published must stay listed in metadata.yaml. They are read
// from the base ref: VALIDATE_BASE_REF when it is set, origin/main otherwise.
// Set VALIDATE_BASE_REF to an empty value only before the very first push.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { parse as parseJs } from 'acorn';
import YAML from 'yaml';

const errors = [];
const check = (ok, message) => {
  if (!ok) errors.push(message);
};

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const gitOk = (...args) => {
  try {
    git(...args);
    return true;
  } catch {
    return false;
  }
};

// --- Contract with installed tags --------------------------------------------
// Installed tags store their settings under these parameter names, and the
// pixel script reads the window globals below. Removing or retyping a
// parameter, or removing a select value, breaks those tags (a major version).
// New parameters and new select values are compatible additions.

const PARAMETER_TYPES = {
  accountGroup: 'GROUP',
  clientId: 'TEXT',
  eventGroup: 'GROUP',
  eventType: 'SELECT',
  customEventName: 'TEXT',
  dedupKey: 'TEXT',
  signalsGroup: 'GROUP',
  sigEnv: 'CHECKBOX',
  sigPerf: 'CHECKBOX',
  sigConsent: 'CHECKBOX',
  sigIds: 'CHECKBOX',
  sigDl: 'CHECKBOX',
  sigEcom: 'CHECKBOX',
  identifierFilterGroup: 'GROUP',
  skipClickIds: 'CHECKBOX',
  skipBrowserIds: 'CHECKBOX',
  skipAnalyticsIds: 'CHECKBOX',
  skipCampaign: 'CHECKBOX',
  skipAffiliate: 'CHECKBOX',
  customPropsGroup: 'GROUP',
  customProps: 'SIMPLE_TABLE',
  userGroup: 'GROUP',
  userNorm: 'SELECT',
  userEmail: 'TEXT',
  userPhone: 'TEXT',
  userFirstName: 'TEXT',
  userLastName: 'TEXT',
  userCity: 'TEXT',
  userState: 'TEXT',
  userZip: 'TEXT',
  userCountry: 'TEXT',
  advancedGroup: 'GROUP',
  dataLayerName: 'TEXT',
  debug: 'CHECKBOX',
};

const SELECT_VALUES = {
  eventType: ['page_view', 'purchase', 'add_to_cart', 'begin_checkout', 'view_item', 'view_item_list',
    'add_payment_info', 'add_shipping_info', 'sign_up', 'login', 'generate_lead', 'search', 'custom'],
  userNorm: ['raw', 'lower', 'sha256', 'sha256b64'],
  'customProps.t': ['raw', 'lower', 'md5', 'sha256', 'sha256b64'],
};

const GLOBALS = [
  { key: '__advBeaconInbox', read: true, write: true, execute: false },
  { key: '__advBeaconReady', read: true, write: false, execute: false },
  { key: '__advBeacon', read: true, write: false, execute: true },
];
const GLOBAL_DECLARATIONS = ["const NS = '__advBeacon';", "const INBOX = NS + 'Inbox';", "const READY = '__advBeaconReady';"];

const SCRIPT_ORIGIN = 'https://pixel.byads.co';
const INJECT_SCRIPT_URLS = ['https://pixel.byads.co/t/*'];
const CACHE_TOKEN = 'advBeacon';

// Sandboxed APIs the template may use, and the permission each one needs.
// Adding an API means reviewing it here first.
const API_PERMISSION = {
  injectScript: 'inject_script',
  copyFromWindow: 'access_globals',
  createQueue: 'access_globals',
  logToConsole: 'logging',
  encodeUriComponent: null,
  getType: null,
};

// --- Gallery rules -----------------------------------------------------------

const TERMS_OF_SERVICE = [
  "By creating or modifying this file you agree to Google Tag Manager's Community",
  'Template Gallery Developer Terms of Service available at',
  'https://developers.google.com/tag-manager/gallery-tos (or such other URL as',
  'Google may provide), as modified from time to time.',
].join('\n');

const SECTION_ORDER = [
  'TERMS_OF_SERVICE', 'INFO', 'TEMPLATE_PARAMETERS', 'SANDBOXED_JS_FOR_WEB_TEMPLATE', 'WEB_PERMISSIONS', 'TESTS', 'NOTES',
];

const CATEGORIES = [
  'ADVERTISING', 'AFFILIATE_MARKETING', 'ANALYTICS', 'ATTRIBUTION', 'CHAT', 'CONVERSIONS', 'DATA_WAREHOUSING',
  'EMAIL_MARKETING', 'EXPERIMENTATION', 'HEAT_MAP', 'LEAD_GENERATION', 'MARKETING', 'PERSONALIZATION', 'REMARKETING',
  'SALES', 'SESSION_RECORDING', 'SOCIAL', 'SURVEY', 'TAG_MANAGEMENT', 'UTILITY',
];

// Words allowed to keep a capital letter inside sentence-case labels.
const PROPER_NOUNS = new Set(['ByAds', 'Base64']);

// --- Helpers -----------------------------------------------------------------

function splitSections(text) {
  const marks = [...text.matchAll(/^___([A-Z_]+)___$/gm)].map((m) => ({
    name: m[1],
    start: m.index,
    end: m.index + m[0].length,
  }));
  const sections = {};
  marks.forEach((mark, i) => {
    const bodyEnd = i + 1 < marks.length ? marks[i + 1].start : text.length;
    sections[mark.name] = text.slice(mark.end, bodyEnd).replace(/^\n+|\s+$/g, '');
  });
  return { sections, order: marks.map((m) => m.name) };
}

function parseJson(name, text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    errors.push(`${name} is not valid JSON: ${e.message}`);
    return null;
  }
}

function collectParameters(params, out = { params: [], labels: [] }) {
  for (const p of params) {
    out.params.push(p);
    for (const key of ['displayName', 'checkboxText']) if (p[key]) out.labels.push(p[key]);
    for (const item of p.selectItems || []) out.labels.push(item.displayValue);
    for (const column of p.simpleTableColumns || []) {
      if (column.displayName) out.labels.push(column.displayName);
      for (const item of column.selectItems || []) out.labels.push(item.displayValue);
    }
    if (p.subParams) collectParameters(p.subParams, out);
  }
  return out;
}

function pngSize(buffer) {
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Reads metadata.yaml with a real YAML parser and checks the layout the
// gallery documents. Returns the listed versions, newest first.
function readManifest(text, label, report) {
  const docs = YAML.parseAllDocuments(text, { prettyErrors: false, uniqueKeys: true });
  if (!Array.isArray(docs) || docs.length !== 1) {
    report(`${label} must contain exactly one YAML document`);
    return null;
  }
  const doc = docs[0];
  for (const e of [...doc.errors, ...doc.warnings]) report(`${label} is not valid YAML: ${e.message.split('\n')[0]}`);
  if (doc.errors.length) return null;

  // A second parse with the failsafe schema keeps every scalar as its exact
  // text, so a SHA made only of digits isn't turned into a number.
  let data;
  try {
    data = YAML.parse(text, { schema: 'failsafe', uniqueKeys: true });
  } catch (e) {
    report(`${label} is not valid YAML: ${e.message.split('\n')[0]}`);
    return null;
  }
  const typed = doc.toJS(); // the types a regular YAML reader sees
  if (!isPlainObject(data)) {
    report(`${label} must be a mapping with homepage, documentation and versions`);
    return null;
  }
  for (const key of Object.keys(data)) {
    if (!['homepage', 'documentation', 'versions'].includes(key)) report(`${label} has an unexpected key "${key}"`);
  }
  for (const key of ['homepage', 'documentation']) {
    check(typeof data[key] === 'string' && /^https:\/\/\S+$/.test(data[key]), `${label} needs an https ${key} URL`);
  }
  if (!Array.isArray(data.versions) || data.versions.length === 0) {
    report(`${label} must list at least one version under "versions"`);
    return null;
  }
  const versions = [];
  data.versions.forEach((v, i) => {
    const where = `${label} version ${i + 1}`;
    if (!isPlainObject(v)) {
      report(`${where} must be a mapping with sha and changeNotes`);
      return;
    }
    for (const key of Object.keys(v)) {
      if (!['sha', 'changeNotes'].includes(key)) report(`${where} has an unexpected key "${key}"`);
    }
    const sha = typeof v.sha === 'string' ? v.sha.trim() : '';
    if (!/^[0-9a-f]{40}$/.test(sha)) report(`${where}: "${v.sha}" is not a full 40-character commit SHA`);
    else if (typeof typed.versions?.[i]?.sha !== 'string') report(`${where}: quote the sha, YAML reads it as a number`);
    const notes = typeof typed.versions?.[i]?.changeNotes === 'string' ? typed.versions[i].changeNotes.trim() : '';
    if (!notes) report(`${where} needs non-empty changeNotes text`);
    versions.push(sha);
  });
  return versions;
}

// Finds every require() call in the sandboxed code. Each call must take one
// string literal, and `require` may not be used in any other way (aliased,
// passed around), so no API can slip past the permission review.
function findRequiredApis(code, report) {
  let ast;
  try {
    // GTM wraps the code in a function, so a top-level `return` is valid.
    ast = parseJs(`(function (require, data) {\n${code}\n})`, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch (e) {
    report(`the sandboxed code does not parse: ${e.message}`);
    return [];
  }
  const wrapper = ast.body[0].expression;
  const apis = [];
  const visit = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'Identifier' && node.name === 'require' && node !== wrapper.params[0]) {
      const isCallee = parent && parent.type === 'CallExpression' && parent.callee === node;
      // `{require: x}`, `obj.require`, method keys and labels only name
      // something; `{require}` and `obj[require]` still read the function.
      const isPropertyName = parent && (
        (parent.type === 'Property' && parent.key === node && !parent.computed && !parent.shorthand)
        || (['MethodDefinition', 'PropertyDefinition'].includes(parent.type) && parent.key === node && !parent.computed)
        || (parent.type === 'MemberExpression' && parent.property === node && !parent.computed)
        || (['LabeledStatement', 'BreakStatement', 'ContinueStatement'].includes(parent.type) && parent.label === node));
      if (!isCallee && !isPropertyName) report('`require` may only be called directly, never aliased or passed as a value');
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier' && node.callee.name === 'require') {
      const [arg, ...rest] = node.arguments;
      if (arg && arg.type === 'Literal' && typeof arg.value === 'string' && rest.length === 0) apis.push(arg.value);
      else report('every require() call must take a single string literal');
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach((c) => visit(c, node));
      else if (child && typeof child.type === 'string') visit(child, node);
    }
  };
  visit(ast, null);
  return apis;
}

// --- LICENSE -----------------------------------------------------------------
// The gallery removes a template whose repository loses LICENSE or metadata.yaml.

if (!existsSync('LICENSE')) {
  errors.push('LICENSE is missing; without it the template is removed from the gallery');
} else {
  const license = readFileSync('LICENSE', 'utf8');
  check(['Apache License', 'Version 2.0, January 2004', 'TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION',
    'END OF TERMS AND CONDITIONS'].every((s) => license.includes(s)), 'LICENSE must be the Apache License 2.0');
}

// --- template.tpl ------------------------------------------------------------

const template = readFileSync('template.tpl', 'utf8');
const { sections, order } = splitSections(template);

check(isDeepStrictEqual(order, SECTION_ORDER), `template.tpl sections are ${order.join(', ')}; expected ${SECTION_ORDER.join(', ')}`);
check(sections.TERMS_OF_SERVICE === TERMS_OF_SERVICE, 'the ___TERMS_OF_SERVICE___ text differs from the standard gallery text');

const info = parseJson('___INFO___', sections.INFO || '');
if (info) {
  check(info.type === 'TAG', 'INFO.type must be TAG');
  check(info.id === 'cvt_temp_public_id', 'INFO.id must be cvt_temp_public_id');
  check(info.version === 1, 'INFO.version must be 1');
  check(info.displayName === 'ByAds Pixel', `INFO.displayName is "${info.displayName}"`);
  check(isDeepStrictEqual(info.containerContexts, ['WEB']), 'INFO.containerContexts must be ["WEB"]');

  const categories = info.categories || [];
  check(categories.length >= 1 && categories.length <= 3, `INFO.categories needs 1 to 3 values, has ${categories.length}`);
  check(categories.every((c) => CATEGORIES.includes(c)), `INFO.categories has values outside the gallery list: ${categories}`);
  check(new Set(categories).size === categories.length, 'INFO.categories has duplicates');

  const description = info.description || '';
  check(description.length > 0 && description.length <= 200, `INFO.description is ${description.length} characters (1 to 200)`);

  const brand = info.brand || {};
  check(brand.id === 'github.com_byadsco', `INFO.brand.id is "${brand.id}"; the gallery expects github.com_<repository owner>`);
  check(brand.displayName === 'ByAds', `INFO.brand.displayName is "${brand.displayName}"`);

  const prefix = 'data:image/png;base64,';
  const thumbnail = brand.thumbnail || '';
  check(thumbnail.startsWith(prefix), 'INFO.brand.thumbnail must be a PNG data URI');
  if (thumbnail.startsWith(prefix)) {
    const png = Buffer.from(thumbnail.slice(prefix.length), 'base64');
    const size = pngSize(png);
    check(size && size.width === size.height && size.width >= 48 && size.width <= 96,
      `the thumbnail must be a square PNG of 48 to 96 px${size ? `, it is ${size.width}x${size.height}` : ''}`);
    check(png.length < 50 * 1024, `the thumbnail is ${png.length} bytes (must be under 50 KB)`);
    check(existsSync('assets/icon-96.png') && png.equals(readFileSync('assets/icon-96.png')),
      'the thumbnail differs from assets/icon-96.png');
  }
}

const parameters = parseJson('___TEMPLATE_PARAMETERS___', sections.TEMPLATE_PARAMETERS || '');
if (parameters) {
  const { params, labels } = collectParameters(parameters);
  const byName = new Map();
  for (const p of params) {
    check(!byName.has(p.name), `parameter name "${p.name}" is used twice`);
    check(/^[a-z][A-Za-z0-9]*$/.test(p.name || ''), `parameter name "${p.name}" must be lowerCamelCase`);
    byName.set(p.name, p);
  }
  for (const [name, type] of Object.entries(PARAMETER_TYPES)) {
    const p = byName.get(name);
    check(p, `parameter "${name}" was removed; installed tags depend on it (breaking change)`);
    if (p) check(p.type === type, `parameter "${name}" changed type from ${type} to ${p.type} (breaking change)`);
  }
  for (const [path, values] of Object.entries(SELECT_VALUES)) {
    const [name, column] = path.split('.');
    const p = byName.get(name);
    const items = column ? ((p?.simpleTableColumns || []).find((c) => c.name === column)?.selectItems) : p?.selectItems;
    const present = (items || []).map((i) => i.value);
    for (const v of values) check(present.includes(v), `select value "${v}" was removed from ${path} (breaking change)`);
  }
  for (const label of labels) {
    const first = label.match(/[A-Za-z]/);
    check(!first || first[0] === first[0].toUpperCase(), `label should start with a capital letter: "${label}"`);
    for (const word of label.split(/[\s/:,()]+/).filter(Boolean).slice(1)) {
      check(!(/^[A-Z][a-z]+$/.test(word) && !PROPER_NOUNS.has(word)), `label is not in sentence case ("${word}"): "${label}"`);
    }
  }
}

const permissions = parseJson('___WEB_PERMISSIONS___', sections.WEB_PERMISSIONS || '');
const byId = {};
if (permissions) {
  for (const p of permissions) byId[p.instance.key.publicId] = p;
  const param = (id) => byId[id] && byId[id].instance.param[0].value;

  const urls = param('inject_script') && param('inject_script').listItem.map((i) => i.string);
  check(isDeepStrictEqual(urls, INJECT_SCRIPT_URLS), `inject_script URLs are ${JSON.stringify(urls)}; expected ${JSON.stringify(INJECT_SCRIPT_URLS)}`);

  const globals = param('access_globals') && param('access_globals').listItem.map((item) => {
    const entry = {};
    item.mapKey.forEach((k, i) => {
      const v = item.mapValue[i];
      entry[k.string] = v.string !== undefined ? v.string : v.boolean;
    });
    return entry;
  });
  check(isDeepStrictEqual(globals, GLOBALS), `access_globals differs from the contract: ${JSON.stringify(globals)}`);

  check(param('logging') && param('logging').string === 'debug', 'logging must be limited to the debug environment');
}

const code = sections.SANDBOXED_JS_FOR_WEB_TEMPLATE || '';
const apis = findRequiredApis(code, (m) => errors.push(m));
for (const api of apis) check(api in API_PERMISSION, `require('${api}') is not in the reviewed API list of scripts/validate.mjs`);
const needed = new Set(apis.filter((a) => a in API_PERMISSION).map((a) => API_PERMISSION[a]).filter(Boolean));
for (const p of needed) check(byId[p], `the ${p} permission is missing`);
for (const p of Object.keys(byId)) check(needed.has(p), `the ${p} permission is declared but no API uses it`);

check(code.includes(`const ENDPOINT = '${SCRIPT_ORIGIN}';`), `ENDPOINT must be ${SCRIPT_ORIGIN}`);
check(code.includes(`'${CACHE_TOKEN}');`), `injectScript must use the cache token '${CACHE_TOKEN}'`);
for (const line of GLOBAL_DECLARATIONS) check(code.includes(line), `the loader globals changed: missing \`${line}\``);

// --- metadata.yaml -----------------------------------------------------------

let shas = [];
if (!existsSync('metadata.yaml')) {
  errors.push('metadata.yaml is missing; without it the template is removed from the gallery');
} else {
  shas = readManifest(readFileSync('metadata.yaml', 'utf8'), 'metadata.yaml', (m) => errors.push(m)) || [];
  shas = shas.filter((s) => /^[0-9a-f]{40}$/.test(s));
  check(new Set(shas).size === shas.length, 'metadata.yaml lists the same sha twice');

  for (const sha of shas) {
    if (!gitOk('cat-file', '-e', `${sha}^{commit}`)) {
      errors.push(`metadata.yaml sha ${sha} is not a commit in this repository`);
      continue;
    }
    check(gitOk('merge-base', '--is-ancestor', sha, 'HEAD'), `metadata.yaml sha ${sha} is not reachable from HEAD (it must be on main)`);
    check(gitOk('cat-file', '-e', `${sha}:template.tpl`), `commit ${sha} has no template.tpl`);
  }
  // Newest first: each version must descend from the one listed after it.
  for (let i = 0; i + 1 < shas.length; i++) {
    check(gitOk('merge-base', '--is-ancestor', shas[i + 1], shas[i]),
      `metadata.yaml is not newest-first: ${shas[i + 1]} is listed after ${shas[i]} but is not its ancestor`);
  }
  if (shas.length && gitOk('cat-file', '-e', `${shas[0]}:template.tpl`)) {
    check(git('show', `${shas[0]}:template.tpl`) === template,
      `template.tpl differs from the newest version in metadata.yaml (${shas[0]}); add the new version at the top of metadata.yaml`);
  }

  // Published versions must stay listed, in order; new ones go on top.
  const explicitBase = process.env.VALIDATE_BASE_REF;
  const baseRef = explicitBase !== undefined ? explicitBase.trim() : 'origin/main';
  if (baseRef === '' || /^0+$/.test(baseRef)) {
    console.log('No base ref: skipping the published-versions check (first push only).');
  } else if (!gitOk('cat-file', '-e', `${baseRef}^{commit}`)) {
    errors.push(`base ref "${baseRef}" is not available. Fetch origin/main or set VALIDATE_BASE_REF; main must never be rewritten`);
  } else if (gitOk('cat-file', '-e', `${baseRef}:metadata.yaml`)) {
    const published = readManifest(git('show', `${baseRef}:metadata.yaml`), `metadata.yaml at ${baseRef}`,
      (m) => errors.push(m)) || [];
    const kept = shas.slice(Math.max(0, shas.length - published.length));
    check(published.length <= shas.length && isDeepStrictEqual(kept, published),
      `metadata.yaml dropped or reordered versions published at ${baseRef}; keep them and add new versions at the top`);
  }
}

// --- Result ------------------------------------------------------------------

if (errors.length) {
  console.error(`template validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`template validation passed (${shas.length} gallery version${shas.length === 1 ? '' : 's'})`);
