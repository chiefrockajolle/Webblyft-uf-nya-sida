// Klintens Måleri – exempelsida. Inget skickas någonstans.

// Mobilmeny
const nav = document.querySelector('.nav');
const menuBtn = document.querySelector('.menu-btn');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Stäng' : 'Meny';
});

// Kulörer: huset målas om och sidans accentfärg följer med
const swatches = document.querySelectorAll('.swatch');
const nameOut = document.querySelector('[data-color-name]');
const setColor = (c, save = true) => {
  const s = [...swatches].find((x) => x.dataset.color === c);
  const root = document.documentElement.style;
  root.setProperty('--house', c);
  let accent = (s && s.dataset.ink) || c;
  if (!s) try { accent = localStorage.getItem('klinten-accent') || c; } catch (e) {}
  root.setProperty('--accent', accent);
  swatches.forEach((x) => x.setAttribute('aria-pressed', String(x === s)));
  if (nameOut && s) nameOut.textContent = s.dataset.name;
  if (save) try { localStorage.setItem('klinten-farg', c); localStorage.setItem('klinten-accent', accent); } catch (e) {}
};
swatches.forEach((s) => s.addEventListener('click', () => setColor(s.dataset.color)));
try {
  const saved = localStorage.getItem('klinten-farg');
  if (saved) setColor(saved, false);
} catch (e) {}

// Före och efter
document.querySelectorAll('.compare').forEach((fig) => {
  const range = fig.querySelector('.compare__range');
  const set = () => fig.style.setProperty('--pos', range.value + '%');
  range.addEventListener('input', set);
  set();
});

// Offertformulär
const form = document.querySelector('.form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = form.querySelector('.error');
    const namn = form.namn.value.trim();
    const kontakt = form.kontakt.value.trim();
    if (!namn || !kontakt) {
      err.textContent = 'Fyll i namn och telefon eller mejl så vi kan höra av oss.';
      (namn ? form.kontakt : form.namn).focus();
      return;
    }
    err.textContent = '';
    document.querySelector('[data-name]').textContent = namn.split(' ')[0];
    form.classList.add('is-sent');
  });
}
