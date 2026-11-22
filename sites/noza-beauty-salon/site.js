if (reduce) return;

const root = document.querySelector('[data-site="noza-beauty-salon"]');
if (!root) return;

const q = (s) => root.querySelectorAll(s);

const createNicheHalo = (frame) => {
  if (!frame || frame.querySelector('.noza-niche-halo')) return null;
  if (getComputedStyle(frame).position === 'static') frame.style.position = 'relative';
  frame.style.overflow = 'hidden';

  const halo = document.createElement('span');
  halo.className = 'noza-niche-halo';
  halo.setAttribute('aria-hidden', 'true');
  halo.style.cssText = [
    'position:absolute',
    'inset:0',
    'border-radius:inherit',
    'pointer-events:none',
    'will-change:transform,opacity',
    'opacity:0',
    'background:radial-gradient(ellipse 76% 48% at 50% 6%,rgba(152,224,220,0.42),rgba(26,102,100,0.10) 58%,transparent 82%),linear-gradient(180deg,rgba(255,255,255,0.22) 0%,transparent 38%,rgba(26,102,100,0.10) 100%)',
    'box-shadow:inset 0 1px 0 rgba(255,255,255,0.45)'
  ].join(';');

  const overlay = frame.querySelector('.photo__badge, .panel-m__caption');
  frame.insertBefore(halo, overlay || null);
  return halo;
};

const heroFrame = root.querySelector('.hero__side .photo');
const heroHalo = createNicheHalo(heroFrame);

if (heroHalo) {
  gsap.fromTo(
    heroHalo,
    { opacity: 0, scale: 0.95 },
    { opacity: 0.85, scale: 1, duration: 1.1, ease: 'power2.out', delay: 0.15 }
  );

  gsap.matchMedia().add('(min-width: 768px)', () => {
    gsap.fromTo(
      heroHalo,
      { y: 0 },
      {
        y: -22,
        ease: 'none',
        scrollTrigger: {
          trigger: root.querySelector('.hero'),
          start: 'top top',
          end: 'bottom top',
          scrub: 0.7
        }
      }
    );
  });
}

const menuHalos = Array.from(q('.panel-m__visual .photo, .panel-m__plain'))
  .map(createNicheHalo)
  .filter(Boolean);

if (menuHalos.length) {
  gsap.fromTo(
    menuHalos,
    { opacity: 0, y: 18, scale: 0.96 },
    {
      opacity: 0.8,
      y: 0,
      scale: 1,
      duration: 0.85,
      stagger: 0.08,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: root.querySelector('#menu'),
        start: 'top 78%',
        once: true
      }
    }
  );
}

const storyHalos = Array.from(q('.story .panel__media .photo'))
  .map(createNicheHalo)
  .filter(Boolean);

if (storyHalos.length) {
  gsap.fromTo(
    storyHalos,
    { opacity: 0, y: 16, scale: 0.96 },
    {
      opacity: 0.75,
      y: 0,
      scale: 1,
      duration: 0.85,
      stagger: 0.1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: root.querySelector('.story'),
        start: 'top 78%',
        once: true
      }
    }
  );
}
