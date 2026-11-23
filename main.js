/* =========================================================
   Webblyft UF – interaktion
   - 3D-glob (three.js) byggd efter loggan: ränder + pilar
   - Laddningsskärm som "lyfts" bort
   - Mjuk scroll (Lenis) + scrollanimationer (GSAP)
   ========================================================= */

// Startar när innehållet från content/ är inläst (se content.js)
(window.contentReady || Promise.resolve()).then(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  if (reduceMotion) document.documentElement.classList.add('no-motion');
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     3D-GLOB
     --------------------------------------------------------- */
  async function initGlobe(canvas) {
    let THREE;
    try {
      THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    } catch (e) {
      document.documentElement.classList.add('no-webgl');
      return null;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      document.documentElement.classList.add('no-webgl');
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 7);

    // Ljus
    scene.add(new THREE.AmbientLight(0x8a90ff, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 2.6);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.PointLight(0x6e7bff, 40, 20);
    rim.position.set(-3, -1.5, -2.5);
    scene.add(rim);

    // Material
    const bandMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#d5d7ff'),
      roughness: 0.32,
      metalness: 0.18,
      emissive: new THREE.Color('#2c3290'),
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide,
    });
    const innerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#6f76d6'),
      roughness: 0.5,
      emissive: new THREE.Color('#1b2170'),
      emissiveIntensity: 0.4,
      side: THREE.BackSide,
    });

    // Struktur: holder (position/scroll) > tilt (mus) > globe (snurr)
    const holder = new THREE.Group();
    const tilt = new THREE.Group();
    const globe = new THREE.Group();
    tilt.add(globe);
    holder.add(tilt);
    scene.add(holder);
    tilt.rotation.z = -0.38;
    tilt.rotation.x = 0.28;

    const R = 1.25;
    // Punkt på sfär med samma konvention som THREE.SphereGeometry
    const sph = (phi, theta, r) => new THREE.Vector3(
      -r * Math.cos(phi) * Math.sin(theta),
       r * Math.cos(theta),
       r * Math.sin(phi) * Math.sin(theta)
    );

    // Pilspets som följer sfärens kurva
    function arrowGeometry(phi0, thetaMid, halfW, len, r) {
      const N = 18, pos = [], idx = [];
      const sinT = Math.sin(thetaMid);
      for (let s = 0; s <= N; s++) {
        const k = s / N;
        const w = halfW * Math.pow(1 - k, 1.05);
        const phi = phi0 + (k * len) / (r * sinT);
        const a = sph(phi, thetaMid - w / r, r);
        const b = sph(phi, thetaMid + w / r, r);
        pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        if (s < N) {
          const i = s * 2;
          idx.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    }

    // Ränderna (polvinkel theta i radianer, längd runt sfären)
    const bands = [
      { t0: 0.16, t1: 0.52, len: Math.PI * 2,    start: 0,   arrow: false },
      { t0: 0.66, t1: 1.04, len: Math.PI * 1.50, start: 0.4, arrow: true  },
      { t0: 1.18, t1: 1.54, len: Math.PI * 1.35, start: 1.3, arrow: true  },
      { t0: 1.68, t1: 2.02, len: Math.PI * 1.20, start: 2.2, arrow: true  },
      { t0: 2.16, t1: 2.46, len: Math.PI * 1.00, start: 3.0, arrow: true  },
      { t0: 2.60, t1: 2.84, len: Math.PI * 0.75, start: 3.6, arrow: false },
    ];
    // Varje rand i en egen grupp så att de kan glida isär
    const bandGroups = bands.map((b) => {
      const g = new THREE.Group();
      const outer = new THREE.SphereGeometry(R, 128, 10, b.start, b.len, b.t0, b.t1 - b.t0);
      g.add(new THREE.Mesh(outer, bandMat));
      const inner = new THREE.SphereGeometry(R * 0.965, 128, 10, b.start, b.len, b.t0, b.t1 - b.t0);
      g.add(new THREE.Mesh(inner, innerMat));
      if (b.arrow) {
        const mid = (b.t0 + b.t1) / 2;
        const halfW = (b.t1 - b.t0) * R * 0.95;
        g.add(new THREE.Mesh(arrowGeometry(b.start + b.len - 0.02, mid, halfW, 0.5, R * 1.002), bandMat));
      }
      globe.add(g);
      return g;
    });

    // Tunn omloppsring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(R * 1.55, 0.006, 8, 240),
      new THREE.MeshBasicMaterial({ color: 0xd5d7ff, transparent: true, opacity: 0.35 })
    );
    ring.rotation.x = Math.PI / 2.25;
    tilt.add(ring);

    // Partiklar: små romber, som i loggans bakgrund
    const tex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      x.translate(32, 32);
      x.rotate(Math.PI / 4);
      x.fillStyle = '#fff';
      x.fillRect(-16, -16, 32, 32);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const COUNT = window.innerWidth < 700 ? 260 : 520;
    const pPos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 2.2 + Math.random() * 4.5;
      const th = Math.acos(2 * Math.random() - 1);
      const ph = Math.random() * Math.PI * 2;
      pPos.set([r * Math.sin(th) * Math.cos(ph), r * Math.cos(th) * 0.7, r * Math.sin(th) * Math.sin(ph) - 1], i * 3);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.06, map: tex, color: 0x8d97ff, transparent: true, opacity: 0.75,
      depthWrite: false, sizeAttenuation: true,
    }));
    scene.add(particles);

    // Layout
    const base = { x: 0, y: 0, s: 1 };
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
      const visW = visH * camera.aspect;
      if (camera.aspect > 1.1) {
        base.x = visW * 0.23; base.y = visH * 0.1; base.s = Math.min(0.95, visH / 5.6);
      } else {
        base.x = 0; base.y = visH * 0.2; base.s = Math.min(0.8, visW / 4.2);
      }
    }
    resize();
    window.addEventListener('resize', resize);

    // Interaktion
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let spinVel = 0, dragging = false, lastX = 0;
    window.addEventListener('pointermove', (e) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (dragging) {
        spinVel += (e.clientX - lastX) * 0.0009;
        lastX = e.clientX;
      }
    });
    if (finePointer) {
      canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.style.cursor = 'grabbing'; });
      window.addEventListener('pointerup', () => { dragging = false; canvas.style.cursor = ''; });
      canvas.style.cursor = 'grab';
    }

    const state = { intro: reduceMotion ? 1 : 0, scroll: 0 };
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

    const clock = new THREE.Clock();
    function frame() {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (visible) {
        mouse.x += (mouse.tx - mouse.x) * 0.05;
        mouse.y += (mouse.ty - mouse.y) * 0.05;

        if (!reduceMotion) {
          globe.rotation.y += dt * 0.35 + spinVel + state.scroll * dt * 1.2;
          spinVel *= 0.94;
          particles.rotation.y += dt * 0.02;
          ring.rotation.z += dt * 0.15;
        }
        tilt.rotation.x = 0.28 + mouse.y * 0.18;
        tilt.rotation.y = mouse.x * 0.35;

        const s = base.s * (0.55 + 0.45 * state.intro) * (1 - state.scroll * 0.25);
        holder.scale.setScalar(s);
        holder.position.set(
          base.x + mouse.x * 0.08,
          base.y - mouse.y * 0.06 + state.scroll * 1.6 + (1 - state.intro) * -0.6,
          0
        );
        // Ränderna glider isär vid start och när man scrollar
        const explode = Math.max(state.scroll * 1.1, 1 - state.intro);
        const mid = (bandGroups.length - 1) / 2;
        bandGroups.forEach((g, i) => {
          g.position.y = (mid - i) * explode * 0.55;
          g.rotation.y = explode * (i % 2 ? 1.4 : -1.4) * (1 + i * 0.15);
        });
        particles.position.y = state.scroll * 0.8;
        renderer.render(scene, camera);
      }
      requestAnimationFrame(frame);
    }
    frame();

    return state;
  }

  const globePromise = initGlobe(document.querySelector('.hero__canvas'));
  initStars(document.querySelector('.stars'));

  /* ---------------------------------------------------------
     Svävande romber bakom de mörka sektionerna
     Stiger sakta uppåt ("lyft") och rör sig med scrollen i olika djup
     --------------------------------------------------------- */
  function initStars(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, stars = [];
    const make = () => {
      const n = Math.round((w * h) / 16000);
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.2 + Math.random() * 0.8,          // djup: närmare = större och snabbare
        tw: Math.random() * Math.PI * 2,      // blinkfas
        hue: Math.random() < 0.18,            // vissa i blått
      }));
    };
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      make();
    };
    resize();
    window.addEventListener('resize', resize);

    let lastScroll = window.scrollY;
    const draw = (t) => {
      const sy = window.scrollY;
      const dy = sy - lastScroll;
      lastScroll = sy;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        if (!reduceMotion) {
          s.y -= 0.12 * s.z + dy * s.z * 0.35;
          if (s.y < -10) { s.y = h + 10; s.x = Math.random() * w; }
          if (s.y > h + 10) { s.y = -10; s.x = Math.random() * w; }
        }
        const size = 1.2 + s.z * 3.2;
        const a = (0.25 + 0.55 * s.z) * (0.65 + 0.35 * Math.sin(t * 0.0012 + s.tw));
        ctx.fillStyle = s.hue ? `rgba(110,123,255,${a})` : `rgba(213,215,255,${a * 0.8})`;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      }
      if (!reduceMotion) requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  /* ---------------------------------------------------------
     Utan GSAP (t.ex. offline): visa sidan direkt
     --------------------------------------------------------- */
  if (!hasGsap) {
    document.querySelector('.loader')?.remove();
    document.body.classList.remove('is-loading');
    globePromise.then((s) => { if (s) s.intro = 1; });
    initBasics(null);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------------------------------------------------------
     Mjuk scroll
     --------------------------------------------------------- */
  let lenis = null;
  if (!reduceMotion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  initBasics(lenis);

  /* ---------------------------------------------------------
     Laddningsskärm → hero-intro
     --------------------------------------------------------- */
  const loader = document.querySelector('.loader');
  const num = document.querySelector('.loader__num');
  const bar = document.querySelector('.loader__bar span');
  const counter = { v: 0 };
  const render = () => {
    num.textContent = Math.round(counter.v);
    bar.style.transform = `scaleX(${counter.v / 100})`;
  };

  const minTime = new Promise((r) => setTimeout(r, reduceMotion ? 0 : 1300));
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const timeout = new Promise((r) => setTimeout(r, 5000));
  const ready = Promise.race([Promise.all([minTime, fonts, globePromise]), timeout]);

  const pre = gsap.to(counter, { v: 86, duration: reduceMotion ? 0 : 1.3, ease: 'power2.out', onUpdate: render });

  ready.then(async () => {
    const globeState = await Promise.race([globePromise, Promise.resolve(null)]);
    pre.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        document.body.classList.remove('is-loading');
        lenis?.start();
        ScrollTrigger.refresh();
      },
    });
    tl.to(counter, { v: 100, duration: reduceMotion ? 0 : 0.45, ease: 'power1.out', onUpdate: render })
      // Lyftet: hela skärmen åker uppåt
      .to(loader, { yPercent: -100, duration: reduceMotion ? 0 : 1.1, ease: 'expo.inOut' }, '+=0.1')
      .from('.hero__title .line > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.09 }, '-=0.5')
      .from('.hero__bottom > *', { autoAlpha: 0, y: 20, duration: 0.9, ease: 'power3.out', stagger: 0.08, clearProps: 'transform' }, '-=0.8')
      .from('.nav', { autoAlpha: 0, duration: 0.8, ease: 'power2.out' }, '<');
    if (globeState) {
      tl.to(globeState, { intro: 1, duration: 1.8, ease: 'expo.out' }, '-=1.6');
    }
    if (reduceMotion) tl.progress(1);
  });

  /* ---------------------------------------------------------
     Scrollanimationer
     --------------------------------------------------------- */
  // Globen åker uppåt och snurrar snabbare när man scrollar förbi hero
  globePromise.then((s) => {
    if (!s || reduceMotion) return;
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: (st) => { s.scroll = st.progress; },
    });
  });

  if (!reduceMotion) {
    // Hero-text försvinner mjukt
    gsap.to('.hero__content', {
      yPercent: -18, autoAlpha: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true },
    });

    // Ord för ord i påståendet
    const st = document.querySelector('[data-reveal-words]');
    st.innerHTML = st.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    gsap.to(st.querySelectorAll('.w'), {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: true },
    });

    // Process: horisontell scroll på större skärmar
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      const track = document.querySelector('.process__track');
      const progress = document.querySelector('.process__progress span');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '.process', start: 'top top', end: () => '+=' + dist(),
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (st) => { progress.style.transform = `scaleX(${st.progress})`; },
        },
      });
    });

    // Footer-ordet lyfts upp bokstav för bokstav
    const word = document.querySelector('.footer__word');
    word.innerHTML = [...word.textContent].map((c) => `<span style="display:inline-block">${c}</span>`).join('');
    gsap.from(word.children, {
      yPercent: 100, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: word, start: 'top 95%' },
    });

    initEffects();
  }

  /* ---------------------------------------------------------
     Effekter
     --------------------------------------------------------- */
  function initEffects() {
    // Rubriker: varje bokstav lyfts upp på plats
    document.querySelectorAll('.h2, .contact__title').forEach((h) => {
      const text = h.textContent.trim();
      h.setAttribute('aria-label', text);
      h.innerHTML = text.split(/\s+/).map((w) =>
        `<span class="word" aria-hidden="true">${[...w].map((c) => `<span class="ch">${c}</span>`).join('')}</span>`
      ).join(' ');
      gsap.from(h.querySelectorAll('.ch'), {
        yPercent: 120, rotate: 8, duration: 1.1, ease: 'expo.out', stagger: 0.02,
        scrollTrigger: { trigger: h, start: 'top 88%' },
      });
    });

    // Ljusa sektioner växer ut från rundade kanter och tonar mjukt från mörkt till ljust.
    // scrub: 1.2 ger en eftersläpning som jämnar ut scrollen, och animationen slutar
    // exakt när sektionen når toppen (där "Så går det till" låses fast).
    document.querySelectorAll('.process, .pricing, .contact').forEach((el) => {
      const fx = el.querySelector('.fx');
      const tl = gsap.timeline({
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: 1.2 },
      });
      tl.fromTo(el,
        { clipPath: 'inset(9% 6% 0% 6% round 80px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.out', duration: 1 }, 0)
        .fromTo(el,
          { backgroundColor: '#13306f', color: '#d5d7ff' },
          { backgroundColor: '#d5d7ff', color: '#071436', ease: 'power1.inOut', duration: 0.65 }, 0);
      if (fx) tl.fromTo(fx, { autoAlpha: 0 }, { autoAlpha: 1, ease: 'none', duration: 0.5 }, 0.25);
    });

    // Bakgrundsglöd rör sig i otakt med scrollen (djupkänsla)
    document.querySelectorAll('.fx').forEach((fx) => {
      const sec = fx.parentElement;
      fx.querySelectorAll('.orb').forEach((o, i) => {
        gsap.fromTo(o, { yPercent: i ? -25 : 20 }, {
          yPercent: i ? 25 : -20, ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    });

    // Koncept: flyger in
    gsap.utils.toArray('.mock').forEach((m, i) => {
      gsap.from(m, {
        y: 140, rotate: i % 2 ? 4 : -4, autoAlpha: 0, duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: m, start: 'top 92%' },
      });
    });

    // Team: bilder sveper fram underifrån
    gsap.utils.toArray('.person__img').forEach((el) => {
      const st = { trigger: el, start: 'top 88%' };
      gsap.fromTo(el,
        { clipPath: 'inset(100% 0% 0% 0% round 18px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: st });
      gsap.from(el.querySelector('img'), { scale: 1.4, duration: 2, ease: 'expo.out', scrollTrigger: st, clearProps: 'transform' });
    });

    // Priser räknas upp
    document.querySelectorAll('.plan__price').forEach((p) => {
      const node = p.firstChild;
      const target = parseInt(node.textContent.replace(/\s/g, ''), 10);
      const o = { v: 0 };
      node.textContent = '0';
      gsap.to(o, {
        v: target, duration: 1.8, ease: 'power3.out',
        scrollTrigger: { trigger: p, start: 'top 88%' },
        onUpdate: () => { node.textContent = Math.round(o.v).toLocaleString('sv-SE'); },
      });
    });

    if (!finePointer) return;

    // Egen muspekare
    const dot = document.createElement('div');
    dot.className = 'cursor';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    ring.innerHTML = '<span></span>';
    document.body.append(dot, ring);
    const label = ring.firstChild;
    gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
    const dX = gsap.quickTo(dot, 'x', { duration: 0.08 });
    const dY = gsap.quickTo(dot, 'y', { duration: 0.08 });
    const rX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
    const rY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      document.body.classList.add('has-cursor');
      dX(e.clientX); dY(e.clientY); rX(e.clientX); rY(e.clientY);
    });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], a, button, select');
      const txt = t && t.dataset.cursor;
      ring.classList.toggle('is-link', !!t && !txt);
      ring.classList.toggle('is-label', !!txt);
      label.textContent = txt || '';
    });
    document.documentElement.addEventListener('pointerleave', () => document.body.classList.remove('has-cursor'));
    // Vanlig textmarkör i formulärfält
    document.querySelectorAll('input, textarea').forEach((el) => {
      el.addEventListener('pointerenter', () => document.body.classList.remove('has-cursor'));
    });

    // Magnetiska knappar
    document.querySelectorAll('.btn').forEach((b) => {
      const mx = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      const my = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3);
        my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener('pointerleave', () => { mx(0); my(0); });
    });

    // Hero-raderna följer musen med olika djup
    const lines = gsap.utils.toArray('.hero__title .line');
    const lineX = lines.map((l) => gsap.quickTo(l, 'x', { duration: 1.2, ease: 'power3' }));
    window.addEventListener('pointermove', (e) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      lineX.forEach((fn, i) => fn(nx * (i + 1) * -14));
    });

    // Koncept: lutar i 3D efter musen
    document.querySelectorAll('.mock').forEach((m) => {
      gsap.set(m, { transformPerspective: 1100 });
      const rx = gsap.quickTo(m, 'rotationX', { duration: 0.7, ease: 'power3' });
      const ry = gsap.quickTo(m, 'rotationY', { duration: 0.7, ease: 'power3' });
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 12);
        rx((0.5 - py) * 9);
        m.style.setProperty('--gx', px * 100 + '%');
        m.style.setProperty('--gy', py * 100 + '%');
      });
      m.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });

    // Priser: ljuskägla följer musen
    document.querySelectorAll('.plan').forEach((p) => {
      p.addEventListener('pointermove', (e) => {
        const r = p.getBoundingClientRect();
        p.style.setProperty('--mx', e.clientX - r.left + 'px');
        p.style.setProperty('--my', e.clientY - r.top + 'px');
      });
    });

    // Menylänkar: bokstäverna blandas innan ordet landar
    const chars = 'abcdefghijklmnopqrstuvwxyzåäö';
    document.querySelectorAll('.nav__links a').forEach((a) => {
      const orig = a.textContent;
      let raf = 0;
      a.addEventListener('mouseenter', () => {
        cancelAnimationFrame(raf);
        a.style.width = a.offsetWidth + 'px';
        let f = 0;
        const run = () => {
          const done = Math.floor(f / 2);
          a.textContent = [...orig].map((c, i) => (c === ' ' || i < done ? c : chars[(Math.random() * chars.length) | 0])).join('');
          if (done < orig.length) { f++; raf = requestAnimationFrame(run); }
          else { a.textContent = orig; a.style.width = ''; }
        };
        run();
      });
    });
  }

  /* ---------------------------------------------------------
     Grundfunktioner: meny, ankarlänkar, formulär
     --------------------------------------------------------- */
  function initBasics(lenis) {
    const nav = document.querySelector('.nav');
    const toggle = document.querySelector('.nav__toggle');
    const menu = document.getElementById('mobilmeny');

    // Navbar: bakgrund efter scroll, göms när man scrollar nedåt
    let lastY = 0;
    const onScroll = (y) => {
      nav.classList.toggle('is-scrolled', y > 40);
      const hide = y > lastY && y > 400 && menu.hidden;
      nav.classList.toggle('is-hidden', hide);
      lastY = y;
    };
    window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });

    // Mobilmeny
    const setMenu = (open) => {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (lenis) open ? lenis.stop() : lenis.start();
    };
    toggle.addEventListener('click', () => setMenu(menu.hidden));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

    // Ankarlänkar med mjuk scroll
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        const target = id === '#top' ? document.body : document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (!menu.hidden) setMenu(false);
        if (lenis) lenis.scrollTo(target, { offset: id === '#top' ? 0 : -20, duration: 1.4 });
        else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });

        // Förval av paket i formuläret
        const plan = a.dataset.plan;
        if (plan) document.getElementById('f-paket').value = plan;
      });
    });

    // Kontaktformulär (Web3Forms, annars mejlprogram som reserv)
    const form = document.getElementById('kontaktform');
    const status = form.querySelector('.form__status');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      let firstBad = null;
      form.querySelectorAll('[required]').forEach((el) => {
        const bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
        el.setAttribute('aria-invalid', String(bad));
        if (bad && !firstBad) firstBad = el;
      });
      if (firstBad) {
        status.textContent = 'Fyll i namn, en giltig mejladress och ett meddelande.';
        firstBad.focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form));
      const btn = form.querySelector('button[type="submit"]');

      if (data.access_key === 'DIN_WEB3FORMS_NYCKEL') {
        // Ingen nyckel inlagd än: öppna mejlprogrammet istället
        const to = document.querySelector('.contact__list a[href^="mailto:"]').getAttribute('href').replace('mailto:', '');
        const body = `Namn: ${data.namn}\nFöretag: ${data.foretag}\nMejl: ${data.email}\nPaket: ${data.paket}\n\n${data.meddelande}`;
        window.location.href = `mailto:${to}?subject=${encodeURIComponent('Förfrågan om hemsida')}&body=${encodeURIComponent(body)}`;
        status.textContent = 'Ditt mejlprogram öppnas med meddelandet ifyllt.';
        return;
      }

      btn.disabled = true;
      status.textContent = 'Skickar…';
      try {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        form.reset();
        status.textContent = 'Tack! Förfrågan är skickad, vi hör av oss inom kort.';
      } catch (err) {
        status.textContent = 'Förfrågan gick inte iväg. Mejla oss direkt på adressen till vänster.';
      } finally {
        btn.disabled = false;
      }
    });
  }
});
