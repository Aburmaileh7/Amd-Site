/* Nabu: the wall is laid course by course. Marquee words and story plaques are set into the lapis wall like tiles. */
(function () {
  if (reduce) return;
  var root = document.querySelector('[data-site="nabu-cafe"]');
  if (!root) return;
  var q = function (s) { return Array.prototype.slice.call(root.querySelectorAll(s)); };

  var marquee = root.querySelector('.marquee');
  if (marquee) {
    var firstRow = q('.marquee__row')[0];
    var words = firstRow ? Array.prototype.slice.call(firstRow.children) : [];
    if (words.length) {
      gsap.from(words, {
        y: 26, scale: 0.86, autoAlpha: 0, duration: 0.7, ease: 'back.out(1.5)',
        stagger: { each: 0.09, from: 'start' },
        scrollTrigger: { trigger: marquee, start: 'top 88%', once: true }
      });
    }
  }

  var story = root.querySelector('.story');
  if (story) {
    var head = q('.story__head > *');
    if (head.length) {
      gsap.from(head, {
        y: 24, autoAlpha: 0, duration: 0.8, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: story, start: 'top 75%', once: true }
      });
    }
    var panels = q('.panel');
    panels.forEach(function (p, i) {
      var media = p.querySelector('.panel__media');
      var text = p.querySelector('.panel__text');
      var clock = p.querySelector('.panel__clock');
      var tl = gsap.timeline({
        scrollTrigger: { trigger: story, start: 'top 60%', once: true }
      });
      var d = i * 0.18;
      if (media) tl.from(media, { y: -40, autoAlpha: 0, scale: 0.94, duration: 0.7, ease: 'power3.out' }, d);
      if (text) tl.from(text, { y: 36, autoAlpha: 0, duration: 0.7, ease: 'power3.out' }, d + 0.12);
      if (clock) tl.from(clock, { x: 30, autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, d + 0.3);
    });
  }
})();
