/**
 * Lazy Loading Utility
 * Based on AI Training Guide: Chapter 4 - Media Asset Management
 * 
 * Implements:
 * - Progressive image loading (low-quality placeholder → full)
 * - Intersection Observer for lazy loading
 * - Native lazy loading fallback
 * - Blur-up effect
 */

// Client-side lazy loading script
export const lazyLoadScript = `
<script>
// Lazy Load Images - Progressive Loading Pattern
(function() {
  // Check for native lazy loading support
  const supportsNativeLazy = 'loading' in HTMLImageElement.prototype;
  
  // Intersection Observer for custom lazy loading
  const lazyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        
        // Load full image
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        
        // Load srcset if exists
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
          img.removeAttribute('data-srcset');
        }
        
        // Remove blur effect on load
        img.onload = () => {
          img.classList.remove('blur-load');
          img.classList.add('loaded');
        };
        
        lazyObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',  // Load 50px before entering viewport
    threshold: 0.01
  });
  
  // Initialize lazy loading
  function initLazyLoad() {
    const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    
    lazyImages.forEach(img => {
      if (supportsNativeLazy && img.loading === 'lazy') {
        // Use native lazy loading
        return;
      }
      
      // Use Intersection Observer
      if (img.dataset.src) {
        img.classList.add('blur-load');
        lazyObserver.observe(img);
      }
    });
  }
  
  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLazyLoad);
  } else {
    initLazyLoad();
  }
  
  // Re-init for dynamic content
  window.initLazyLoad = initLazyLoad;
})();
</script>
`

// CSS for blur-up effect
export const lazyLoadStyles = `
<style>
/* Lazy Load Blur-Up Effect */
img.blur-load {
  filter: blur(10px);
  transition: filter 0.3s ease-out;
}
img.blur-load.loaded,
img.loaded {
  filter: blur(0);
}

/* Placeholder skeleton */
.img-skeleton {
  background: linear-gradient(90deg, rgba(255,107,0,0.1) 25%, rgba(255,107,0,0.2) 50%, rgba(255,107,0,0.1) 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s infinite;
}
@keyframes skeleton-pulse {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
`

/**
 * Generate lazy-load image HTML
 * Uses low-quality placeholder (blur-up) pattern
 */
export function lazyImage(
  src: string, 
  alt: string, 
  className: string = '',
  placeholder?: string
): string {
  const placeholderSrc = placeholder || `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E`
  
  return `<img 
    src="${placeholderSrc}" 
    data-src="${src}" 
    alt="${alt}" 
    class="${className} blur-load"
    loading="lazy"
  />`
}
