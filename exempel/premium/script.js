// Kafé Måsskri – exempelsida. Ingenting skickas eller bokas på riktigt.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- Navigering ---------- */
const nav = $('.nav');
const menuBtn = $('.menu-btn');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Stäng' : 'Meny';
});
addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 10), { passive: true });

// Mjukt sidbyte mellan undersidorna
$$('a[href$=".html"]').forEach((a) => a.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || a.target) return;
  e.preventDefault();
  document.body.classList.add('is-leaving');
  setTimeout(() => { location.href = a.href; }, 220);
}));
addEventListener('pageshow', () => document.body.classList.remove('is-leaving'));

/* ---------- Visas när man scrollar fram ---------- */
const io = new IntersectionObserver((entries) => entries.forEach((en) => {
  if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
}), { threshold: 0.15 });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 90}ms`; io.observe(el); });

/* ---------- Öppet just nu ---------- */
const HOURS = { 0: [10, 16], 1: null, 2: [9, 17], 3: [9, 17], 4: [9, 22], 5: [9, 18], 6: [10, 18] };
const DAYS = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
function openText() {
  const now = new Date();
  const d = now.getDay();
  const h = now.getHours() + now.getMinutes() / 60;
  const today = HOURS[d];
  if (today && h >= today[0] && h < today[1]) return [true, `Öppet just nu, stänger kl ${today[1]}`];
  if (today && h < today[0]) return [false, `Stängt, öppnar kl ${today[0]} i dag`];
  for (let i = 1; i <= 7; i++) {
    const nd = (d + i) % 7;
    if (HOURS[nd]) return [false, `Stängt, öppnar ${i === 1 ? 'i morgon' : 'på ' + DAYS[nd]} kl ${HOURS[nd][0]}`];
  }
  return [false, 'Stängt'];
}
function updateStatus() {
  const [open, text] = openText();
  $$('[data-status]').forEach((el) => { el.textContent = text; el.classList.toggle('is-open', open); });
}
updateStatus();
setInterval(updateStatus, 60000);
const todayRow = $(`[data-hours] tr[data-day="${new Date().getDay()}"]`);
if (todayRow) todayRow.classList.add('is-today');

/* ---------- Meny: kategori och filter ---------- */
const list = $('.menu-list');
if (list) {
  let cat = 'alla';
  const tags = new Set();
  const render = () => {
    let shown = 0;
    $$('.dish', list).forEach((d) => {
      const ok = (cat === 'alla' || d.dataset.cat === cat) && [...tags].every((t) => d.dataset.tags.includes(t));
      d.hidden = !ok;
      if (ok) { shown++; d.style.animation = 'none'; void d.offsetWidth; d.style.animation = ''; }
    });
    $('.menu-empty').hidden = shown > 0;
  };
  $$('.tabs .chip').forEach((b) => b.addEventListener('click', () => {
    $$('.tabs .chip').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    cat = b.dataset.cat;
    render();
  }));
  $$('.filters .chip').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    on ? tags.add(b.dataset.tag) : tags.delete(b.dataset.tag);
    render();
  }));
}

/* ---------- Boka bord ---------- */
const days = $('[data-days]');
if (days) {
  const state = { date: null, guests: 2, time: null };
  const fmtDay = (d) => d.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' });
  const TIMES = ['11:30', '12:00', '12:30', '13:00', '14:00', '15:00', '17:00', '18:30', '19:30'];

  // Fjorton dagar framåt, måndagar stängt
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const last = new Date(start); last.setDate(start.getDate() + 13);
  const m1 = start.toLocaleDateString('sv-SE', { month: 'long' });
  const m2 = last.toLocaleDateString('sv-SE', { month: 'long' });
  $('[data-month]').textContent = m1 === m2 ? m1 : `${m1} och ${m2}`;
  for (let i = 0; i < 14; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'day';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<small>${i === 0 ? 'i dag' : d.toLocaleDateString('sv-SE', { weekday: 'short' })}</small><b>${d.getDate()}</b>`;
    b.setAttribute('aria-label', fmtDay(d));
    if (!HOURS[d.getDay()]) { b.disabled = true; b.title = 'Stängt'; }
    b.addEventListener('click', () => {
      $$('.day', days).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      state.date = d;
      state.time = null;
      renderTimes();
      sum();
    });
    days.append(b);
  }

  // Tider: några är "fullbokade", olika för varje dag och antal
  const times = $('[data-times]');
  function renderTimes() {
    times.innerHTML = '';
    if (!state.date) { times.innerHTML = '<p style="color:var(--muted)">Välj en dag först.</p>'; return; }
    const [o, c] = HOURS[state.date.getDay()];
    const now = new Date();
    TIMES.forEach((t, i) => {
      const [hh, mm] = t.split(':').map(Number);
      if (hh < o || hh + mm / 60 > c - 1) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t;
      b.setAttribute('aria-pressed', String(state.time === t));
      const past = state.date.toDateString() === now.toDateString() && hh + mm / 60 <= now.getHours() + now.getMinutes() / 60;
      const full = (state.date.getDate() * 7 + i * 3 + state.guests * 5) % 5 === 0;
      if (past || full) { b.disabled = true; b.title = past ? 'Tiden har passerat' : 'Fullbokat'; }
      b.addEventListener('click', () => {
        state.time = t;
        $$('.chip', times).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        sum();
      });
      times.append(b);
    });
    if (!times.children.length) times.innerHTML = '<p style="color:var(--muted)">Inga tider kvar den dagen.</p>';
  }
  renderTimes();

  const guestsOut = $('[data-guests]');
  $$('[data-count]').forEach((b) => b.addEventListener('click', () => {
    state.guests = Math.min(10, Math.max(1, state.guests + Number(b.dataset.count)));
    guestsOut.textContent = state.guests;
    if (state.date) { const keep = state.time; renderTimes(); if (keep && !$$('.chip', times).some((x) => x.textContent === keep && !x.disabled)) state.time = null; }
    sum();
  }));

  function sum() {
    $('[data-sum-day]').textContent = state.date ? fmtDay(state.date) : 'Välj en dag';
    $('[data-sum-guests]').textContent = `${state.guests} ${state.guests === 1 ? 'person' : 'personer'}`;
    $('[data-sum-time]').textContent = state.time ? `kl ${state.time}` : 'Välj en tid';
    $('[data-error]').textContent = '';
  }

  const summary = $('.summary');
  $('[data-book]').addEventListener('click', () => {
    const name = $('[data-name]').value.trim();
    const phone = $('[data-phone]').value.trim();
    const missing = !state.date ? 'en dag' : !state.time ? 'en tid' : !name ? 'ert namn' : !phone ? 'ett telefonnummer' : '';
    if (missing) { $('[data-error]').textContent = `Välj eller fyll i ${missing} först.`; return; }
    $('[data-confirm-title]').textContent = `Välkomna, ${name.split(' ')[0]}!`;
    $('[data-confirm-text]').textContent = `Bord för ${state.guests} ${fmtDay(state.date)} kl ${state.time}.`;
    summary.classList.add('is-done');
    if (innerWidth < 900) summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('[data-again]').addEventListener('click', () => summary.classList.remove('is-done'));
}

/* ---------- Blogg: inlägg via adressen (#saffran) ---------- */
const blogList = $('[data-blog-list]');
if (blogList) {
  const route = () => {
    const id = location.hash.slice(1);
    const post = id && $(`[data-post="${id}"]`);
    $$('[data-post]').forEach((a) => { a.hidden = a !== post; });
    blogList.hidden = !!post;
    $('[data-blog-head]').hidden = !!post;
    if (post) $$('.reveal').forEach((el) => el.classList.add('is-in'));
    scrollTo(0, 0);
  };
  $$('.back').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); history.pushState('', '', location.pathname); route(); }));
  addEventListener('hashchange', route);
  route();
}

/* ---------- Kontaktformulär ---------- */
const form = $('.form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('.error', form);
    const namn = form.namn.value.trim();
    const mejl = form.mejl.value.trim();
    if (!namn || !/^\S+@\S+\.\S+$/.test(mejl)) {
      err.textContent = !namn ? 'Skriv ert namn.' : 'Kolla att mejladressen stämmer.';
      return;
    }
    $('[data-thanks]').textContent = namn.split(' ')[0];
    form.classList.add('is-sent');
  });
}
