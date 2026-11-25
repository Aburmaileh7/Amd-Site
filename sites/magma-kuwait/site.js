/* The pour: the yolk drips grow down over the black story field as it scrolls in, while rating counters lock at exact values. */
const root = document.querySelector('[data-site="magma-kuwait"]');
if (root) {
  const counters = root.querySelectorAll('[data-count]');
  if (typeof ScrollTrigger !== 'undefined' && ScrollTrigger.getAll) {
    ScrollTrigger.getAll().forEach((st) => {
      const tr = st.trigger;
      if (tr && tr.nodeType === 1 && root.contains(tr) && tr.hasAttribute('data-count')) {
        if (st.animation) st.animation.kill();
        st.kill();
      }
    });
  }
  counters.forEach((el) => {
    if (typeof gsap !== 'undefined') gsap.killTweensOf(el);
    const val = el.getAttribute('data-count');
    if (val !== null) el.textContent = val;
  });

  if (!reduce) {
    if (counters.length) {
      const statsWrap = root.querySelector('.stats') || counters[0];
      gsap.from(counters, {
        y: 8,
        opacity: 0,
        duration: 0.22,
        ease: 'power2.out',
        stagger: 0.05,
        clearProps: 'transform,opacity',
        scrollTrigger: { trigger: statsWrap, start: 'top 92%', once: true }
      });
    }

    const story = root.querySelector('.story');
    if (story) {
      gsap.set(story, { '--pour': 0.04 });
      gsap.to(story, {
        '--pour': 1,
        ease: 'power2.out',
        duration: 1,
        scrollTrigger: { trigger: story, start: 'top 92%', end: 'top 38%', scrub: 0.6 }
      });
      const pools = story.querySelectorAll('.panel:not(:has(.panel__media))');
      pools.forEach((p) => {
        gsap.fromTo(
          p,
          { scale: 0.94, opacity: 0.6 },
          {
            scale: 1,
            opacity: 1,
            ease: 'power2.out',
            duration: 0.9,
            scrollTrigger: { trigger: story, start: 'top 40%', toggleActions: 'play none none none', once: true }
          }
        );
      });
    }
  }
}
