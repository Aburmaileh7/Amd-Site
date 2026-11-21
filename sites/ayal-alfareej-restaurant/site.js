// Ayal Alfareej: round trays turn slowly as the page scrolls, like a sufra being rotated.
const root = document.querySelector('[data-site="ayal-alfareej-restaurant"]');
if (!reduce && root) {
  const imgs = (sel) => Array.from(root.querySelectorAll(sel));
  const spin = (el, i, deg) => {
    gsap.fromTo(el, { rotation: -deg * (i % 2 ? -1 : 1), scale: 1.06 }, {
      rotation: deg * (i % 2 ? -1 : 1), scale: 1.06, ease: "none", force3D: true,
      scrollTrigger: { trigger: el.closest(".photo") || el, start: "top bottom", end: "bottom top", scrub: 0.8 }
    });
  };
  imgs(".hero .hero__side .photo img").forEach((el) => {
    gsap.to(el, { rotation: 14, scale: 1.06, ease: "none",
      scrollTrigger: { trigger: root.querySelector(".hero") || el, start: "top top", end: "bottom top", scrub: 0.8 } });
  });
  imgs(".story .panel__media .photo img").forEach((el, i) => spin(el, i, 12));
}
