// Sucre de Nada: the tiled floor is laid tile by tile, then price cards settle into the vitrine.
const root = document.querySelector('[data-site="sucre-de-nada"]');
if (!reduce && root) {
  const rtl = getComputedStyle(root).direction === "rtl";
  const origin = rtl ? "100% 50%" : "0% 50%";
  const tile = parseFloat(getComputedStyle(root).getPropertyValue("--sn-tile")) || 64;

  // A sand sheet covers a strip, then slides away from the start edge so the tiles appear to be laid.
  const cover = (host, edge, h) => {
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = "position:absolute;left:0;right:0;z-index:3;pointer-events:none;background:#EADCBF;height:" + h + "px;" + edge + ":0";
    host.appendChild(el);
    gsap.set(el, { scaleX: 1, transformOrigin: rtl ? "0% 50%" : "100% 50%" });
    return el;
  };
  const lay = (el, trigger, delay) => {
    gsap.set(el, { transformOrigin: origin });
    const done = () => el.remove();
    const play = () => gsap.to(el, { scaleX: 0, duration: 1.3, delay, ease: "power3.inOut", onComplete: done });
    if (trigger) ScrollTrigger.create({ trigger, start: "top 85%", once: true, onEnter: play });
    else play();
  };

  const hero = root.querySelector(".hero--split");
  if (hero) lay(cover(hero, "bottom", tile / 2), null, 0.5);

  root.querySelectorAll(".marquee").forEach((m) => {
    lay(cover(m, "top", tile / 4), m, 0);
    lay(cover(m, "bottom", tile / 4), m, 0.15);
  });

  // Price cards: tilted harder at first, then settle to the resting angle.
  ScrollTrigger.batch(".item__price", {
    start: "top 92%",
    once: true,
    onEnter: (els) =>
      gsap.from(els, { rotation: -8, y: 6, duration: 0.7, stagger: 0.07, ease: "back.out(2)", clearProps: "transform" }),
  });
}
