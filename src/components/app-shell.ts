/**
 * App Shell Component
 * Based on AI Training Guide: Chapter 8 - Frontend Architecture
 * 
 * The App Shell pattern:
 * - Minimal HTML/CSS/JS for instant first paint
 * - Cacheable shell that loads instantly
 * - Content loaded progressively
 */

import { lazyLoadStyles, lazyLoadScript } from '../utils/lazyload'

// Critical CSS that renders the shell instantly
export const criticalCSS = `
<style id="critical-css">
/* Critical CSS - Renders shell instantly */
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:#0a0a0f;color:#fff;font-family:system-ui,-apple-system,sans-serif}

/* First Paint Loader */
#fp{position:fixed;inset:0;background:#0a0a0f;z-index:999999;display:flex;align-items:center;justify-content:center}
#fp svg{width:80px;height:80px;animation:fpp 1.5s ease-in-out infinite}
@keyframes fpp{0%,100%{transform:scale(1);filter:drop-shadow(0 0 15px #ff6b00)}50%{transform:scale(1.15);filter:drop-shadow(0 0 30px #ffd700)}}
.fp-hide{display:none!important}

/* App Shell - Minimal layout */
.app-shell{min-height:100vh;display:flex;flex-direction:column}
.shell-header{position:fixed;top:0;left:0;right:0;height:80px;background:rgba(10,10,15,0.95);backdrop-filter:blur(20px);z-index:100}
.shell-main{flex:1;margin-top:80px}
.shell-footer{background:rgba(0,0,0,0.5);padding:2rem;text-align:center}

/* Content skeleton */
.skeleton{background:linear-gradient(90deg,rgba(255,107,0,0.1) 25%,rgba(255,107,0,0.2) 50%,rgba(255,107,0,0.1) 75%);background-size:200% 100%;animation:skel 1.5s infinite}
@keyframes skel{0%{background-position:200% 0}100%{background-position:-200% 0}}
</style>
`

// First paint loader SVG (ultra minimal)
export const firstPaintLoader = `
<div id="fp">
  <svg viewBox="0 0 100 100">
    <defs>
      <linearGradient id="fpG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffcc70"/>
        <stop offset="50%" stop-color="#ff9500"/>
        <stop offset="100%" stop-color="#8B4513"/>
      </linearGradient>
    </defs>
    <polygon points="35,15 65,15 85,50 65,85 35,85 15,50" fill="none" stroke="url(#fpG)" stroke-width="4"/>
    <text x="50" y="58" text-anchor="middle" fill="url(#fpG)" font-size="32" font-weight="bold" font-family="Arial">N</text>
  </svg>
</div>
`

// Script to hide loader once content is ready
export const shellScript = `
<script>
// App Shell - Hide loader when ready
window.addEventListener('load', () => {
  requestAnimationFrame(() => {
    const fp = document.getElementById('fp');
    const il = document.getElementById('instant-loader');
    if (fp) fp.classList.add('fp-hide');
    if (il) il.classList.add('hidden');
  });
});

// Performance mark
if (performance && performance.mark) {
  performance.mark('shell-ready');
}
</script>
`

/**
 * Generate complete App Shell HTML wrapper
 */
export function appShell(options: {
  title: string
  content: string
  scripts?: string
  styles?: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    ${criticalCSS}
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
    <link rel="icon" type="image/svg+xml" href="/static/favicon.svg">
    ${lazyLoadStyles}
    ${options.styles || ''}
</head>
<body class="app-shell">
    ${firstPaintLoader}
    
    <header class="shell-header">
        <!-- Nav loaded here -->
    </header>
    
    <main class="shell-main">
        ${options.content}
    </main>
    
    ${shellScript}
    ${lazyLoadScript}
    ${options.scripts || ''}
</body>
</html>`
}
