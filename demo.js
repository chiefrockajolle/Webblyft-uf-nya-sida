/* =========================================================
   Webblyft UF – interaktiv demo i konceptdelen
   Tre påhittade företag med små sidor som går att klicka runt i.
   Ingenting skickas någonstans, allt händer bara i webbläsaren.
   ========================================================= */

(() => {
  const demo = document.querySelector('.demo');
  if (!demo) return;

  const $ = (sel, root = demo) => root.querySelector(sel);
  const $$ = (sel, root = demo) => [...root.querySelectorAll(sel)];
  const viewport = $('.demo__viewport');
  const frame = $('.demo__frame');
  const url = $('.demo__url');
  const urls = { cafe: 'kafemasskri.se', bygg: 'bradaochbult.se', gard: 'ullkullen.se' };
  const kr = (n) => `${Math.round(n).toLocaleString('sv-SE')} kr`;

  // Gör en knapp aktiv bland sina syskon
  const activate = (btn, attr = 'aria-selected') => {
    [...btn.parentElement.children].forEach((b) => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      if (b.hasAttribute(attr)) b.setAttribute(attr, String(on));
    });
  };

  /* ---- Byt företag ---- */
  $$('.demo__opt').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.classList.contains('is-active')) return;
    activate(btn);
    const id = btn.dataset.site;
    url.textContent = urls[id];
    frame.classList.add('is-switching');
    setTimeout(() => {
      $$('.ds').forEach((s) => {
        const on = s.dataset.site === id;
        s.hidden = !on;
        s.classList.toggle('is-active', on);
      });
      viewport.scrollTop = 0;
      frame.classList.remove('is-switching');
    }, 280);
  }));

  /* ---- Dator / mobil ---- */
  $$('.demo__device button').forEach((btn) => btn.addEventListener('click', () => {
    activate(btn, 'aria-pressed');
    demo.classList.toggle('is-mobile', btn.dataset.device === 'mobile');
  }));

  /* ---- Länkar inne i demosidorna scrollar inom ramen ---- */
  $$('[data-jump]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const site = a.closest('.ds');
    const target = $(`[data-anchor="${a.dataset.jump}"]`, site);
    if (target) viewport.scrollTo({ top: target.offsetTop - 8, behavior: 'smooth' });
  }));

  /* ---- Kafé: menyflikar ---- */
  $$('.cafe-tabs button').forEach((btn) => btn.addEventListener('click', () => {
    activate(btn);
    $$('.cafe-list').forEach((l) => l.classList.toggle('is-active', l.dataset.list === btn.dataset.tab));
  }));

  /* ---- Kafé: bordsbokning ---- */
  const guests = $('[data-guests]');
  $$('.stepper button').forEach((b) => b.addEventListener('click', () => {
    const n = Math.min(8, Math.max(1, Number(guests.value || guests.textContent) + Number(b.dataset.step)));
    guests.textContent = n;
  }));
  $$('.cafe-times button').forEach((b) => b.addEventListener('click', () => activate(b)));
  $('.cafe-book__go').addEventListener('click', () => {
    const tid = $('.cafe-times .is-active').textContent;
    const n = guests.textContent;
    $('.cafe-book__ok').textContent = `Klart! Bord för ${n} kl ${tid}. (Bara på låtsas, inget är bokat.)`;
  });

  /* ---- Bräda & Bult: prisräknare ---- */
  const sizeIn = $('[data-size-input]');
  const sizeOut = $('[data-size]');
  const total = $('[data-total]');
  let rate = 2400;
  const calc = () => {
    sizeOut.textContent = sizeIn.value;
    total.textContent = kr(Math.round((rate * sizeIn.value) / 500) * 500);
  };
  $$('.bygg-types button').forEach((b) => b.addEventListener('click', () => {
    activate(b);
    rate = Number(b.dataset.rate);
    sizeIn.max = b.dataset.max;
    if (Number(sizeIn.value) > Number(sizeIn.max)) sizeIn.value = sizeIn.max;
    calc();
  }));
  sizeIn.addEventListener('input', calc);
  calc();
  $('.bygg-btn').addEventListener('click', () => {
    const typ = $('.bygg-types .is-active').textContent.toLowerCase();
    $('.bygg-ok').textContent = `Tack! Vi hör av oss om er ${typ} på ${sizeIn.value} m². (Påhittat företag, inget skickas.)`;
  });

  /* ---- Ullkullen: öppet just nu (tis–lör 10–17) ---- */
  const open = $('[data-open]');
  const updateOpen = () => {
    const d = new Date();
    const day = d.getDay();
    const h = d.getHours() + d.getMinutes() / 60;
    const openDay = day >= 2 && day <= 6;
    const isOpen = openDay && h >= 10 && h < 17;
    open.classList.toggle('is-open', isOpen);
    if (isOpen) open.textContent = `Öppet just nu, stänger kl 17`;
    else if (openDay && h < 10) open.textContent = 'Stängt just nu, öppnar kl 10 i dag';
    else {
      const next = day === 6 || day === 0 || day === 1 ? 'på tisdag' : 'i morgon';
      open.textContent = `Stängt just nu, öppnar kl 10 ${next}`;
    }
  };
  updateOpen();
  setInterval(updateOpen, 60000);

  /* ---- Ullkullen: varukorg ---- */
  const cart = $('[data-cart]');
  $$('.gard-grid button').forEach((b) => b.addEventListener('click', () => {
    cart.textContent = Number(cart.textContent) + 1;
    const badge = cart.parentElement;
    badge.classList.remove('is-bump');
    void badge.offsetWidth;
    badge.classList.add('is-bump');
    b.textContent = 'Tillagd ✓';
    setTimeout(() => { b.textContent = 'Lägg i korgen'; }, 1400);
  }));
})();
