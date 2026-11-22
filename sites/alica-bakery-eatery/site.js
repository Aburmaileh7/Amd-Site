/* ALICA Bakery / Eatery — Porcelain Double-Rim Glaze & Ceramic Seal Arrival */
if (reduce) return;

const root = document.querySelector('[data-site="alica-bakery-eatery"]');
if (!root) return;

const q = (s) => root.querySelectorAll(s);

/* Porcelain rim glaze: sea-blue double rims deepen gently as morning unfolds on scroll */
const main = root.querySelector('main') || root;
gsap.fromTo(
  root,
  {
    '--alica-rim': 'rgba(24, 78, 104, 0.14)',
    '--alica-rim-soft': 'rgba(24, 78, 104, 0.06)'
  },
  {
    '--alica-rim': 'rgba(24, 78, 104, 0.34)',
    '--alica-rim-soft': 'rgba(24, 78, 104, 0.16)',
    ease: 'none',
    scrollTrigger: {
      trigger: main,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.6
    }
  }
);

/* Ceramic seals & hour badges press gently into place as each story plate enters */
const panels = q('section.story .panel');
if (panels.length) {
  const seals = q('section.story .panel .photo__badge, section.story .panel .panel__time');
  if (seals.length) {
    gsap.set(seals, { y: 10, scale: 0.94, opacity: 0 });
    ScrollTrigger.batch(panels, {
      start: 'top 86%',
      once: true,
      onEnter: (batch) => {
        const targets = [];
        batch.forEach((panel) => {
          panel.querySelectorAll('.photo__badge, .panel__time').forEach((el) => targets.push(el));
        });
        if (!targets.length) return;
        gsap.to(targets, {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.6,
          stagger: 0.08,
          ease: 'power3.out',
          clearProps: 'transform'
        });
      }
    });
  }
}
