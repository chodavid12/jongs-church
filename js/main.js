// 종의교회 — 공통 스크립트

// 모바일 메뉴
const toggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

if (toggle && mobileMenu) {
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    mobileMenu.setAttribute('aria-hidden', String(!open));
  });

  // 메뉴 안 링크를 누르면 닫기
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
    });
  });
}

// 스크롤 리빌
const revealEls = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

// 공지 팝업
const promo = document.getElementById('promo');
if (promo && promo.dataset.active === 'true') {
  const key = 'promo:' + (promo.dataset.key || 'default');
  const today = (() => {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  })();

  // '오늘 하루 보지 않기'를 누른 날이면 표시하지 않음
  let dismissedToday = false;
  try { dismissedToday = localStorage.getItem(key) === today; } catch (e) {}

  if (!dismissedToday) {
    const openPromo = () => {
      promo.classList.add('open');
      promo.setAttribute('aria-hidden', 'false');
      document.body.classList.add('promo-open');
    };
    const closePromo = () => {
      promo.classList.remove('open');
      promo.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('promo-open');
    };

    promo.querySelectorAll('[data-promo-close]').forEach((el) => {
      el.addEventListener('click', closePromo);
    });

    const today1 = promo.querySelector('[data-promo-today]');
    if (today1) {
      today1.addEventListener('click', () => {
        try { localStorage.setItem(key, today); } catch (e) {}
        closePromo();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && promo.classList.contains('open')) closePromo();
    });

    setTimeout(openPromo, 800);
  }
}

// 푸터 연도
const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();
