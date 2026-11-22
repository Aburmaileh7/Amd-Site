/* The pour: the yolk drips grow down over the black story field as it scrolls in, then ooze slightly. */
if (!reduce) {
  const root = document.querySelector('[data-site="magma-kuwait"]');
  const story = root && root.querySelector('.story');
  if (story) {
    gsap.set(story, { "--pour": 0.04 });
    gsap.to(story, {
      "--pour": 1, ease: "power2.out", duration: 1,
      scrollTrigger: { trigger: story, start: "top 92%", end: "top 38%", scrub: 0.6 }
    });
    const pools = story.querySelectorAll('.panel:not(:has(.panel__media))');
    pools.forEach((p) => {
      gsap.fromTo(p, { scale: 0.94, opacity: 0.6 }, {
        scale: 1, opacity: 1, ease: "power2.out", duration: 0.9,
        scrollTrigger: { trigger: story, start: "top 40%", toggleActions: "play none none none", once: true }
      });
    });
  }
}
