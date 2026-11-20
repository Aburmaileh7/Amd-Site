// La Miel: the honey ring settles around the hero arch; story arches open from a thin slit.
const root = document.querySelector('[data-site="la-miel-specialty-coffee"]');
if (!reduce && root) {
  const side = root.querySelector(".hero__side");
  if (side) {
    gsap.fromTo(side, { scale: 1.09, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: "power3.out", delay: 0.15, clearProps: "transform" });
  }
  const medias = Array.from(root.querySelectorAll(".panel__media, .panel-m__visual"));
  const story = root.querySelector(".story");
  if (medias.length && story) {
    const open = medias.map(() => 0);
    const paint = (el, v) => {
      const k = (46 * (1 - v)).toFixed(2);
      gsap.set(el, { clipPath: v >= 1 ? "none" : "inset(0% " + k + "% 0% " + k + "% round 999px 999px 14px 14px)" });
    };
    medias.forEach((el) => paint(el, 0));
    // openness follows each panel's own position: fully open once the panel is fully in view, never closes again
    const update = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      medias.forEach((el, i) => {
        if (open[i] >= 1) return;
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        let v;
        if (el.closest("[data-story-track]")) {
          const vis = Math.min(r.right, vw) - Math.max(r.left, 0);
          v = vis >= r.width - 2 ? 1 : Math.max(0, vis / r.width) * 1.4 - 0.2;
        } else {
          v = (vh * 0.9 - r.top) / (vh * 0.4);
        }
        v = Math.min(1, Math.max(open[i], v));
        if (v !== open[i]) { open[i] = v; paint(el, v); }
      });
      if (open.every((v) => v >= 1)) gsap.ticker.remove(update);
    };
    gsap.ticker.add(update); // the pinned track scrubs with lag, so follow it every frame until all are open
  }

  // slim honey progress line for the pinned horizontal story
  const pin = root.querySelector("[data-story-pin]");
  const track = root.querySelector("[data-story-track]");
  if (pin && track && window.matchMedia("(min-width: 900px)").matches) {
    const rtl = getComputedStyle(track).direction === "rtl";
    const bar = document.createElement("div");
    bar.setAttribute("aria-hidden", "true");
    bar.style.cssText = "position:absolute;bottom:28px;left:50%;margin-left:-160px;width:320px;height:3px;border-radius:3px;background:rgba(212,162,31,.25);overflow:hidden;pointer-events:none";
    const fill = document.createElement("div");
    fill.style.cssText = "width:100%;height:100%;background:#D4A21F;border-radius:3px;transform:scaleX(0);transform-origin:" + (rtl ? "right" : "left") + " center";
    bar.appendChild(fill);
    pin.appendChild(bar);
    const dist = () => Math.max(1, track.scrollWidth - window.innerWidth);
    const prog = () => {
      const p = Math.min(1, Math.abs(gsap.getProperty(track, "x")) / dist());
      gsap.set(fill, { scaleX: Math.max(0.04, p) });
    };
    gsap.ticker.add(prog);
  }

  // swipe hint for the reviews row on touch widths
  const rail = root.querySelector("[data-rail]");
  if (rail && window.matchMedia("(max-width: 899px)").matches && rail.scrollWidth > rail.clientWidth + 8) {
    const hint = document.createElement("p");
    hint.setAttribute("aria-hidden", "true");
    hint.textContent = "اسحب لمشاهدة المزيد \u2190";
    hint.style.cssText = "margin:14px 0 0;text-align:center;font-size:.85rem;color:#8A6A0E;pointer-events:none";
    rail.insertAdjacentElement("afterend", hint);
    const nudge = gsap.to(hint, { x: -8, duration: 0.9, ease: "sine.inOut", yoyo: true, repeat: -1 });
    const done = () => { nudge.kill(); gsap.to(hint, { opacity: 0, duration: 0.4 }); };
    rail.addEventListener("scroll", done, { once: true, passive: true });
  }
}
