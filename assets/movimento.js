/* Palácio do Corte — movimento na rolagem (GSAP + ScrollTrigger).
   Quem prefere menos movimento (prefers-reduced-motion) vê tudo parado. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // navegação ganha fundo depois da capa
  const nav = $('#nav');
  const navCheck = () => nav.classList.toggle('cheia', scrollY > innerHeight * 0.6);
  addEventListener('scroll', navCheck, { passive: true }); navCheck();

  // manifesto: quebra o texto em palavras (mantendo os <b>)
  const mt = $('#manifesto-texto');
  const quebrar = (no) => [...no.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((t) => {
        if (!t) return;
        if (/^\s+$/.test(t)) frag.appendChild(document.createTextNode(t));
        else { const s = document.createElement('span'); s.className = 'p'; s.textContent = t; frag.appendChild(s); }
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) { n.classList.add('p'); }
  });
  quebrar(mt);

  if (reduz || !window.gsap) {
    $$('.m-foto').forEach((f) => f.classList.add('on'));
    $$('.passo').forEach((p) => p.classList.add('ativo'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia();

  // ---------- capa ----------
  const entrada = () => gsap.from('.capa-titulo .linha > *', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.12 });
  if (document.documentElement.classList.contains('pronto')) entrada();
  else new MutationObserver((m, o) => { if (document.documentElement.classList.contains('pronto')) { o.disconnect(); setTimeout(entrada, 250); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  gsap.timeline({ scrollTrigger: { trigger: '.capa', start: 'top top', end: 'bottom bottom', scrub: 0.6 } })
    .fromTo('.capa-foto', { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1.12 }, { clipPath: 'inset(7% 5% 14% 5% round 18px)', scale: 1, ease: 'none' }, 0)
    .to('.capa-titulo .l1', { xPercent: -14, ease: 'none' }, 0)
    .to('.capa-titulo .l2', { xPercent: 10, ease: 'none' }, 0)
    .to('.capa-rodape, .rolar', { opacity: 0, y: -30, ease: 'none' }, 0)
    .to('.capa-veu', { opacity: 0.6, ease: 'none' }, 0);

  // ---------- faixa: anda sozinha e acelera/inclina com a rolagem ----------
  const trilho = $('#faixa');
  const loop = gsap.to(trilho, { xPercent: -50, ease: 'none', duration: 28, repeat: -1 });
  const inclina = gsap.quickTo(trilho, 'skewX', { duration: 0.5, ease: 'power3' });
  ScrollTrigger.create({
    trigger: '.faixa', start: 'top bottom', end: 'bottom top',
    onUpdate: (st) => {
      const v = st.getVelocity();
      inclina(gsap.utils.clamp(-12, 12, v / -150));
      loop.timeScale(gsap.utils.clamp(1, 5, 1 + Math.abs(v) / 600) * (v < 0 ? -1 : 1));
      gsap.delayedCall(0.25, () => loop.timeScale(1));
    }
  });

  // ---------- manifesto: acende palavra por palavra ----------
  const palavras = $$('#manifesto-texto .p');
  ScrollTrigger.create({
    trigger: '.manifesto', start: 'top top', end: 'bottom bottom', scrub: true,
    onUpdate: (st) => {
      const n = Math.round(st.progress * 1.15 * palavras.length);
      palavras.forEach((p, i) => {
        const on = i < n; p.classList.toggle('on', on);
        if (p.dataset.foto) document.getElementById(p.dataset.foto).classList.toggle('on', on);
      });
    }
  });

  // ---------- R$30: o número cresce e a foto corre por dentro dele ----------
  gsap.timeline({ scrollTrigger: { trigger: '.trinta', start: 'top top', end: 'bottom bottom', scrub: 0.5 } })
    .fromTo('.trinta-num', { scale: 0.55, backgroundPosition: '50% 0%' }, { scale: 1, backgroundPosition: '50% 100%', ease: 'none' }, 0)
    .from('.trinta-lado', { x: 120, opacity: 0, ease: 'power2.out', duration: 0.5 }, 0.2);

  // ---------- história: trilho horizontal preso (só no computador) ----------
  mm.add('(min-width: 861px)', () => {
    const tr = $('#trilho');
    const dist = () => tr.scrollWidth - innerWidth;
    gsap.to(tr, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.historia', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
    });
  });
  mm.add('(max-width: 860px)', () => {
    $$('.cap').forEach((c) => gsap.from(c, { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: c, start: 'top 85%' } }));
  });

  // ---------- ritual: a foto da esquerda troca com o passo ----------
  const fotos = $$('.rf');
  $$('.passo').forEach((p) => ScrollTrigger.create({
    trigger: p, start: 'top 60%', end: 'bottom 40%',
    onToggle: (st) => {
      p.classList.toggle('ativo', st.isActive);
      if (st.isActive) fotos.forEach((f) => f.classList.toggle('ativa', f.dataset.i === p.dataset.i));
    }
  }));

  // ---------- na régua: colunas em velocidades diferentes ----------
  $$('.coluna').forEach((c) => gsap.fromTo(c, { yPercent: 0 }, {
    yPercent: Number(c.dataset.vel) * -1.4, ease: 'none',
    scrollTrigger: { trigger: '.regua', start: 'top bottom', end: 'bottom top', scrub: true }
  }));
  gsap.fromTo('.regua-titulo span:first-child', { xPercent: -30 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.regua', start: 'top bottom', end: 'top 20%', scrub: true } });
  gsap.fromTo('.regua-titulo span:last-child', { xPercent: 30 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: '.regua', start: 'top bottom', end: 'top 20%', scrub: true } });

  // ---------- entradas ----------
  $$('h2:not(.regua-titulo), .principes-texto, .corte-cab p, .agendar-cab p').forEach((el) =>
    gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  gsap.from('.principes-fila figure', { y: 100, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.principes-fila', start: 'top 85%' } });
  gsap.from('.mosaico figure', { y: 70, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08, scrollTrigger: { trigger: '.mosaico', start: 'top 80%' } });
  gsap.from('.casa', { y: 80, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.15, scrollTrigger: { trigger: '.casas-grade', start: 'top 85%' } });

  // ---------- rodapé: a pergunta atravessa a tela ----------
  gsap.fromTo('.rodape-gigante', { xPercent: 12 }, { xPercent: -28, ease: 'none', scrollTrigger: { trigger: '.rodape', start: 'top bottom', end: 'bottom bottom', scrub: true } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
