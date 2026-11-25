(() => {
  if (reduce) return;

  const root = document.querySelector('[data-site="twig-men-care"]');
  if (!(root instanceof Node)) return;

  const q = (sel) => Array.from(root.querySelectorAll(sel));

  /* Lock .proof [data-count] cleanly to exact 4.9 / 270 (no mid-animation QA drift) */
  const proof = root.querySelector('.proof');
  if (proof instanceof Node) {
    const counters = Array.from(proof.querySelectorAll('[data-count]')).filter(
      (el) => el instanceof Node
    );

    const exactValue = (el) => {
      if (!(el instanceof Element)) return null;
      const raw = el.getAttribute('data-count');
      if (!raw) return null;
      const trimmed = raw.trim();
      const num = Number(trimmed);
      if (!Number.isFinite(num)) return trimmed;
      return trimmed.includes('.') ? num.toFixed(1) : String(Math.round(num));
    };

    counters.forEach((el) => {
      const exact = exactValue(el);
      if (exact === null) return;

      ScrollTrigger.getAll().forEach((st) => {
        if (!(st.trigger instanceof Node)) return;
        if (st.trigger === el) {
          if (st.animation) st.animation.progress(1).kill();
          st.kill();
        }
      });

      let locking = false;
      const lockNow = () => {
        if (locking || !(el instanceof Node)) return;
        locking = true;
        try {
          gsap.killTweensOf(el);
          if (el.textContent !== exact) {
            el.textContent = exact;
          }
        } finally {
          locking = false;
        }
      };

      lockNow();

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.target instanceof Node && el.textContent !== exact) {
            lockNow();
            observer.takeRecords();
            break;
          }
        }
      });

      observer.observe(el, { childList: true, characterData: true, subtree: true });

      ScrollTrigger.create({
        trigger: el,
        start: 'top 95%',
        once: true,
        onEnter: () => {
          lockNow();
          gsap.delayedCall(2.2, () => observer.disconnect());
        }
      });
    });
  }

  /* Signature moment: The Backlit Shelf & Olive Twig */
  const mainEl = root.querySelector('main');
  if (mainEl instanceof Node) {
    gsap.fromTo(
      root,
      { '--shelf-glow': 'rgba(212, 174, 106, 0.12)' },
      {
        '--shelf-glow': 'rgba(212, 174, 106, 0.34)',
        ease: 'none',
        scrollTrigger: {
          trigger: mainEl,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6
        }
      }
    );
  }

  const shelfCards = q('.proof .stat, .story .panel, .rev .card').filter(
    (el) => el instanceof Node
  );
  if (shelfCards.length) {
    ScrollTrigger.batch(shelfCards, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) => {
        gsap.fromTo(
          batch,
          { y: 16, scale: 0.985, opacity: 0.78 },
          {
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.55,
            stagger: 0.06,
            ease: 'power3.out',
            overwrite: 'auto',
            clearProps: 'transform'
          }
        );
      }
    });
  }

  const menuSection = root.querySelector('#menu');
  if (menuSection instanceof Node) {
    const tabsWrap = menuSection.querySelector('.tabs');
    if (tabsWrap instanceof Node) {
      tabsWrap.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof Element)) return;
        const btn = target.closest('button, [role="tab"]');
        if (!(btn instanceof Node)) return;

        requestAnimationFrame(() => {
          const items = Array.from(
            menuSection.querySelectorAll('.panel-m:not([hidden]) .item')
          ).filter((el) => el instanceof Node);
          if (!items.length) return;
          gsap.fromTo(
            items,
            { y: 10, opacity: 0.65 },
            {
              y: 0,
              opacity: 1,
              duration: 0.34,
              stagger: 0.035,
              ease: 'power2.out',
              overwrite: 'auto',
              clearProps: 'transform'
            }
          );
        });
      });
    }
  }
})();
