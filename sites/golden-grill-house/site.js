if (reduce) return;
const root = document.querySelector('[data-site="golden-grill-house"]');
if (!root) return;
// Steam-rise: the golden underline draws out, then the wok rings spin into place as each title enters.
const line = root.querySelector('.hero__headline');
if (line) {
  gsap.from(line, { y: 14, opacity: 0, duration: 1, ease: 'power3.out', delay: .25 });
}
const titles = root.querySelectorAll('.menu__title, .rev__title');
titles.forEach((t) => {
  gsap.fromTo(t, { y: 22, opacity: 0 }, {
    y: 0, opacity: 1, duration: .9, ease: 'power3.out',
    scrollTrigger: { trigger: t, start: 'top 85%', once: true }
  });
  gsap.fromTo(t, { '--ggh-spin': 0 }, {
    '--ggh-spin': 1, ease: 'none',
    scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: .6 }
  });
});
