/* Triple One: when a story panel enters, a slow cold sweep crosses its matte surface. No lines and no overlays on car photos. */
if (!reduce) {
  const root = document.querySelector('[data-site="triple-one-car-care"]');
  if (root) {
    const targets = root.querySelectorAll(".panel");
    targets.forEach((el) => {
      if (getComputedStyle(el).position === "static") return;
      const fx = document.createElement("div");
      fx.setAttribute("aria-hidden", "true");
      fx.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:3";
      const sweep = document.createElement("i");
      sweep.style.cssText = "position:absolute;top:-20%;bottom:-20%;left:0;width:38%;background:linear-gradient(100deg,transparent,rgba(244,248,252,.13),transparent);opacity:0;transform:translateX(-120%) skewX(-14deg)";
      fx.appendChild(sweep);
      el.appendChild(fx);
      const tl = gsap.timeline({
        paused: true,
        scrollTrigger: { trigger: el, start: "top 80%", once: true, onEnter: () => tl.play() },
      });
      tl.to(sweep, { opacity: 1, duration: 0.2 }, 0.1)
        .to(sweep, { x: "380%", duration: 1.8, ease: "power2.inOut" }, 0.1)
        .to(sweep, { opacity: 0, duration: 0.4 }, 1.5);
    });
  }
}
