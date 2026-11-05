// Signature motion for shefit-gym-al-hamra. Runs with gsap, ScrollTrigger, reduce from the shared wrapper.
(function (gsap, ScrollTrigger, reduce) {
  if (reduce || !gsap) return;
  var root = document.documentElement;
  gsap.registerPlugin(ScrollTrigger);
  var ticks = root.querySelectorAll('[data-site="shefit-gym-al-hamra"] .marquee__dot');
  if (ticks.length) {
    gsap.to(ticks, { scale: 1.6, stagger: { each: 0.3, repeat: -1, yoyo: true }, duration: 0.6, ease: 'sine.inOut' });
  }
})(gsap, ScrollTrigger, reduce);
