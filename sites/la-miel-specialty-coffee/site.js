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
}
