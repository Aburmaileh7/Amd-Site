// The checker wall of the workshop becomes a band of tiles that flip in a wave on scroll.
(function (gsap, ScrollTrigger, reduce) {
  var root = document.querySelector('[data-site="ultimate-car-care"]');
  if (!root) return;
  var phone = window.innerWidth < 700;
  var cols = phone ? 12 : 28;
  var rows = 3;
  function band(red) {
    var el = document.createElement('div');
    el.className = 'ucc-flag';
    el.setAttribute('aria-hidden', 'true');
    el.style.setProperty('--cols', cols);
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var t = document.createElement('i');
        var dark = (r + c) % 2 === 1;
        t.className = dark ? 'd' : (red && r === 1 && c % 6 === 0 ? 'r' : '');
        el.appendChild(t);
      }
    }
    return el;
  }
  var targets = [root.querySelector('.menu'), root.querySelector('.visit')].filter(Boolean);
  var bands = targets.map(function (sec, i) {
    var b = band(i === 0);
    sec.parentNode.insertBefore(b, sec);
    return b;
  });
  if (reduce || !gsap) return;
  bands.forEach(function (b) {
    gsap.fromTo(b.children, { rotationX: 90, opacity: 0 }, {
      rotationX: 0, opacity: 1, ease: 'none',
      stagger: { amount: 1, from: 'end', grid: [rows, cols], axis: 'x' },
      scrollTrigger: { trigger: b, start: 'top 95%', end: 'top 45%', scrub: .6 }
    });
  });
  ScrollTrigger.refresh();
})(gsap, ScrollTrigger, reduce);
