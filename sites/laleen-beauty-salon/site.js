// Laleen: each story mirror catches one sweep of light as it enters the view.
if (!reduce) {
  const root = document.querySelector('[data-site="laleen-beauty-salon"]');
  const mirrors = root ? root.querySelectorAll(".story--stack .panel__media") : [];
  mirrors.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 78%",
      once: true,
      onEnter: () => el.classList.add("is-lit"),
    });
  });
}
