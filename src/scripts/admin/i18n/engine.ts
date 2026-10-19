// Admin panel language switch (English / 日本語).
//
// The templates stay in English. When Japanese is chosen, every known English
// text (text nodes, placeholders, titles, aria-labels, button values, dialogs
// and server messages) is replaced from ./dictionary and ./patterns. Anything
// that is not in the dictionary – station names, user input – is left alone.
// The choice is kept in localStorage ("admin-lang").

import { ADMIN_JA } from "./dictionary";
import { ADMIN_PATTERNS } from "./patterns";
import { translate as translateRich } from "./admin-dict";

export type AdminLang = "en" | "ja";

const STORAGE_KEY = "admin-lang";
const ATTRIBUTES = ["placeholder", "aria-label", "title", "alt"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "CODE"]);

type Tracked = { original: string; applied: string };

const textState = new WeakMap<Text, Tracked>();
const attrState = new WeakMap<Element, Record<string, Tracked>>();

let lang: AdminLang = "en";
let observer: MutationObserver | null = null;
let busy = false;

/* ---------- lookup ---------- */

function translateCore(core: string): string | null {
  const flat = core.replace(/\s+/g, " ");
  const rich = translateRich(flat);
  if (rich) return rich;

  const hit = ADMIN_JA[flat];
  if (hit) return hit;

  for (const rule of ADMIN_PATTERNS) {
    const out = rule(flat);
    if (out) return out;
  }

  return null;
}

/** Translate a string, keeping its leading / trailing whitespace. */
export function translate(text: string): string {
  const core = text.trim();
  if (!core) return text;

  const out = translateCore(core);
  if (!out) return text;

  const start = text.slice(0, text.indexOf(core));
  const end = text.slice(text.indexOf(core) + core.length);
  return start + out + end;
}

/* ---------- applying ---------- */

function skip(el: Element | null): boolean {
  return !!el && (SKIP_TAGS.has(el.tagName) || !!el.closest("[data-no-i18n]"));
}

function applyText(node: Text): void {
  if (skip(node.parentElement)) return;

  const state = textState.get(node);
  // Text changed by the page itself since we last touched it → new original.
  const original = state && node.data === state.applied ? state.original : node.data;

  let next = lang === "ja" ? translate(original) : original;

  // "Update <b>Tokyo</b>: …" → "<b>Tokyo</b>：…" (the verb is dropped when a name follows)
  if (lang === "ja" && original.trim() === "Update" && node.nextSibling?.nodeType === Node.ELEMENT_NODE) {
    next = "";
  }

  if (next !== node.data) node.data = next;

  if (next !== original || state) {
    textState.set(node, { original, applied: next });
  }
}

function applyAttributes(el: Element): void {
  // textarea / code are skipped for their text, but their placeholder is UI text
  if (el.closest("[data-no-i18n]")) return;

  const names: string[] = [...ATTRIBUTES];
  if (el instanceof HTMLInputElement && ["submit", "button"].includes(el.type)) {
    names.push("value");
  }

  for (const name of names) {
    const current = el.getAttribute(name);
    if (current === null) continue;

    const states = attrState.get(el) ?? {};
    const state = states[name];
    const original = state && current === state.applied ? state.original : current;
    const next = lang === "ja" ? translate(original) : original;

    if (next !== current) el.setAttribute(name, next);

    if (next !== original || state) {
      states[name] = { original, applied: next };
      attrState.set(el, states);
    }
  }
}

function applyTree(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    applyText(root as Text);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) {
    return;
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
  );

  if (root.nodeType === Node.ELEMENT_NODE) applyAttributes(root as Element);

  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) applyText(node as Text);
    else applyAttributes(node as Element);
    node = walker.nextNode();
  }
}

let titleOriginal: string | null = null;

function applyTitle(): void {
  if (titleOriginal === null) titleOriginal = document.title;

  document.title =
    lang === "ja"
      ? titleOriginal
          .split(" | ")
          .map((part) => translate(part))
          .join(" | ")
      : titleOriginal;
}

function applyAll(): void {
  busy = true;
  applyTree(document.body);
  applyTitle();
  observer?.takeRecords();
  busy = false;
}

/* ---------- live updates (search refresh, dialogs, validation…) ---------- */

function startObserver(): void {
  if (observer) return;

  observer = new MutationObserver((records) => {
    if (busy) return;
    busy = true;

    for (const record of records) {
      if (record.type === "childList") {
        record.addedNodes.forEach((node) => applyTree(node));
      } else if (record.type === "characterData") {
        applyTree(record.target);
      } else if (record.type === "attributes" && record.target instanceof Element) {
        applyAttributes(record.target);
      }
    }

    observer?.takeRecords();
    busy = false;
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRIBUTES, "value"],
  });
}

/* ---------- switch ---------- */

function syncSwitches(): void {
  document.querySelectorAll<HTMLElement>("[data-admin-lang]").forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.adminLang === lang),
    );
  });
}

export function setLang(next: AdminLang): void {
  lang = next;

  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* private mode: the choice just lasts for this page */
  }

  document.documentElement.lang = next === "ja" ? "ja" : "en";
  syncSwitches();
  applyAll();
}

function readStored(): AdminLang {
  try {
    return localStorage.getItem(STORAGE_KEY) === "ja" ? "ja" : "en";
  } catch {
    return "en";
  }
}

export function initAdminI18n(): void {
  lang = readStored();

  // Native dialogs (confirm / alert) go through the same dictionary.
  const nativeConfirm = window.confirm.bind(window);
  const nativeAlert = window.alert.bind(window);
  window.confirm = (message?: string) =>
    nativeConfirm(lang === "ja" && message ? translate(message) : message);
  window.alert = (message?: unknown) =>
    nativeAlert(lang === "ja" && typeof message === "string" ? translate(message) : message);

  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>("[data-admin-lang]");
    if (button) setLang(button.dataset.adminLang === "ja" ? "ja" : "en");
  });

  startObserver();
  document.documentElement.lang = lang === "ja" ? "ja" : "en";
  syncSwitches();
  if (lang === "ja") applyAll();

  // page is ready: show it (see the inline guard in AdminLayout)
  document.documentElement.classList.remove("admin-i18n-pending");
}
