// Akiro: arch-framed photos rise like glass pendants, drifting gently against scroll.
const S = '[data-site="akiro-bakery"]';
const q = (s) => Array.from(document.querySelectorAll(S + ' ' + s));
const root = document.querySelector(S) || document;
if (!reduce && root) {
  const side = q('.hero__side');
  side.forEach((el) => {
    gsap.fromTo(el, { y: -26 }, {
      y: 26, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
    });
  });
  const head = q('.story__head');
  head.forEach((el) => {
    gsap.fromTo(el, { y: 18 }, {
      y: -18, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 0.8 }
    });
  });
  // Pendant orbs: the CSS keyframes sway them; here they also drift on scroll via the independent `translate` property.
  const st = document.createElement('style');
  st.textContent = S + ' .hero--split::before,' + S + ' .hero--split::after,' + S + ' .story__head::after{translate:0 var(--ak-drift,0px)}';
  document.head.appendChild(st);
  [['.hero--split', 14], ['.story__head', 10]].forEach(([sel, d]) => {
    q(sel).forEach((el) => {
      gsap.fromTo(el, { '--ak-drift': -d + 'px' }, {
        '--ak-drift': d + 'px', ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1.2 }
      });
    });
  });
  q('.panel__media').forEach((el) => {
    gsap.from(el, {
      yPercent: -6, scale: 0.96, duration: 1.2, ease: 'power3.out', transformOrigin: '50% 0',
      scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none none' }
    });
  });
}
