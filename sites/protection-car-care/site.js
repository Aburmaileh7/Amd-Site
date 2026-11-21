// Squeegee sweep: a pale film sheet with an emerald leading edge wipes across each photo once.
(function () {
  if (reduce) return;
  var root = document.querySelector('[data-site="protection-car-care"]');
  if (!root) return;

  function sweep(host, delay) {
    var box = document.createElement('div');
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2';
    var sheet = document.createElement('div');
    sheet.style.cssText = 'position:absolute;top:0;bottom:0;left:0;width:100%;background:linear-gradient(90deg,rgba(245,246,248,0) 0%,rgba(245,246,248,.55) 100%);border-right:4px solid #157A55;will-change:transform';
    box.appendChild(sheet);
    host.appendChild(box);
    gsap.fromTo(sheet, { xPercent: -100 }, {
      xPercent: 100, duration: 1.3, delay: delay || 0, ease: 'power2.inOut',
      onComplete: function () { box.remove(); }
    });
  }

  var hero = root.querySelector('.hero__side');
  if (hero) sweep(hero, 0.5);

  root.querySelectorAll('.panel__media, .visit img').forEach(function (el) {
    var host = el.tagName === 'IMG' ? el.parentNode : el;
    if (getComputedStyle(host).position === 'static') return;
    ScrollTrigger.create({ trigger: host, start: 'top 80%', once: true, onEnter: function () { sweep(host, 0); } });
  });
})();
