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
      .filter((s: { id?: string }) => typeof s.id === 'string' && s.id.startsWith('panel_'))
      .map((s: { label?: unknown }) =>
        typeof s.label === 'string' ? s.label : ((s.label as { ar?: string })?.ar ?? '')
      )
      .filter(Boolean);
  } catch {
    return [];
  }
}

const CSS = `
/* ---- Triple branded editor (dev) — matched to the Salla customizer ----
   Only the hero + section cards are dark/branded; the panel background and the
   ordinary fields keep the customizer's natural (light) look, as in the Twig
   theme. */

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

/* EVERY boolean field rendered as the customizer's pill switch (all the theme's
   booleans are format:switch — 0 are checkboxes), so the editor matches the
   Salla customizer / Twig experience instead of the engine's default checkbox.
   The light panel uses a grey→teal switch like Salla's; the section rule below
   is more specific, so section toggles keep their green-on-dark switch. */
.te-panel__body .te-checkbox{ appearance:none !important; -webkit-appearance:none !important;
  width:42px !important; height:23px !important; border-radius:999px !important; flex:0 0 auto; margin:0 !important;
  background:#cbd5e1 !important; border:1px solid rgba(0,0,0,.08) !important;
  position:relative; cursor:pointer; transition:background .2s; }
.te-panel__body .te-checkbox::after{ content:""; position:absolute; top:2px; left:2px; width:17px; height:17px;
  border-radius:50%; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.25); transition:transform .2s; }
.te-panel__body .te-checkbox:checked{ background:#0d9488 !important; border-color:#0d9488 !important; }
.te-panel__body .te-checkbox:checked::after{ transform:translateX(19px); }

/* The section toggle rendered as the customizer's pill switch (green on dark) */
.te-field.tr-ed-section .te-checkbox{ appearance:none !important; -webkit-appearance:none !important;
  width:42px !important; height:23px !important; border-radius:999px !important; flex:0 0 auto; margin:0 !important;
  background:rgba(255,255,255,.2) !important; border:1px solid rgba(255,255,255,.18) !important;
  position:relative; cursor:pointer; transition:background .2s; }
.te-field.tr-ed-section .te-checkbox::after{ content:""; position:absolute; top:2px; left:2px; width:17px; height:17px;
  border-radius:50%; background:#fff; transition:transform .2s; }
.te-field.tr-ed-section .te-checkbox:checked{ background:#8EF012 !important; border-color:#8EF012 !important; }
.te-field.tr-ed-section .te-checkbox:checked::after{ transform:translateX(19px); }

/* ---- All other field types, styled like the Salla customizer ---- */
.te-panel__body .te-field{ margin-bottom:15px; }
.te-panel__body .te-field__label{ display:block; font-size:13px; font-weight:600; color:#1f2937; margin-bottom:7px; }
.te-panel__body .te-field__help{ font-size:11.5px; line-height:1.5; color:#9ca3af; margin-top:6px; }

/* Text inputs, number inputs, selects */
.te-panel__body input.te-input, .te-panel__body select.te-input, .te-panel__body textarea.te-input{
  width:100%; min-height:42px; border:1px solid #e5e7eb; border-radius:11px; padding:9px 13px;
  font-size:13px; font-family:inherit; color:#1f2937; background:#fff; box-sizing:border-box;
  transition:border-color .15s, box-shadow .15s; }
.te-panel__body input.te-input:focus, .te-panel__body select.te-input:focus, .te-panel__body textarea.te-input:focus{
  outline:none; border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.12); }
.te-panel__body input.te-input::placeholder{ color:#b9c0c9; }

/* Select: custom chevron on the inline-start (RTL = left) */
.te-panel__body select.te-input{ appearance:none; -webkit-appearance:none; cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:left 13px center; padding-inline-start:36px; }

/* Color field: hex text input + a live swatch that opens a native picker
   (added by the enhancer, which wraps the input in .tr-color). */
.te-panel__body .tr-color{ position:relative; }
.te-panel__body .tr-color input.te-input{ padding-inline-start:46px; text-transform:uppercase; letter-spacing:.3px; }
.te-panel__body .tr-color__sw{ position:absolute; inset-inline-start:7px; top:50%; transform:translateY(-50%);
  width:28px; height:28px; border-radius:8px; border:1px solid rgba(0,0,0,.14); cursor:pointer; overflow:hidden;
  box-shadow:inset 0 0 0 2px #fff; }
.te-panel__body .tr-color__sw input[type=color]{ position:absolute; inset:-4px; width:140%; height:140%; border:0; padding:0; cursor:pointer; opacity:0; }

/* Icon field: show the actual sallaicons glyph next to the sicon-* name
   (the engine only shows the raw text; the real customizer shows the icon). */
.te-panel__body .tr-icon{ position:relative; }
.te-panel__body .tr-icon input.te-input{ padding-inline-start:46px; }
.te-panel__body .tr-icon__glyph{ position:absolute; inset-inline-start:7px; top:50%; transform:translateY(-50%);
  width:28px; height:28px; padding:0; border-radius:8px; display:flex; align-items:center; justify-content:center;
  background:#f3f4f6; border:1px solid #e5e7eb; color:#0d9488; font-size:17px; line-height:1; cursor:pointer;
  transition:border-color .15s, background .15s; }
.te-panel__body .tr-icon__glyph:hover{ border-color:#0d9488; background:#e9f7f5; }

/* Icon picker popover — searchable grid of all Salla icons (like the customizer) */
.tr-iconpicker{ position:fixed; z-index:99999; width:320px; max-height:388px; background:#fff;
  border:1px solid #e5e7eb; border-radius:14px; box-shadow:0 14px 44px rgba(0,0,0,.18);
  display:flex; flex-direction:column; overflow:hidden; direction:rtl; }
.tr-iconpicker__search{ margin:10px 10px 6px; height:38px; border:1px solid #e5e7eb; border-radius:9px;
  padding:0 12px; font-size:13px; font-family:inherit; color:#1f2937; }
.tr-iconpicker__search:focus{ outline:none; border-color:#0d9488; box-shadow:0 0 0 3px rgba(13,148,136,.12); }
.tr-iconpicker__grid{ flex:1; overflow-y:auto; padding:2px 10px 12px; display:grid;
  grid-template-columns:repeat(6,1fr); gap:6px; }
.tr-iconpicker__btn{ aspect-ratio:1; border:1px solid #eef0f2; border-radius:9px; background:#fff; color:#374151;
  font-size:19px; display:flex; align-items:center; justify-content:center; cursor:pointer;
  transition:border-color .12s, background .12s, color .12s; }
.tr-iconpicker__btn:hover{ border-color:#0d9488; color:#0d9488; background:#f5fbfa; }
.tr-iconpicker__btn.is-active{ border-color:#0d9488; background:#0d9488; color:#fff; }
.tr-iconpicker__empty{ grid-column:1/-1; padding:22px; text-align:center; color:#9ca3af; font-size:13px; }

/* Image picker */
.te-panel__body .te-image__pick{ border:1.5px dashed #d6dae0; border-radius:12px; background:#fafbfc;
  padding:14px; color:#6b7280; font-size:12.5px; transition:border-color .15s, background .15s; }
.te-panel__body .te-image__pick:hover{ border-color:#0d9488; background:#f5fbfa; }

/* Buttons */
.te-panel__body .te-btn{ border-radius:10px; font-size:12.5px; font-weight:600; }
.te-panel__body .te-btn--quiet{ color:#0d9488; }
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
  function normHex(v){ v=(v||'').trim(); var m=/^#([0-9a-fA-F]{3})$/.exec(v); if(m){var c=m[1].toLowerCase(); return '#'+c[0]+c[0]+c[1]+c[1]+c[2]+c[2];} m=/^#([0-9a-fA-F]{6})/.exec(v); return m? ('#'+m[1]) : '#000000'; }
  function setNative(el,val){ try{ var d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value'); d.set.call(el,val); }catch(e){ el.value=val; } el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
  function bindColor(inp, pick, sw){
    pick.addEventListener('input', function(){ sw.style.background=pick.value; setNative(inp, pick.value); });
    inp.addEventListener('input', function(){ sw.style.background=inp.value; try{ pick.value=normHex(inp.value); }catch(e){} });
  }
  function bindIcon(inp, glyph){
    inp.addEventListener('input', function(){ glyph.className = (inp.value||'').trim(); });
  }
  // Map the field's Arabic label to an icon keyword, so the picker opens filtered
  // to the icons that match the FIELD's purpose (title), not just its value.
  var AR2EN = {'بحث':'search','السلة':'shopping','سلة':'shopping','عربة':'cart','تسوق':'shopping','حساب':'user','العميل':'user','مستخدم':'user','قائمة':'menu','المفضلة':'heart','مفضلة':'heart','هاتف':'phone','جوال':'phone','تليفون':'phone','بريد':'mail','ايميل':'mail','واتس':'whatsapp','خريطة':'map','موقع':'map-pin','عنوان':'map-pin','لغة':'translate','عملة':'money','شحن':'truck','توصيل':'truck','هدية':'gift','تقييم':'star','نجمة':'star','دعم':'customer-service','مساعدة':'question','فيديو':'video','صورة':'image','صور':'image','وقت':'time','ساعة':'time','حماية':'shield','أمان':'shield','دفع':'bank-card'};
  function kwFor(input, cur){
    var fld = input.closest && input.closest('.te-field');
    var lab = fld ? (((fld.querySelector('.te-field__label')||{}).textContent)||'') : '';
    for(var key in AR2EN){ if(lab.indexOf(key)!==-1) return AR2EN[key]; }
    return (cur||'').replace(/^(sicon|ri)-/,'').split('-')[0]||'';
  }
  var ICONS=null, ICONS_LOADING=false, ICON_WAITERS=[];
  function loadIcons(cb){
    if(ICONS){ cb(ICONS); return; }
    ICON_WAITERS.push(cb);
    if(ICONS_LOADING) return; ICONS_LOADING=true;
    function grab(url){ return fetch(url).then(function(r){return r.text();}).catch(function(){return '';}); }
    Promise.all([
      grab('https://cdn.salla.network/fonts/sallaicons.css'),
      grab('https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css')
    ]).then(function(res){
      var out={}, m;
      // Remix (the larger, pro set) first, then Salla's own icons.
      var re2=/\\.ri-([a-z0-9-]+)\\s*:{1,2}before/gi; while((m=re2.exec(res[1]))) out['ri-'+m[1]]=1;
      var re1=/\\.sicon-([a-z0-9-]+)\\s*:{1,2}before/gi; while((m=re1.exec(res[0]))) out['sicon-'+m[1]]=1;
      ICONS=Object.keys(out); var w=ICON_WAITERS; ICON_WAITERS=[]; w.forEach(function(f){f(ICONS);});
    });
  }
  var openPicker=null;
  function onDocDown(e){ if(openPicker && !openPicker.contains(e.target) && !(e.target.closest && e.target.closest('.tr-icon__glyph'))) closePicker(); }
  function closePicker(){ if(openPicker){ openPicker.remove(); openPicker=null; document.removeEventListener('mousedown', onDocDown, true); } }
  function openIconPicker(input, glyphBtn){
    closePicker();
    var box=document.createElement('div'); box.className='tr-iconpicker';
    var search=document.createElement('input'); search.className='tr-iconpicker__search'; search.placeholder='ابحث عن أيقونة...';
    var grid=document.createElement('div'); grid.className='tr-iconpicker__grid';
    box.appendChild(search); box.appendChild(grid); document.body.appendChild(box); openPicker=box;
    var r=glyphBtn.getBoundingClientRect();
    box.style.top=Math.max(8, Math.min(r.bottom+6, window.innerHeight-396))+'px';
    box.style.left=Math.max(8, Math.min(r.left-286, window.innerWidth-328))+'px';
    var cur=(input.value||'').trim();
    // Pre-filter by the field's own icon family (e.g. "search" field opens on
    // the search icons). Cleared by the user to browse all.
    var kw=kwFor(input, cur);
    search.value=kw;
    function render(filter){
      grid.innerHTML='';
      if(!ICONS){ var l=document.createElement('div'); l.className='tr-iconpicker__empty'; l.textContent='...'; grid.appendChild(l); return; }
      var list=ICONS; if(filter){ var fl=filter.toLowerCase(); list=list.filter(function(n){return n.indexOf(fl)!==-1;}); }
      var shown=list.slice(0,300);
      if(!shown.length){ var e=document.createElement('div'); e.className='tr-iconpicker__empty'; e.textContent='مفيش نتائج'; grid.appendChild(e); return; }
      shown.forEach(function(name){
        var b=document.createElement('button'); b.type='button'; b.className='tr-iconpicker__btn'+(name===cur?' is-active':''); b.title=name;
        var i=document.createElement('i'); i.className=name; b.appendChild(i);
        b.addEventListener('click', function(){ setNative(input,name); var gi=glyphBtn.querySelector('i'); if(gi) gi.className=name; closePicker(); });
        grid.appendChild(b);
      });
    }
    render(kw);
    loadIcons(function(){ render(search.value.trim()); });
    search.addEventListener('input', function(){ render(search.value.trim()); });
    setTimeout(function(){ try{ search.focus(); }catch(e){} document.addEventListener('mousedown', onDocDown, true); }, 0);
  }
  function attachPicker(input, glyphBtn){ glyphBtn.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); openIconPicker(input, glyphBtn); }); }
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
    // Color fields: wrap each hex text input with a live swatch + native picker.
    var inps = body.querySelectorAll('.te-field input.te-input');
    for(var j=0;j<inps.length;j++){
      var inp = inps[j];
      if(inp.__trColor || inp.type!=='text') continue;
      if(!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test((inp.value||'').trim())) continue;
      inp.__trColor = true;
      var wrap = document.createElement('div'); wrap.className = 'tr-color';
      inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
      var sw = document.createElement('span'); sw.className = 'tr-color__sw'; sw.style.background = inp.value;
      var pick = document.createElement('input'); pick.type = 'color';
      try{ pick.value = normHex(inp.value); }catch(e){}
      sw.appendChild(pick); wrap.insertBefore(sw, inp);
      bindColor(inp, pick, sw);
    }
    // Icon fields: show the real sallaicons glyph next to the sicon-* name.
    var icons = body.querySelectorAll('.te-field input.te-input');
    for(var m=0;m<icons.length;m++){
      var iel = icons[m];
      if(iel.__trIcon || iel.type!=='text') continue;
      if(!/^(sicon|ri)-[\\w-]+$/.test((iel.value||'').trim())) continue;
      iel.__trIcon = true;
      var iw = document.createElement('div'); iw.className = 'tr-icon';
      iel.parentNode.insertBefore(iw, iel); iw.appendChild(iel);
      var gl = document.createElement('button'); gl.type = 'button'; gl.className = 'tr-icon__glyph'; gl.title = 'اختر أيقونة';
      var gi = document.createElement('i'); gi.className = (iel.value||'').trim(); gl.appendChild(gi);
      iw.insertBefore(gl, iel);
      bindIcon(iel, gi);
      attachPicker(iel, gl);
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
            {
              tag: 'link',
              attrs: {
                rel: 'stylesheet',
                href: 'https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css',
              },
              injectTo: 'head',
            },
            { tag: 'style', attrs: { 'data-triple-editor': '' }, children: CSS, injectTo: 'head' },
            { tag: 'script', children: buildScript(sections), injectTo: 'body' },
          ],
        };
      },
    },
  };
}

export default brandedEditor;
