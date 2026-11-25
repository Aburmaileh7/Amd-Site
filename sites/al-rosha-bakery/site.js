// Al Rosha Bakery: the price board lights up line by line like reading it at 4:30 dawn,
// each price counting up from 0.000 to its baisa-precision figure.
(function () {
  if (reduce || !ScrollTrigger) return;
  var root = document.querySelector('[data-site="al-rosha-bakery"]');
  var menu = root && root.querySelector('.menu');
  if (!menu) return;
  var played = false;
  var activeTl = null;

  function play(panel) {
    var rows = panel.querySelectorAll('.item');
    if (!rows.length) return;
    if (activeTl) {
      activeTl.progress(1).kill();
      activeTl = null;
    }
    var tl = gsap.timeline();
    activeTl = tl;
    rows.forEach(function (row, i) {
      var lead = row.querySelector('.item__lead');
      var priceEl = row.querySelector('.item__price .ltr');
      var at = i * 0.05;
      tl.fromTo(
        row,
        { opacity: 0.35, y: 12 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out', clearProps: 'transform,opacity' },
        at
      );
      if (lead) {
        tl.fromTo(
          lead,
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.25, ease: 'power2.out', clearProps: 'transform' },
          at
        );
      }
      if (priceEl) {
        var txt = priceEl.dataset.priceTarget || priceEl.textContent;
        priceEl.dataset.priceTarget = txt;
        var target = parseFloat(txt);
        if (isFinite(target)) {
          var dec = (txt.split('.')[1] || '').length;
          var o = { v: 0 };
          priceEl.textContent = (0).toFixed(dec);
          tl.to(
            o,
            {
              v: target,
              duration: 0.28,
              ease: 'power2.out',
              onUpdate: function () {
                priceEl.textContent = o.v.toFixed(dec);
              },
              onComplete: function () {
                priceEl.textContent = txt;
              }
            },
            at + 0.02
          );
        }
      }
    });
  }

  function activePanel() {
    return menu.querySelector('.panel-m[data-active="true"]');
  }

  ScrollTrigger.create({
    trigger: menu.querySelector('.items') || menu,
    start: 'top 95%',
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
    }, 40);
  });
})();
