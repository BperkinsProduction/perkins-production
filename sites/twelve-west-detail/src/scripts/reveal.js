// Section entrances and the tube line under each heading. Retires itself once a section is in.
const sections = document.querySelectorAll('[data-reveal]');
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
    setTimeout(() => e.target.classList.add('settled'), 1400);
  });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
sections.forEach((s) => io.observe(s));

// Pause every looping animation while the tab is hidden.
document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));
