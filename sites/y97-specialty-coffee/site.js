(function () {
  if (reduce) return;
  var root = document.querySelector('[data-site="y97-specialty-coffee"]');
  if (!root) return;
  var q = function (s) { return root.querySelectorAll(s); };
  var rtl = getComputedStyle(document.documentElement).direction === "rtl";
  var origin = rtl ? "100% 50%" : "0% 50%";

  // the kilim frame weaves in from the inline-start edge, the photo settles inside it
  var side = root.querySelector(".hero__side");
  if (side) {
    var photo = side.querySelector(".photo");
    var tl = gsap.timeline({ delay: 0.15, defaults: { ease: "power3.out" } });
    tl.from(side, { scaleX: 0, transformOrigin: origin, duration: 1.1, ease: "power4.inOut" });
    if (photo) tl.from(photo, { opacity: 0, scale: 1.04, duration: 0.8 }, "-=0.45");
  }

  // marquee: duck marks bob once as the red field arrives
  var dots = q(".marquee__dot");
  var mq = root.querySelector(".marquee");
  if (dots.length && mq) {
    ScrollTrigger.create({
      trigger: mq, start: "top 85%", once: true,
      onEnter: function () {
        gsap.fromTo(dots, { y: 0 }, {
          y: -9, duration: 0.28, ease: "power2.out", yoyo: true, repeat: 3,
          stagger: { each: 0.06, repeat: 0 }
        });
      }
    });
  }

  // review cards unroll like rugs: a short drop from their kilim tab
  var cards = q(".card");
  if (cards.length) {
    ScrollTrigger.batch(cards, {
      start: "top 90%", once: true,
      onEnter: function (els) {
        gsap.from(els, {
          y: 28, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.1
        });
      }
    });
  }
})();
