// Barber pole speeds up with scroll velocity; mirror frame rises into place on load.
if (!reduce) {
  const root = document.querySelector('[data-site="turkey-barber-shop-jeddah"]');
  const mirror = root && root.querySelector(".hero__side");
  if (mirror) {
    gsap.from(mirror, { yPercent: 8, opacity: 0, duration: 1.1, ease: "power3.out", delay: 0.1 });

    let anim = null;
    const grab = () => {
      anim = (mirror.getAnimations ? mirror.getAnimations({ subtree: false }) : [])
        .find((a) => a.animationName === "tbs-pole") ||
        (document.getAnimations ? document.getAnimations().find((a) => a.animationName === "tbs-pole") : null);
    };
    grab();
    const state = { rate: 1 };
    const apply = () => { if (!anim) grab(); if (anim) anim.playbackRate = state.rate; };
    let tween = null;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const v = Math.min(Math.abs(self.getVelocity()) / 400, 6);
        const target = 1 + v;
        if (target > state.rate) state.rate = target;
        if (tween) tween.kill();
        tween = gsap.to(state, { rate: 1, duration: 1.2, ease: "power2.out", onUpdate: apply, overwrite: true });
        apply();
      },
    });
  }
}
