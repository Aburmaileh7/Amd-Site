// Squeegee sweep: a flat pale film sheet with an emerald leading edge wipes across each photo once,
// and the same sweep lifts the peeled film corner slightly (max 1.2x) (--film on the parent) and lays it back down.
(function () {
  if (reduce) return;
  var root = document.querySelector('[data-site="protection-car-care"]');
  if (!root) return;

  function sweep(host, delay) {
    var base = parseFloat(getComputedStyle(host, '::before').width) || 110;
    var box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2';
    var sheet = document.createElement('div');
    sheet.style.cssText = 'position:absolute;top:0;bottom:0;left:0;width:100%;background:rgba(221,230,226,.5);border-right:4px solid #157A55;will-change:transform';
    box.appendChild(sheet);
    host.appendChild(box);
    gsap.timeline({
      delay: delay || 0,
      onComplete: function () { box.remove(); gsap.set(host, { clearProps: '--film' }); }
    })
      .fromTo(sheet, { xPercent: -100 }, { xPercent: 100, duration: 1.3, ease: 'power2.inOut' }, 0)
      .fromTo(host, { '--film': base + 'px' }, { '--film': Math.round(base * 1.2) + 'px', duration: 0.65, ease: 'power2.out' }, 0)
      .to(host, { '--film': base + 'px', duration: 0.65, ease: 'power2.inOut' }, 0.65);
  }

  var hero = root.querySelector('.hero__side');
  if (hero) sweep(hero, 0.5);

  root.querySelectorAll('.panel__media, .visit img').forEach(function (el) {
    var host = el.tagName === 'IMG' ? el.parentNode : el;
    if (getComputedStyle(host).position === 'static') return;
    ScrollTrigger.create({ trigger: host, start: 'top 80%', once: true, onEnter: function () { sweep(host, 0); } });
  });
})();
