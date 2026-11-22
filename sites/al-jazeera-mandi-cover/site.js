// الغطاء: after the CSS lid-lift, soft steam wisps rise inside the hero dome; story lids settle on scroll.
if (!reduce) {
  const root = document.querySelector('[data-site="al-jazeera-mandi-cover"]');
  const side = root && root.querySelector(".hero .hero__side");
  if (side) {
    if (getComputedStyle(side).position === "static") side.style.position = "relative";
    const wisps = [];
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2";
    for (let i = 0; i < 5; i++) {
      const w = document.createElement("span");
      w.style.cssText =
        "position:absolute;bottom:18%;width:16%;height:34%;border-radius:50%;opacity:0;" +
        "background:radial-gradient(closest-side,rgba(255,255,255,.55),rgba(255,255,255,0));" +
        "filter:blur(10px);left:" + (22 + i * 13) + "%";
      layer.appendChild(w);
      wisps.push(w);
    }
    side.appendChild(layer);
    gsap.set(wisps, { yPercent: 0, scaleX: 0.7 });
    gsap.timeline({ delay: 1.2 })
      .to(wisps, {
        keyframes: [
          { opacity: 0.8, duration: 0.5, ease: "power1.out" },
          { opacity: 0, duration: 1.6, ease: "power1.in" }
        ],
        stagger: 0.18
      }, 0)
      .to(wisps, {
        yPercent: -170, scaleX: 1.5, duration: 2.1, ease: "power1.out", stagger: 0.18
      }, 0)
      .to(wisps, {
        x: (i) => (i % 2 ? 14 : -14), duration: 2.1, ease: "sine.inOut", stagger: 0.18
      }, 0)
      .add(() => layer.remove());
  }

  gsap.utils.toArray(
    '[data-site="al-jazeera-mandi-cover"] .story .panel:not(:has(.panel__media))'
  ).forEach((p) => {
    gsap.from(p, {
      y: 70, scale: 0.94, transformOrigin: "50% 100%", ease: "none",
      scrollTrigger: { trigger: p, start: "top 95%", end: "top 45%", scrub: 0.6 }
    });
  });
}
