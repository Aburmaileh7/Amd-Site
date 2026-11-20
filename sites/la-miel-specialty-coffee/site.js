// La Miel: the honey ring settles around the hero arch; story arches open from a thin slit.
const root = document.querySelector('[data-site="la-miel-specialty-coffee"]');
if (!reduce && root) {
  const side = root.querySelector(".hero__side");
  if (side) {
    gsap.fromTo(side, { scale: 1.09, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: "power3.out", delay: 0.15, clearProps: "transform" });
  }
  const medias = root.querySelectorAll(".panel__media, .panel-m__visual");
  const story = root.querySelector(".story");
  if (medias.length && story) {
    gsap.set(medias, { clipPath: "inset(0% 46% 0% 46% round 999px 999px 14px 14px)" });
    ScrollTrigger.create({
      trigger: story,
      start: "top 75%",
      once: true,
      onEnter: () =>
        gsap.to(medias, { clipPath: "inset(0% 0% 0% 0% round 999px 999px 14px 14px)", duration: 1.3, ease: "power3.inOut", stagger: 0.28, clearProps: "clipPath" }),
    });
  }
}
