/* ============================================================
   HERO.JS — Homepage hero slideshow
   ============================================================ */

export function initHero() {
  const slides = document.querySelectorAll('.hero__slide');
  const indicators = document.querySelectorAll('.hero__indicator');
  if (slides.length === 0) return;

  let current = 0;
  let interval;

  function showSlide(index) {
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === index);
    });
    indicators.forEach((ind, i) => {
      ind.classList.toggle('active', i === index);
    });
    current = index;
  }

  function nextSlide() {
    showSlide((current + 1) % slides.length);
  }

  function startAutoplay() {
    interval = setInterval(nextSlide, 5000);
  }

  function stopAutoplay() {
    clearInterval(interval);
  }

  // Indicator clicks
  indicators.forEach((ind, i) => {
    ind.addEventListener('click', () => {
      stopAutoplay();
      showSlide(i);
      startAutoplay();
    });
  });

  // Initialize
  showSlide(0);
  startAutoplay();

  // Pause on hover (desktop)
  const hero = document.querySelector('.hero');
  if (hero) {
    hero.addEventListener('mouseenter', stopAutoplay);
    hero.addEventListener('mouseleave', startAutoplay);
  }
}
