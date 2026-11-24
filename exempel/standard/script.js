// Klintens Måleri – exempelsida. Inget skickas någonstans.

// Mobilmeny
const nav = document.querySelector('.nav');
const menuBtn = document.querySelector('.menu-btn');
menuBtn.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Stäng' : 'Meny';
});

// Kulörer: hela sidans accentfärg byts
const swatches = document.querySelectorAll('.swatch');
const setColor = (c) => {
  document.documentElement.style.setProperty('--accent', c);
  swatches.forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.color === c)));
  try { localStorage.setItem('klinten-farg', c); } catch (e) {}
};
swatches.forEach((s) => s.addEventListener('click', () => setColor(s.dataset.color)));
try {
  const saved = localStorage.getItem('klinten-farg');
  if (saved) {
    document.documentElement.style.setProperty('--accent', saved);
    swatches.forEach((s) => s.setAttribute('aria-pressed', String(s.dataset.color === saved)));
  }
} catch (e) {}

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
