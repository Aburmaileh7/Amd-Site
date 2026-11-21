// Hafsa: the sign's row of bulbs lights up one by one, leading edge sweeping from the right.
const root = document.querySelector('[data-site="hafsa-beauty-saloon"]');
if (root && !reduce) {
  const rtl = getComputedStyle(root).direction === "rtl";
  // cover slides away toward the end side, so bulbs appear from the start side (right in RTL)
  const origin = rtl ? "0% 50%" : "100% 50%";
  const cover = (host, color, top, height, inset) => {
    const c = document.createElement("span");
    c.setAttribute("aria-hidden", "true");
    c.style.cssText = "position:absolute;z-index:4;pointer-events:none;background:" + color +
      ";inset-inline:" + inset + ";top:" + top + ";height:" + height + ";will-change:transform";
    host.appendChild(c);
    gsap.set(c, { transformOrigin: origin });
    return c;
  };
  const steps = (n) => "steps(" + n + ")";

  const side = root.querySelector(".hero__side");
  if (side) {
    const c = cover(side, "#6E1F2B", "6px", "22px", "14px");
    gsap.to(c, { scaleX: 0, duration: 1.4, delay: 0.5, ease: steps(14), onComplete: () => c.remove() });
    gsap.from(side, { y: 24, autoAlpha: 0, duration: 0.9, ease: "power3.out" });
  }

  const visit = root.querySelector(".visit");
  if (visit) {
    const c = cover(visit, "#6E1F2B", "0", "12px", "0");
    gsap.to(c, {
      scaleX: 0, duration: 1.6, ease: steps(18),
      scrollTrigger: { trigger: visit, start: "top 85%", once: true },
      onComplete: () => c.remove()
    });
  }
}
