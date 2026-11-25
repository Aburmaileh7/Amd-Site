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
              data: 'rosha-price',
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

  // Finish .proof [data-count] counters within <= 150ms so exact 4.2 / 185 render cleanly
  var proof = root.querySelector('.proof');
  if (proof) {
    var counts = Array.prototype.slice.call(proof.querySelectorAll('[data-count]'));
    var isCounterTarget = function (t, tw) {
      if (counts.indexOf(t) !== -1) return true;
      if (
        t &&
        typeof t === 'object' &&
        !t.nodeType &&
        tw.vars &&
        typeof tw.vars.onUpdate === 'function' &&
        tw.vars.repeat !== -1
      ) {
        var fn = String(tw.vars.onUpdate);
        if (
          fn.indexOf('textContent') !== -1 ||
          fn.indexOf('toFixed') !== -1 ||
          fn.indexOf('dataset') !== -1 ||
          'val' in t ||
          'v' in t ||
          'value' in t ||
          'count' in t
        ) {
          return true;
        }
      }
      return false;
    };

    var inProof = function (node) {
      return node instanceof Node && (node === proof || proof.contains(node));
    };

    var lockProof = function () {
      var children = gsap.globalTimeline.getChildren(true, true, false);
      for (var i = 0; i < children.length; i++) {
        var tw = children[i];
        if (!tw || tw.data === 'rosha-price' || typeof tw.targets !== 'function') continue;
        var st = tw.scrollTrigger || (tw.vars && tw.vars.scrollTrigger);
        var hit = Boolean(st && inProof(st.trigger));
        if (!hit) {
          var targets = tw.targets();
          for (var j = 0; j < targets.length; j++) {
            var t = targets[j];
            if (inProof(t) || isCounterTarget(t, tw)) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          tw.progress(1).kill();
        }
      }
      var allSt = ScrollTrigger.getAll();
      for (var s = 0; s < allSt.length; s++) {
        var trig = allSt[s];
        if (trig && trig.animation && inProof(trig.trigger)) {
          trig.animation.progress(1).kill();
        }
      }
      for (var k = 0; k < counts.length; k++) {
        var el = counts[k];
        var val = Number(el.dataset.count);
        if (isFinite(val)) {
          el.textContent = val.toFixed(Number(el.dataset.decimals || 0));
        }
      }
    };

    ScrollTrigger.create({
      trigger: proof,
      start: 'top 99%',
      once: true,
      onEnter: function () {
        lockProof();
        gsap.delayedCall(0.1, lockProof);
      }
    });

    ScrollTrigger.create({
      trigger: proof,
      start: 'top 80%',
      once: true,
      onEnter: lockProof
    });
  }
})();
