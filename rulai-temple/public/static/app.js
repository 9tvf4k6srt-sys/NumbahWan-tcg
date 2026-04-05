/* === TRILINGUAL SYSTEM === */
let currentLang = 'zh';

/* === VIDEO TRAILER === */
(function() {
  const vid = document.getElementById('temple-trailer');
  const btn = document.getElementById('play-btn');
  const wrap = document.getElementById('trailer-wrap');
  if (!vid || !btn) return;

  let blobLoaded = false;
  const btnSpan = btn.querySelector('span');

  function showLoading() {
    btnSpan.setAttribute('data-zh-orig', btnSpan.getAttribute('data-zh'));
    btnSpan.textContent = currentLang === 'en' ? 'Loading...' : currentLang === 'th' ? 'กำลังโหลด...' : '載入中...';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';
  }
  function hideLoading() {
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
    const attr = 'data-' + currentLang;
    btnSpan.textContent = btnSpan.getAttribute(attr) || btnSpan.getAttribute('data-zh');
  }

  function playTrailer() {
    if (!blobLoaded) {
      showLoading();
      fetch('/static/trailer.mp4')
        .then(function(r) { return r.blob(); })
        .then(function(blob) {
          vid.src = URL.createObjectURL(blob);
          vid.load();
          blobLoaded = true;
          vid.oncanplay = function() {
            vid.oncanplay = null;
            hideLoading();
            btn.classList.add('hidden');
            vid.muted = false;
            vid.play().catch(function() {
              // If unmuted play fails, try muted
              vid.muted = true;
              vid.play().catch(function() { showBtn(); });
            });
          };
        })
        .catch(function() {
          hideLoading();
          btn.classList.add('hidden');
          vid.muted = false;
          vid.play().catch(function() {
            vid.muted = true;
            vid.play().catch(function() { showBtn(); });
          });
        });
    } else {
      btn.classList.add('hidden');
      vid.muted = false;
      vid.play().catch(function() {
        vid.muted = true;
        vid.play().catch(function() { showBtn(); });
      });
    }
  }

  function showBtn() {
    btn.classList.remove('hidden');
    hideLoading();
  }

  btn.addEventListener('click', function(e) { e.stopPropagation(); playTrailer(); });
  wrap.addEventListener('click', function() {
    if (vid.paused) playTrailer();
    else { vid.pause(); showBtn(); }
  });
  vid.addEventListener('ended', function() { vid.currentTime = 0; showBtn(); });
})();

function setLang(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  document.querySelectorAll('[data-' + lang + ']').forEach(el => {
    const val = el.getAttribute('data-' + lang);
    if (val) el.textContent = val;
  });
  if (lang === 'th') document.body.style.fontFamily = "'Noto Sans Thai','Noto Sans TC',sans-serif";
  else document.body.style.fontFamily = "'Noto Sans TC',sans-serif";
}

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.lang));
});

/* === LOADER === */
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    initGSAP();
  }, 1500);
});

/* === MOBILE NAV — FULL UX === */
const navLinks = document.querySelector('.nav-links');
const mobileToggle = document.getElementById('mobile-toggle');
const mainNav = document.getElementById('main-nav');

function openMenu() {
  navLinks.classList.add('open');
  document.body.classList.add('menu-open');
  mobileToggle.setAttribute('aria-expanded', 'true');
  mobileToggle.innerHTML = '<svg class="ico" viewBox="0 0 64 64"><line x1="16" y1="16" x2="48" y2="48" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><line x1="48" y1="16" x2="16" y2="48" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
}

function closeMenu() {
  navLinks.classList.remove('open');
  document.body.classList.remove('menu-open');
  mobileToggle.setAttribute('aria-expanded', 'false');
  mobileToggle.innerHTML = '<svg class="ico" viewBox="0 0 64 64"><use href="/static/icons.svg#ico-menu"/></svg>';
}

// Toggle button
mobileToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  if (navLinks.classList.contains('open')) closeMenu();
  else openMenu();
});

// Close when clicking any nav link
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', closeMenu);
});

// Close when tapping outside the menu (on the overlay itself)
navLinks.addEventListener('click', (e) => {
  if (e.target === navLinks) closeMenu();
});

// Close on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')) closeMenu();
});

/* === NAV SCROLL + ACTIVE SECTION HIGHLIGHTING === */
const sections = document.querySelectorAll('.section, section');
const navAnchors = document.querySelectorAll('.nav-links a');

function updateNav() {
  // Shrink nav on scroll
  mainNav.classList.toggle('scrolled', window.scrollY > 80);

  // Highlight active section in nav
  let current = '';
  sections.forEach(section => {
    const top = section.offsetTop - 200;
    if (window.scrollY >= top) current = section.getAttribute('id');
  });
  navAnchors.forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === '#' + current) a.classList.add('active');
  });
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

/* === FLOATING MANTRA PARTICLES (whole page ambient) === */
function createIncense() {
  const c = document.getElementById('incense-container');
  const syllables = ['ॐ', 'म', 'णि', 'प', 'द्मे', 'हूं'];
  const isMobile = window.innerWidth < 900;
  const interval = isMobile ? 900 : 450;
  let idx = 0;
  setInterval(() => {
    const p = document.createElement('div');
    p.className = 'incense-particle';
    p.textContent = syllables[idx % syllables.length];
    idx++;
    p.style.left = Math.random() * 100 + 'vw';
    p.style.bottom = '0';
    p.style.animationDuration = (8 + Math.random() * 10) + 's';
    p.style.fontSize = (0.65 + Math.random() * 0.8) + 'rem';
    c.appendChild(p);
    setTimeout(() => p.remove(), 18000);
  }, interval);
}
createIncense();

/* === HERO MANTRA PARTICLES — ॐ मणि पद्मे हूं === */
function createHeroParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const syllables = ['ॐ', 'म', 'णि', 'प', 'द्मे', 'हूं'];
  const count = window.innerWidth < 900 ? 18 : 36;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'hero-particle';
    p.textContent = syllables[i % syllables.length];
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.fontSize = (0.7 + Math.random() * 1.1) + 'rem';
    p.style.opacity = (0.08 + Math.random() * 0.2).toString();
    container.appendChild(p);
  }
}
createHeroParticles();

/* === GSAP ANIMATIONS === */
function initGSAP() {
  gsap.registerPlugin(ScrollTrigger);

  // Hero entrance
  const tl = gsap.timeline();
  tl.from('.hero-logo-img', { scale: 0, rotation: 360, duration: 1.2, ease: 'back.out(1.7)' })
    .from('.hero-title', { y: 60, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.5')
    .from('.hero-sub', { y: 40, opacity: 0, duration: 0.8 }, '-=0.5')
    .from('.hero-mantra', { y: 30, opacity: 0, duration: 0.8 }, '-=0.4')
    .from('.hero-cta', { y: 30, opacity: 0, duration: 0.8 }, '-=0.4')
    .from('.scroll-indicator', { opacity: 0, duration: 0.5 }, '-=0.2');

  // Hero parallax — only on desktop (iOS doesn't support background-attachment:fixed)
  if (window.innerWidth > 900) {
    gsap.to('.hero-bg', {
      yPercent: 30,
      scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: 1 }
    });
  }

  // Hero particles float
  gsap.utils.toArray('.hero-particle').forEach(p => {
    gsap.to(p, {
      y: 'random(-100, 100)',
      x: 'random(-50, 50)',
      opacity: 'random(0.1, 0.5)',
      duration: 'random(3, 8)',
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  });

  // Section headers
  gsap.utils.toArray('.section-header').forEach(header => {
    gsap.from(header, {
      y: 50, opacity: 0, duration: 1,
      scrollTrigger: { trigger: header, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });

  // Reveal animations
  gsap.utils.toArray('.reveal-left').forEach(el => {
    gsap.from(el, {
      x: -80, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });
  gsap.utils.toArray('.reveal-right').forEach(el => {
    gsap.from(el, {
      x: 80, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' }
    });
  });
  gsap.utils.toArray('.reveal-up').forEach((el, i) => {
    gsap.from(el, {
      y: 60, opacity: 0, duration: 0.8, delay: i * 0.1, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
    });
  });

  // Parallax backgrounds — desktop only
  if (window.innerWidth > 900) {
    gsap.utils.toArray('.section-bg').forEach(bg => {
      gsap.to(bg, {
        yPercent: 15,
        scrollTrigger: { trigger: bg.parentElement, start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });
  }

  // Gallery hover glow
  gsap.utils.toArray('.gallery-item').forEach(item => {
    item.addEventListener('mouseenter', () => gsap.to(item, { scale: 1.05, duration: 0.3 }));
    item.addEventListener('mouseleave', () => gsap.to(item, { scale: 1, duration: 0.3 }));
  });

  // Dharma wheels continuous rotation
  gsap.utils.toArray('.dharma-wheel').forEach(w => {
    gsap.to(w, { rotation: 360, duration: 20, repeat: -1, ease: 'none' });
  });

  // Footer mantra scroll
  gsap.to('.footer-mantras', {
    xPercent: -20, duration: 15, repeat: -1, ease: 'none'
  });

  // Abbot image glow pulse
  gsap.to('.abbot-glow', {
    opacity: 0.6, scale: 1.05, duration: 2, repeat: -1, yoyo: true, ease: 'sine.inOut'
  });
}
