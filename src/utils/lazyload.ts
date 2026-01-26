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

/**
 * Generate responsive image with srcset
 * For optimal loading across different screen sizes
 */
export function responsiveImage(
  src: string,
  alt: string,
  sizes: string = '(max-width: 768px) 100vw, 50vw',
  className: string = ''
): string {
  // Generate srcset for common breakpoints
  // Assumes images follow naming: image.jpg -> image-400w.jpg, image-800w.jpg etc
  const baseName = src.replace(/\.(jpg|png|webp)$/, '')
  const ext = src.match(/\.(jpg|png|webp)$/)?.[0] || '.jpg'
  
  return `<img 
    src="${src}" 
    srcset="${baseName}-400w${ext} 400w, ${baseName}-800w${ext} 800w, ${src} 1200w"
    sizes="${sizes}"
    alt="${alt}" 
    class="${className}"
    loading="lazy"
  />`
}

// CSS for optimized image display
export const imageOptimizationStyles = `
<style>
/* Image Optimization Styles */
img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Aspect ratio containers for CLS prevention */
.aspect-video { aspect-ratio: 16/9; }
.aspect-square { aspect-ratio: 1/1; }
.aspect-portrait { aspect-ratio: 3/4; }

/* Object fit utilities */
.img-cover { object-fit: cover; }
.img-contain { object-fit: contain; }

/* Prevent layout shift */
.img-placeholder {
  background: linear-gradient(135deg, rgba(255,107,0,0.1) 0%, rgba(255,107,0,0.05) 100%);
}
</style>
`
