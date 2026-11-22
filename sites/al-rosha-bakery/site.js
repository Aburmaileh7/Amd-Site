// Al Rosha Bakery: the price board lights up line by line like reading it at 4:30 dawn,
// each price counting up from 0.000 to its baisa-precision figure.
(function () {
  if (reduce || !ScrollTrigger) return;
  var root = document.querySelector('[data-site="al-rosha-bakery"]');
  var menu = document.querySelector('[data-site="al-rosha-bakery"] .menu') || (root && root.querySelector('.menu'));
  if (!menu) return;
  var played = false;

  function play(panel) {
    var rows = panel.querySelectorAll('.item');
    if (!rows.length) return;
    var tl = gsap.timeline();
    rows.forEach(function (row, i) {
      var name = row.querySelector('.item__name');
      var lead = row.querySelector('.item__lead');
      var priceEl = row.querySelector('.item__price .ltr');
      var cur = row.querySelector('.item__price .cur');
      var at = i * 0.28;
      tl.fromTo(row, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', clearProps: 'transform,opacity' }, at);
      if (lead) tl.fromTo(lead, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.5, ease: 'power2.out', clearProps: 'transform' }, at + 0.1);
      if (priceEl) {
        var txt = priceEl.textContent;
        var target = parseFloat(txt);
        if (isFinite(target)) {
          var dec = (txt.split('.')[1] || '').length;
          var o = { v: 0 };
          priceEl.textContent = (0).toFixed(dec);
          tl.to(o, { v: target, duration: 0.7, ease: 'power2.out', onUpdate: function () { priceEl.textContent = o.v.toFixed(dec); }, onComplete: function () { priceEl.textContent = txt; } }, at + 0.15);
        }
      }
    });
  }

  function activePanel() {
    return menu.querySelector('.panel-m[data-active="true"]');
  }

  ScrollTrigger.create({
    trigger: menu.querySelector('.items') || menu,
    start: 'top 85%',
    once: true,
    onEnter: function () {
      played = true;
      var p = activePanel();
      if (p) play(p);
    }
  });

  // replay when a different tab is chosen
  menu.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[role="tab"]');
    if (!b || !played) return;
    setTimeout(function () {
      var p = activePanel();
      if (p) play(p);
    }, 60);
  });
})();
