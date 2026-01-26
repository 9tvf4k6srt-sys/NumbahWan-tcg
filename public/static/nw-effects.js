/**
 * NW EFFECTS - All-in-One Visual Effects Library
 * High-impact effects: Scroll Reveal, Hover Juice, Text Effects, Particles
 * Version 1.0.0 | Lightweight & Powerful
 */

(function() {
  'use strict';

  const NW = {
    config: {
      scrollThreshold: 0.15,
      particleCount: 30,
      hoverScale: 1.05,
      glowColor: '#ff6b00'
    },

    // ═══════════════════════════════════════════════════════════════
    // SCROLL REVEAL - Auto-animate elements on scroll
    // ═══════════════════════════════════════════════════════════════
    scrollReveal: {
      init() {
        const elements = document.querySelectorAll('[data-nw-reveal]');
        if (!elements.length) return;

        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('nw-visible');
              if (!entry.target.dataset.nwRevealRepeat) {
                observer.unobserve(entry.target);
              }
            } else if (entry.target.dataset.nwRevealRepeat) {
              entry.target.classList.remove('nw-visible');
            }
          });
        }, { threshold: NW.config.scrollThreshold });

        elements.forEach(el => {
          el.classList.add('nw-reveal', `nw-reveal-${el.dataset.nwReveal || 'up'}`);
          if (el.dataset.nwDelay) el.style.transitionDelay = el.dataset.nwDelay;
          observer.observe(el);
        });
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // HOVER JUICE - Magnetic, tilt, glow effects
    // ═══════════════════════════════════════════════════════════════
    hoverJuice: {
      init() {
        // Magnetic buttons
        document.querySelectorAll('[data-nw-magnetic]').forEach(el => {
          el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
          });
          el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0, 0)';
          });
        });

        // 3D Tilt cards
        document.querySelectorAll('[data-nw-tilt]').forEach(el => {
          el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            el.style.transform = `perspective(1000px) rotateY(${x * 20}deg) rotateX(${-y * 20}deg) scale(1.02)`;
          });
          el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateY(0) rotateX(0) scale(1)';
          });
        });

        // Ripple effect
        document.querySelectorAll('[data-nw-ripple]').forEach(el => {
          el.style.position = 'relative';
          el.style.overflow = 'hidden';
          el.addEventListener('click', e => {
            const ripple = document.createElement('span');
            const rect = el.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.cssText = `
              position:absolute;width:${size}px;height:${size}px;
              left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;
              background:rgba(255,255,255,0.4);border-radius:50%;
              transform:scale(0);animation:nwRipple 0.6s ease-out;pointer-events:none;
            `;
            el.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
          });
        });
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // TEXT EFFECTS - Typewriter, scramble, counter
    // ═══════════════════════════════════════════════════════════════
    textEffects: {
      init() {
        // Typewriter
        document.querySelectorAll('[data-nw-typewriter]').forEach(el => {
          const text = el.textContent;
          const speed = parseInt(el.dataset.nwTypewriter) || 50;
          el.textContent = '';
          el.style.borderRight = '2px solid currentColor';
          let i = 0;
          const type = () => {
            if (i < text.length) {
              el.textContent += text.charAt(i++);
              setTimeout(type, speed);
            } else {
              el.style.animation = 'nwBlink 1s step-start infinite';
            }
          };
          setTimeout(type, 500);
        });

        // Scramble text on hover
        document.querySelectorAll('[data-nw-scramble]').forEach(el => {
          const original = el.textContent;
          const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
          el.addEventListener('mouseenter', () => {
            let iterations = 0;
            const interval = setInterval(() => {
              el.textContent = original.split('').map((char, i) => 
                i < iterations ? original[i] : chars[Math.floor(Math.random() * chars.length)]
              ).join('');
              if (iterations++ >= original.length) clearInterval(interval);
            }, 30);
          });
        });

        // Counter animation
        document.querySelectorAll('[data-nw-counter]').forEach(el => {
          const target = parseInt(el.dataset.nwCounter);
          const duration = parseInt(el.dataset.nwDuration) || 2000;
          const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
              let start = 0;
              const step = target / (duration / 16);
              const count = () => {
                start += step;
                el.textContent = Math.floor(Math.min(start, target)).toLocaleString();
                if (start < target) requestAnimationFrame(count);
              };
              count();
              observer.disconnect();
            }
          });
          observer.observe(el);
        });
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // PARTICLES - Confetti, sparkles, floating
    // ═══════════════════════════════════════════════════════════════
    particles: {
      confetti(x, y, count = 30) {
        const colors = ['#ff6b00', '#00d4ff', '#ff00ff', '#00ff88', '#ffcc00'];
        for (let i = 0; i < count; i++) {
          const particle = document.createElement('div');
          particle.style.cssText = `
            position:fixed;width:10px;height:10px;background:${colors[i % colors.length]};
            left:${x}px;top:${y}px;pointer-events:none;z-index:9999;
            border-radius:${Math.random() > 0.5 ? '50%' : '0'};
          `;
          document.body.appendChild(particle);
          const angle = (Math.PI * 2 * i) / count;
          const velocity = 5 + Math.random() * 10;
          const vx = Math.cos(angle) * velocity;
          const vy = Math.sin(angle) * velocity - 10;
          let posX = x, posY = y, gravity = 0.5, opacity = 1;
          const animate = () => {
            posX += vx; posY += vy + gravity; gravity += 0.3; opacity -= 0.02;
            particle.style.left = posX + 'px';
            particle.style.top = posY + 'px';
            particle.style.opacity = opacity;
            particle.style.transform = `rotate(${posX}deg)`;
            if (opacity > 0) requestAnimationFrame(animate);
            else particle.remove();
          };
          requestAnimationFrame(animate);
        }
      },

      sparkle(el) {
        const rect = el.getBoundingClientRect();
        for (let i = 0; i < 5; i++) {
          const spark = document.createElement('div');
          spark.innerHTML = '✦';
          spark.style.cssText = `
            position:fixed;color:#ffcc00;font-size:${10 + Math.random() * 10}px;
            left:${rect.left + Math.random() * rect.width}px;
            top:${rect.top + Math.random() * rect.height}px;
            pointer-events:none;z-index:9999;animation:nwSparkle 0.8s ease-out forwards;
          `;
          document.body.appendChild(spark);
          setTimeout(() => spark.remove(), 800);
        }
      },

      init() {
        // Auto-confetti on click
        document.querySelectorAll('[data-nw-confetti]').forEach(el => {
          el.addEventListener('click', e => this.confetti(e.clientX, e.clientY));
        });
        // Auto-sparkle on hover
        document.querySelectorAll('[data-nw-sparkle]').forEach(el => {
          el.addEventListener('mouseenter', () => this.sparkle(el));
        });
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // PAGE TRANSITIONS - Smooth page loads
    // ═══════════════════════════════════════════════════════════════
    pageTransition: {
      init() {
        document.body.classList.add('nw-page-ready');
        document.querySelectorAll('a[data-nw-transition]').forEach(link => {
          link.addEventListener('click', e => {
            if (link.href && !link.href.startsWith('#')) {
              e.preventDefault();
              document.body.classList.add('nw-page-exit');
              setTimeout(() => window.location = link.href, 300);
            }
          });
        });
      }
    },

    // ═══════════════════════════════════════════════════════════════
    // INIT - Start everything
    // ═══════════════════════════════════════════════════════════════
    init(options = {}) {
      Object.assign(this.config, options);
      
      // Inject required CSS animations
      if (!document.getElementById('nw-effects-css')) {
        const style = document.createElement('style');
        style.id = 'nw-effects-css';
        style.textContent = `
          @keyframes nwRipple{to{transform:scale(4);opacity:0}}
          @keyframes nwBlink{50%{border-color:transparent}}
          @keyframes nwSparkle{0%{transform:scale(0) rotate(0);opacity:1}100%{transform:scale(1) rotate(180deg) translateY(-20px);opacity:0}}
          .nw-page-ready{animation:nwFadeIn 0.5s ease-out}
          .nw-page-exit{animation:nwFadeOut 0.3s ease-in forwards}
          @keyframes nwFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
          @keyframes nwFadeOut{to{opacity:0;transform:translateY(-10px)}}
          [data-nw-tilt],[data-nw-magnetic]{transition:transform 0.15s ease-out}
        `;
        document.head.appendChild(style);
      }

      // Initialize all modules
      this.scrollReveal.init();
      this.hoverJuice.init();
      this.textEffects.init();
      this.particles.init();
      this.pageTransition.init();
      
      console.log('🎨 NW Effects initialized');
    }
  };

  // Auto-init on DOM ready, expose globally
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NW.init());
  } else {
    NW.init();
  }
  
  window.NW = NW;
})();
