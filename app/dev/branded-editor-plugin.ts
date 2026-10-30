/**
 * Triple branded theme-editor (DEV ONLY).
 *
 * The local theme editor (`/__twilight/editor`, `@salla.sa/twilight-theme-engine`)
 * renders settings as a flat, unstyled list with `te-*` classes and ignores the
 * `static` HTML/CSS blocks that the Twig theme used to brand its settings panel
 * (the dark section cards + the logo header card). That editor is the engine's
 * own React app, not part of this theme's tree, so it can't be styled from the
 * theme's CSS.
 *
 * This Vite plugin restyles it from the outside: it injects a `<style>` (the
 * branded dark cards + hero) and a small `<script>` enhancer (tags each section
 * row and drops in the hero card) into the editor page's HTML, only while the
 * dev server is serving it. Production builds and the storefront are untouched.
 *
 * Section rows are matched by their visible label, read fresh from the repo's
 * `twilight.json` on each load, so adding/renaming a `section_*` keeps working.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/** Triple mark — the three skewed slashes (two green, one white). */
const LOGO_SVG = `<svg viewBox="0 0 46 34" width="30" height="24" aria-hidden="true"><g transform="skewX(-16)"><rect x="4" y="2" width="9" height="30" rx="2.5" fill="#8EF012"/><rect x="17" y="2" width="9" height="30" rx="2.5" fill="#B8F55C"/><rect x="30" y="2" width="9" height="30" rx="2.5" fill="#ffffff"/></g></svg>`;

function readSectionLabels(root: string): string[] {
  try {
    const tw = JSON.parse(fs.readFileSync(path.join(root, 'twilight.json'), 'utf8'));
    return (tw.settings ?? [])
      .filter((s: { id?: string }) => typeof s.id === 'string' && s.id.startsWith('section_'))
      .map((s: { label?: unknown }) =>
        typeof s.label === 'string' ? s.label : ((s.label as { ar?: string })?.ar ?? '')
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

const CSS = `
/* ---- Triple branded editor (dev) ---- scoped to the settings panel only, so
   the editor's top bar / rail / preview keep their normal look. ---- */
.te-panel, .te-panel__body { background:#09090d !important; }
.te-panel__head, .te-panel__foot { background:#09090d !important; border-color:rgba(142,240,18,.14) !important; }
.te-panel__head, .te-panel__head * { color:#dfe3ea !important; }
.te-panel__foot * { color:#dfe3ea !important; }
.te-panel__body { padding:14px !important; }

/* Hero card */
.tr-ed-hero{ position:relative; overflow:hidden; border-radius:18px; margin:2px 0 16px; padding:22px 18px 18px;
  background:linear-gradient(168deg,#0C0C10 0%,#08080c 55%,#06060f 100%);
  border:1px solid rgba(142,240,18,.20); color:#fff; direction:rtl; text-align:center; }
.tr-ed-hero::after{ content:""; position:absolute; inset:0; background:
  radial-gradient(60px 60px at 85% 18%, rgba(142,240,18,.14), transparent 70%),
  radial-gradient(80px 80px at 12% 85%, rgba(142,240,18,.10), transparent 70%); pointer-events:none; }
.tr-ed-hero__brand{ display:flex; align-items:center; justify-content:center; gap:10px; position:relative; z-index:1; }
.tr-ed-hero__name{ font-size:25px; font-weight:800; line-height:1; letter-spacing:.5px; }
.tr-ed-hero__name b{ color:#8EF012; font-weight:800; }
.tr-ed-hero__tag{ font-size:12px; color:#9db87f; margin-top:7px; position:relative; z-index:1; }
.tr-ed-hero__title{ font-size:15px; font-weight:700; margin:16px 0 13px; position:relative; z-index:1; }
.tr-ed-hero__btn{ display:inline-flex; align-items:center; gap:8px; padding:11px 20px; border-radius:12px;
  background:rgba(142,240,18,.07); border:1px solid rgba(142,240,18,.32); color:#fff; font-size:13px;
  font-weight:700; text-decoration:none; position:relative; z-index:1; transition:background .2s; }
.tr-ed-hero__btn:hover{ background:rgba(142,240,18,.14); }

/* Section cards */
.te-field.tr-ed-section{ position:relative; margin-top:13px; padding:15px 14px; border-radius:13px;
  border:1px solid rgba(142,240,18,.22); color:#fff;
  background:linear-gradient(90deg,#101806 0%,#0C0C10 58%);
  box-shadow:0 0 0 1px rgba(142,240,18,.03), 0 12px 26px -20px rgba(142,240,18,.55); }
.te-field.tr-ed-section > .te-field--row{ margin:0 !important; align-items:center; }
.te-field.tr-ed-section .te-field__label{ color:#fff !important; font-weight:800 !important; font-size:14.5px !important; }
.tr-ed-logo{ display:inline-flex; align-items:center; margin-inline-start:9px; flex:0 0 auto; }

/* Regular fields */
.te-field{ color:#e5e7eb; margin-top:9px; }
.te-field__label{ color:#cfd3da !important; }
.te-field__help{ color:#7f8794 !important; }
.te-input, select.te-input, .te-field input[type=text], .te-field input[type=number], .te-field textarea, .te-field select{
  background:#111318 !important; border:1px solid rgba(255,255,255,.12) !important; color:#fff !important; border-radius:9px !important; }
.te-link-btn, .te-btn--quiet { color:#8EF012 !important; }
`;

function buildScript(sections: string[]): string {
  return `(function(){
  var SECTIONS = ${JSON.stringify(sections)};
  var LOGO = ${JSON.stringify(LOGO_SVG)};
  var HERO =
    '<div class="tr-ed-hero">'
    + '<div class="tr-ed-hero__brand"><span class="tr-ed-hero__logo">' + LOGO + '</span>'
    + '<span class="tr-ed-hero__name">تريبل <b>ثيم</b></span></div>'
    + '<div class="tr-ed-hero__tag">صمّم متجرك كما تحب</div>'
    + '<div class="tr-ed-hero__title">كل أدوات التخصيص بين يديك.</div>'
    + '<a class="tr-ed-hero__btn" href="https://s.salla.sa/" target="_blank" rel="noopener">تواصل معنا عبر واتساب</a>'
    + '</div>';
  function enhance(){
    var body = document.querySelector('.te-panel__body');
    if(!body) return;
    if(!body.querySelector('.tr-ed-hero')){
      var h = document.createElement('div'); h.innerHTML = HERO;
      body.insertBefore(h.firstChild, body.firstChild);
    }
    var fields = body.querySelectorAll('.te-field');
    for(var i=0;i<fields.length;i++){
      var f = fields[i];
      var lbl = f.querySelector('.te-field__label');
      if(!lbl) continue;
      var isSection = SECTIONS.indexOf(lbl.textContent.trim()) !== -1;
      if(isSection && !f.classList.contains('tr-ed-section')){
        f.classList.add('tr-ed-section');
        var row = f.querySelector('.te-field--row') || f;
        var logo = document.createElement('span');
        logo.className = 'tr-ed-logo'; logo.innerHTML = LOGO;
        row.insertBefore(logo, row.firstChild);
      }
    }
  }
  var t = null;
  function schedule(){ if(t) return; t = setTimeout(function(){ t=null; enhance(); }, 80); }
  function boot(){
    if(!document.querySelector('.te-panel__body')){ setTimeout(boot, 250); return; }
    enhance();
    new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();`;
}

export function brandedEditor(): Plugin {
  const root = process.cwd();
  return {
    name: 'triple-branded-editor',
    apply: 'serve',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        // Only the engine's theme-editor page, not the storefront HTML.
        if (!html.includes('virtual:twilight/editor')) return;
        const sections = readSectionLabels(root);
        return {
          html,
          tags: [
            { tag: 'style', attrs: { 'data-triple-editor': '' }, children: CSS, injectTo: 'head' },
            { tag: 'script', children: buildScript(sections), injectTo: 'body' },
          ],
        };
      },
    },
  };
}

export default brandedEditor;
