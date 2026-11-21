if (!reduce) {
  const root = document.querySelector('[data-site="almejdaf-seafood"]');
  if (root) {
    const hero = root.querySelector('.hero');
    const side = root.querySelector('.hero .hero__side');
    if (hero && side) {
      const wide = window.matchMedia('(min-width: 900px)').matches;
      const rings = [0, 1, 2].map(() => {
        const r = document.createElement('div');
        r.setAttribute('aria-hidden', 'true');
        r.style.cssText = 'position:absolute;z-index:-1;pointer-events:none;border-radius:50%;aspect-ratio:1;width:min(70vw,640px);border:1px solid rgba(14,107,102,.35);opacity:0;inset-inline-end:' + (wide ? '2vw' : '-10vw') + ';inset-block-start:' + (wide ? '14%' : 'auto') + ';inset-block-end:' + (wide ? 'auto' : '4%');
        hero.appendChild(r);
        return r;
      });
      gsap.fromTo(rings, { scale: 0.25, opacity: 0.7 }, {
        scale: 1.5, opacity: 0, duration: 2.8, ease: 'power2.out', stagger: 0.45, delay: 0.3,
        onComplete: () => rings.forEach((r) => r.remove())
      });
      gsap.from(side, { rotation: -3, yPercent: 4, duration: 1.4, ease: 'power3.out', transformOrigin: '50% 100%' });
    }

    const story = root.querySelector('.story');
    const media = root.querySelectorAll('.story .panel__media');
    if (story && media.length) {
      gsap.from(media, {
        rotation: -5, xPercent: 8, opacity: 0, transformOrigin: '50% 100%',
        duration: 1.1, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: story, start: 'top 70%', once: true }
      });
    }
  }
}
