// Laminated dough: a stack of butter layers packed tight that rises apart while it scrolls through.
(function (gsap, ScrollTrigger, reduce) {
  var root = document.querySelector('[data-site="kayzen-bakery"]');
  if (!root) return;
  var colors = ['#E9B45C', '#D8953B', '#F0CB82', '#C87F2C', '#EDBD6B', '#D8953B', '#F0CB82', '#B86E22'];

  function wave(seed) {
    var d = 'M0 20';
    for (var x = 0; x <= 1200; x += 60) {
      var y = 20 + Math.sin((x + seed * 37) / 95) * 7 + Math.sin((x + seed * 11) / 41) * 3;
      d += ' L' + x + ' ' + y.toFixed(1);
    }
    return d;
  }
  function band() {
    var el = document.createElement('div');
    el.className = 'kz-lam';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = colors.map(function (c, i) {
      return '<svg viewBox="0 0 1200 40" preserveAspectRatio="none"><path d="' + wave(i + 1) + '" stroke="' + c + '"/></svg>';
    }).join('');
    return el;
  }
  var story = root.querySelector('.story');
  if (!story) return;
  var lam = band();
  story.parentNode.insertBefore(lam, story);
  var layers = lam.querySelectorAll('svg');
  var gap = function () { return (lam.offsetHeight - 44) / (layers.length - 1); };

  if (reduce || !gsap) {
    layers.forEach(function (l, i) { l.style.transform = 'translateY(' + (i * gap()) + 'px)'; });
    return;
  }
  gsap.fromTo(layers, { y: function (i) { return i * 4; } }, {
    y: function (i) { return i * gap(); }, ease: 'none',
    scrollTrigger: { trigger: lam, start: 'top 95%', end: 'top 35%', scrub: .5, invalidateOnRefresh: true }
  });
  ScrollTrigger.refresh();
})(gsap, ScrollTrigger, reduce);
