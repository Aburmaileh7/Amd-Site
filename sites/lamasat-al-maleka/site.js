// A henna vine that draws itself line by line beside the story as the visitor scrolls.
(function (gsap, ScrollTrigger, reduce) {
  var root = document.querySelector('[data-site="lamasat-al-maleka"]');
  var story = root && root.querySelector('.story');
  if (!story) return;
  var stem = 'M60 0 C100 90 20 160 60 250 S100 410 60 500 S20 660 60 750 S100 910 60 1000';
  var parts = ['<path d="' + stem + '" pathLength="1" vector-effect="non-scaling-stroke"/>'];
  [[60, 120, 1], [52, 250, -1], [72, 370, 1], [60, 500, -1], [44, 620, 1], [60, 750, -1], [78, 870, 1]].forEach(function (a) {
    var x = a[0], y = a[1], s = a[2];
    parts.push('<path class="leaf" d="M' + x + ' ' + y + ' q' + 22 * s + ' -8 ' + 36 * s + ' -32 q' + -30 * s + ' 2 ' + -36 * s + ' 32" pathLength="1" vector-effect="non-scaling-stroke"/>');
    parts.push('<path d="M' + x + ' ' + (y + 6) + ' q' + 16 * s + ' 26 ' + -4 * s + ' 34 q' + -14 * s + ' -2 ' + -6 * s + ' -14" pathLength="1" vector-effect="non-scaling-stroke"/>');
  });
  var holder = document.createElement('div');
  holder.innerHTML = '<svg class="lm-vine" viewBox="0 0 120 1000" preserveAspectRatio="none" aria-hidden="true">' + parts.join('') + '</svg>';
  var vine = holder.firstChild;
  story.appendChild(vine);
  if (reduce || !gsap) return;
  var paths = vine.querySelectorAll('path');
  var tl = gsap.timeline({ scrollTrigger: { trigger: story, start: 'top 70%', end: 'bottom 80%', scrub: .6 } });
  tl.fromTo(paths[0], { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 10, ease: 'none' }, 0);
  Array.prototype.slice.call(paths, 1).forEach(function (p, i) {
    tl.fromTo(p, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .8, ease: 'none' }, .5 + i * .62);
  });
})(gsap, ScrollTrigger, reduce);
