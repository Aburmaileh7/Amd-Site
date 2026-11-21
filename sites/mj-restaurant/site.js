/* MJ Restaurant: story photos are dim until their panel reaches the viewport, then the lamp "lights" them. */
const root = document.querySelector('[data-site="mj-restaurant"]');
if (root && !reduce && 'IntersectionObserver' in window) {
  const medias = root.querySelectorAll('.panel__media');
  const dims = [];
  medias.forEach((m) => {
    if (getComputedStyle(m).position === 'static') m.style.position = 'relative';
    const d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:radial-gradient(70% 60% at 50% 55%,rgba(196,122,78,.18),rgba(10,6,4,.82))';
    m.appendChild(d);
    dims.push([m, d]);
    gsap.set(d, { opacity: 1 });
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const hit = dims.find(([m]) => m === e.target);
      if (!hit) return;
      const [m, d] = hit;
      io.unobserve(m);
      const img = m.querySelector('img');
      const tl = gsap.timeline();
      tl.to(d, { opacity: 0.55, duration: 0.18 })
        .to(d, { opacity: 0.8, duration: 0.14 })
        .to(d, { opacity: 0, duration: 1.1, ease: 'power2.out' });
      if (img) tl.fromTo(img, { scale: 1.06 }, { scale: 1, duration: 1.6, ease: 'power2.out' }, 0);
    });
  }, { threshold: 0.45 });
  dims.forEach(([m]) => io.observe(m));
}
