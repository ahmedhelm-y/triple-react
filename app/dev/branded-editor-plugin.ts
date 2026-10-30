/**
 * Triple branded theme-editor (DEV ONLY).
 *
 * The local theme editor (`/__twilight/editor`, `@salla.sa/twilight-theme-engine`)
 * renders settings as a flat `te-*` list and ignores the `static` HTML/CSS blocks
 * that the Twig theme ("ثيم تريبل", theme 1270023187) uses to brand its settings
 * panel. That editor is the engine's own React app, not part of this theme's tree,
 * so it can't be styled from the theme's CSS.
 *
 * This Vite plugin restyles it from the outside: it injects branded CSS + a small
 * enhancer script into the editor page's HTML (transformIndexHtml, serve only).
 * The section-card styling (dark card, Triple mark, animated sparks, green border)
 * is the exact port of the live customizer's `.s-toggle[name^='section_']` rule;
 * the toggle checkbox is restyled into the pill switch the customizer shows, and a
 * branded hero card is inserted at the top. No-op in production and on the
 * storefront; the editor top bar/preview are left untouched.
 *
 * Section rows are matched by their visible label, read fresh from twilight.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/** The Triple mark (green + white slashes), exactly as the Twig theme embeds it. */
const LOGO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 316 315'%3E%3Cpath fill='%238EF012' d='M 222 8 C 220 9, 218 11, 216 12 C 213 15, 147 167, 147 171 C 147 178, 147 178, 192 178 C 236 178, 236 178, 241 171 C 245 166, 310 17, 310 13 C 310 6, 311 6, 265 6 C 227 6, 224 6, 222 8 M 83 55 C 76 57, 75 59, 40 140 C 21 182, 6 218, 6 220 C 6 227, 9 227, 54 227 L 92 227 96 224 C 101 220, 99 225, 137 138 C 172 58, 172 59, 165 55 C 163 54, 88 54, 83 55'/%3E%3Cpath fill='%23fff' d='M 137 194 C 132 197, 133 196, 108 253 C 86 302, 86 303, 90 306 C 92 309, 170 309, 174 306 C 179 302, 180 301, 203 250 C 224 200, 225 197, 222 193 L 221 191 181 191 L 140 191 137 194'/%3E%3C/svg%3E";

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
/* ---- Triple branded editor (dev) — matched to the Salla customizer ---- */
.te-panel, .te-panel__body { background:#09090d !important; }
.te-panel__head, .te-panel__foot { background:#09090d !important; border-color:rgba(142,240,18,.14) !important; }
.te-panel__head, .te-panel__head *, .te-panel__foot * { color:#dfe3ea !important; }
.te-panel__body { padding:14px !important; }

/* Hero card (quick_actions_1) */
.tr-ed-hero{ position:relative; overflow:hidden; border-radius:18px; margin:2px 0 16px; padding:22px 18px 18px;
  background:linear-gradient(168deg,#0C0C10 0%,#08080c 55%,#060610 100%);
  border:1px solid rgba(142,240,18,.20); color:#fff; direction:rtl; text-align:center; }
.tr-ed-hero::after{ content:""; position:absolute; inset:0; pointer-events:none; background:
  radial-gradient(60px 60px at 85% 16%, rgba(142,240,18,.14), transparent 70%),
  radial-gradient(80px 80px at 12% 88%, rgba(142,240,18,.10), transparent 70%); }
.tr-ed-hero__brand{ display:flex; align-items:center; justify-content:center; gap:10px; position:relative; z-index:1; }
.tr-ed-hero__logo{ width:34px; height:30px; display:inline-block; background:url("${LOGO}") no-repeat center/contain; }
.tr-ed-hero__name{ font-size:25px; font-weight:800; line-height:1; letter-spacing:.5px; }
.tr-ed-hero__name b{ color:#8EF012; font-weight:800; }
.tr-ed-hero__tag{ font-size:12px; color:#9db87f; margin-top:7px; position:relative; z-index:1; }
.tr-ed-hero__title{ font-size:15px; font-weight:700; margin:16px 0 13px; position:relative; z-index:1; }
.tr-ed-hero__btn{ display:inline-flex; align-items:center; gap:8px; padding:11px 20px; border-radius:12px;
  background:rgba(142,240,18,.07); border:1px solid rgba(142,240,18,.32); color:#fff; font-size:13px;
  font-weight:700; text-decoration:none; position:relative; z-index:1; transition:background .2s; }
.tr-ed-hero__btn:hover{ background:rgba(142,240,18,.14); }

/* Section cards — exact port of the customizer's .s-toggle[name^='section_'] */
.te-field.tr-ed-section{ position:relative; display:block; margin-top:13px; padding:15px 14px;
  padding-inline-start:46px; border-radius:13px; border:1px solid rgba(142,240,18,.22);
  color:#fff; font-weight:700; background-color:#0C0C10;
  background-image:url("${LOGO}"),
    radial-gradient(circle,#B8F55C 0 1.3px,transparent 2px),
    radial-gradient(circle,#8EF012 0 1.1px,transparent 1.7px),
    radial-gradient(circle,#A6F23F 0 1px,transparent 1.5px),
    linear-gradient(90deg,transparent,rgba(142,240,18,.5),transparent),
    radial-gradient(70% 120% at 50% -30%,rgba(142,240,18,.16),transparent 70%),
    linear-gradient(135deg,#10170a,#0C0C10);
  background-size:20px 20px,6px 6px,6px 6px,6px 6px,100% 1px,100% 100%,100% 100%;
  background-repeat:no-repeat;
  background-position:right 14px center,32% calc(100% + 8px),48% calc(100% + 34px),64% calc(100% + 60px),0 100%,0 0,0 0;
  animation:trHeadSparks 4.2s linear infinite; transition:border-color .3s; }
.te-field.tr-ed-section:hover{ border-color:rgba(142,240,18,.5); }
@keyframes trHeadSparks{
  from{background-position:right 14px center,32% calc(100% + 8px),48% calc(100% + 34px),64% calc(100% + 60px),0 100%,0 0,0 0}
  to{background-position:right 14px center,32% -10px,48% -10px,64% -10px,0 100%,0 0,0 0}}
.te-field.tr-ed-section > .te-field--row{ margin:0 !important; align-items:center; gap:10px; }
.te-field.tr-ed-section .te-field__label{ color:#fff !important; font-weight:800 !important; font-size:14.5px !important; }

/* The section toggle rendered as the customizer's pill switch */
.te-field.tr-ed-section .te-checkbox{ appearance:none !important; -webkit-appearance:none !important;
  width:42px !important; height:23px !important; border-radius:999px !important; flex:0 0 auto; margin:0 !important;
  background:rgba(255,255,255,.2) !important; border:1px solid rgba(255,255,255,.18) !important;
  position:relative; cursor:pointer; transition:background .2s; }
.te-field.tr-ed-section .te-checkbox::after{ content:""; position:absolute; top:2px; left:2px; width:17px; height:17px;
  border-radius:50%; background:#fff; transition:transform .2s; }
.te-field.tr-ed-section .te-checkbox:checked{ background:#8EF012 !important; border-color:#8EF012 !important; }
.te-field.tr-ed-section .te-checkbox:checked::after{ transform:translateX(19px); }

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
  var HERO =
    '<div class="tr-ed-hero">'
    + '<div class="tr-ed-hero__brand"><span class="tr-ed-hero__logo"></span>'
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
      if(SECTIONS.indexOf(lbl.textContent.trim()) !== -1) f.classList.add('tr-ed-section');
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
