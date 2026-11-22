if (reduce) return;

const root = document.querySelector('[data-site="sorted-speciality-coffee"]');
if (!root) return;

const menu = root.querySelector('#menu, .menu');
if (!menu) return;

let desktop = false;
const mm = gsap.matchMedia();
mm.add('(min-width: 768px)', () => {
  desktop = true;
  return () => {
    desktop = false;
  };
});

const getActivePanel = () => {
  const activeTab = menu.querySelector('.tabs [aria-selected="true"]');
  if (activeTab) {
    const targetId = activeTab.getAttribute('aria-controls');
    if (targetId) {
      const controlled = menu.querySelector(`#${CSS.escape(targetId)}`);
      if (controlled) return controlled;
    }
    const tabs = Array.from(menu.querySelectorAll('.tabs [role="tab"], .tabs button'));
    const idx = tabs.indexOf(activeTab);
    const panels = menu.querySelectorAll('.panels .panel-m');
    if (idx >= 0 && panels[idx]) return panels[idx];
  }
  return menu.querySelector('.panels .panel-m:not([hidden])') || menu.querySelector('.panels .panel-m');
};

let activeTl = null;

const pourMenuPanel = (panel) => {
  if (!panel) return;
  if (activeTl) activeTl.kill();

  const archPhoto = panel.querySelector('.panel-m__visual .photo');
  const caption = panel.querySelector('.panel-m__caption');
  const items = Array.from(panel.querySelectorAll('.items .item'));

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out', overwrite: 'auto' },
    onComplete: () => {
      const targets = [archPhoto, caption, ...items].filter(Boolean);
      gsap.set(targets, { clearProps: 'transform,opacity' });
    }
  });

  if (archPhoto) {
    tl.fromTo(
      archPhoto,
      { y: desktop ? 26 : 18, scale: desktop ? 0.96 : 0.97, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.85 }
    );
  }

  if (caption) {
    tl.fromTo(
      caption,
      { y: 12, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6 },
      archPhoto ? '<0.12' : 0
    );
  }

  if (items.length) {
    tl.fromTo(
      items,
      { y: desktop ? 18 : 14, x: desktop ? -14 : 0, opacity: 0 },
      { y: 0, x: 0, opacity: 1, duration: 0.55, stagger: 0.05 },
      archPhoto ? '<0.16' : 0
    );
  }

  activeTl = tl;
};

ScrollTrigger.create({
  trigger: menu,
  start: 'top 80%',
  once: true,
  onEnter: () => pourMenuPanel(getActivePanel())
});

const tabsWrap = menu.querySelector('.tabs');
if (tabsWrap) {
  tabsWrap.addEventListener('click', (event) => {
    const btn = event.target.closest('button, [role="tab"]');
    if (!btn || !tabsWrap.contains(btn)) return;
    requestAnimationFrame(() => pourMenuPanel(getActivePanel()));
  });
}
