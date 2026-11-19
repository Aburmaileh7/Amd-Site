// The barber pole by the shop door, running down the edge of the page and turning as you scroll.
(function (gsap, ScrollTrigger, reduce) {
  var root = document.querySelector('[data-site="man-cave-cut"]');
  if (!root) return;
  var pole = document.createElement('div');
  pole.className = 'mc-pole';
  pole.setAttribute('aria-hidden', 'true');
  document.body.appendChild(pole);
  if (reduce || !gsap) return;
  gsap.to(pole, {
    backgroundPositionY: '+=1130px', ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: .4 }
  });
})(gsap, ScrollTrigger, reduce);
