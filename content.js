/* =========================================================
   Webblyft UF – innehåll
   Läser texter och bilder från mappen content/ (redigeras i
   Pages CMS) och för in dem på sidan innan animationerna startar.
   Om filerna inte går att läsa (t.ex. när index.html öppnas
   direkt från datorn) visas texten som redan står i index.html.
   ========================================================= */

window.contentReady = (() => {
  const files = ['startsida', 'priser', 'team', 'kontakt'];

  const load = (name) =>
    fetch(`content/${name}.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Sätt text bara om värdet finns, annars behåll det som står i HTML:en
  const text = (el, value) => {
    if (el && typeof value === 'string' && value.trim()) el.textContent = value.trim();
  };

  // Bygg om en lista utifrån första elementet som mall
  const list = (container, itemSel, items, fill) => {
    if (!container || !Array.isArray(items) || !items.length) return;
    const tpl = $(itemSel, container);
    if (!tpl) return;
    const old = $$(itemSel, container);
    const anchor = old[old.length - 1].nextSibling;
    old.forEach((el) => el.remove());
    items.forEach((item, i) => {
      const el = tpl.cloneNode(true);
      fill(el, item, i);
      container.insertBefore(el, anchor);
    });
  };

  // Bildväg från CMS:et: ta bort inledande snedstreck så att den fungerar överallt
  const src = (p) => (typeof p === 'string' ? p.trim().replace(/^\/+/, '') : '');

  function startsida(d) {
    if (d.hero) {
      const lines = $$('.hero__title .line > span');
      text(lines[0], d.hero.rad1);
      text(lines[1], d.hero.rad2);
      text(lines[2], d.hero.rad3);
      text($('.hero__lead'), d.hero.ingress);
    }
    text($('.statement__text'), d.pastaende);

    if (d.ingar) {
      text($('#ingar .h2'), d.ingar.rubrik);
      text($('.included__intro'), d.ingar.ingress);
      list($('.included__list'), '.inc', d.ingar.punkter, (el, p) => {
        text($('.inc__title', el), p.titel);
        text($('.inc__text', el), p.text);
      });
    }

    if (d.process) {
      text($('#process .h2'), d.process.rubrik);
      text($('.process__head p'), d.process.ingress);
      list($('.process__track'), '.step', d.process.steg, (el, s, i) => {
        $('.step__num', el).textContent = i + 1;
        text($('h3', el), s.titel);
        text($('p', el), s.text);
      });
    }

    if (d.koncept) {
      text($('#koncept .h2'), d.koncept.rubrik);
      text($('.concepts__head p'), d.koncept.ingress);
    }
  }

  function priser(d) {
    text($('#priser .h2'), d.rubrik);
    text($('.pricing__head p'), d.ingress);
    if (!Array.isArray(d.paket)) return;

    const plans = $$('.plan');
    const select = $('#f-paket');
    d.paket.slice(0, plans.length).forEach((p, i) => {
      const el = plans[i];
      text($('.plan__name', el), p.namn);
      text($('.plan__for', el), p.for);

      const pris = Number(String(p.pris).replace(/\s/g, ''));
      if (Number.isFinite(pris)) $('.plan__price', el).firstChild.textContent = pris.toLocaleString('sv-SE');

      if (Array.isArray(p.punkter) && p.punkter.length) {
        const ul = $('ul', el);
        ul.replaceChildren(...p.punkter.filter(Boolean).map((t) => {
          const li = document.createElement('li');
          li.textContent = t;
          return li;
        }));
      }

      let badge = $('.plan__badge', el);
      if (p.etikett && p.etikett.trim()) {
        if (!badge) {
          badge = document.createElement('p');
          badge.className = 'plan__badge';
          el.prepend(badge);
        }
        badge.textContent = p.etikett.trim();
      } else if (badge) {
        badge.remove();
      }

      // Knappen och formulärets paketval följer paketets namn
      if (p.namn && p.namn.trim()) {
        const btn = $('[data-plan]', el);
        const oldName = btn.dataset.plan;
        btn.dataset.plan = p.namn.trim();
        btn.textContent = `Välj ${p.namn.trim()}`;
        const opt = select && [...select.options].find((o) => o.value === oldName || o.text === oldName);
        if (opt) { opt.value = p.namn.trim(); opt.text = p.namn.trim(); }
      }
    });
  }

  function team(d) {
    text($('#om-oss .h2'), d.rubrik);
    text($('.team__head p'), d.ingress);
    list($('.team__grid'), '.person', d.personer, (el, p) => {
      text($('h3', el), p.namn);
      text($('figcaption p', el), p.roll);
      const img = $('img', el);
      if (src(p.bild)) img.src = src(p.bild);
      img.alt = (p.bildtext && p.bildtext.trim()) || p.namn || '';
    });
  }

  function kontakt(d) {
    text($('.contact__title'), d.rubrik);
    text($('.contact__info > p'), d.ingress);
    text($('.footer__top p'), d.sidfot);

    const mail = $('.contact__list a[href^="mailto:"]');
    if (mail && d.mejl && d.mejl.trim()) {
      mail.href = `mailto:${d.mejl.trim()}`;
      mail.textContent = d.mejl.trim();
    }
    const tel = $('.contact__list a[href^="tel:"]');
    if (tel && d.telefon && d.telefon.trim()) {
      const digits = d.telefon.replace(/[^\d+]/g, '');
      tel.href = `tel:${digits.startsWith('0') ? '+46' + digits.slice(1) : digits}`;
      tel.textContent = d.telefon.trim();
    }
    const ig = $('.contact__list a[href*="instagram.com"]');
    if (ig && d.instagram && d.instagram.trim()) {
      const user = d.instagram.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '');
      ig.href = `https://instagram.com/${user}`;
      ig.textContent = `@${user}`;
    }
  }

  const apply = { startsida, priser, team, kontakt };

  const loading = Promise.all(files.map(load)).then((data) => {
    data.forEach((d, i) => {
      if (!d) return;
      try { apply[files[i]](d); } catch (e) { console.warn(`Kunde inte läsa in ${files[i]}.json`, e); }
    });
  });

  // Vänta aldrig mer än 3 sekunder – då visas texten i HTML:en
  return Promise.race([loading, new Promise((r) => setTimeout(r, 3000))]);
})();
