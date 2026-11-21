/* Oateen: the mural wall lays itself tile by tile. Cream squares cover the hero tile and the
   imageless menu panels, then shrink away in a scattered order, uncovering the wall. */
const root = document.querySelector('[data-site="oateen-cafe-adore"]');
if (root && !reduce) {
  const lay = (host, cols, rows, trigger) => {
    if (!host) return;
    const cover = document.createElement('div');
    cover.setAttribute('aria-hidden', 'true');
    cover.style.cssText = 'position:absolute;inset:0;z-index:5;pointer-events:none;display:grid;' +
      'grid-template-columns:repeat(' + cols + ',1fr);grid-template-rows:repeat(' + rows + ',1fr)';
    const cells = [];
    for (let i = 0; i < cols * rows; i++) {
      const c = document.createElement('i');
      c.style.cssText = 'background:#F4EFE8;transform-origin:' + (i % 2 ? '0 100%' : '100% 0') + ';will-change:transform';
      cover.appendChild(c);
      cells.push(c);
    }
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.appendChild(cover);
    const tween = gsap.to(cells, {
      scale: 0, duration: 0.55, ease: 'power3.inOut',
      stagger: { amount: 0.9, from: 'random' }, paused: true,
      onComplete: () => cover.remove()
    });
    if (trigger) ScrollTrigger.create({ trigger: host, start: 'top 80%', once: true, onEnter: () => tween.play() });
    else gsap.delayedCall(0.35, () => tween.play());
  };

  lay(root.querySelector('.hero__side'), 4, 5, false);
  root.querySelectorAll('.panel-m__plain').forEach(el => lay(el, 3, 3, true));

  gsap.from(root.querySelectorAll('.marquee__dot'), {
    scale: 0, rotation: -90, duration: 0.6, ease: 'back.out(2)', stagger: 0.04,
    scrollTrigger: { trigger: root.querySelector('.marquee') || root, start: 'top 90%', once: true }
  });
}
