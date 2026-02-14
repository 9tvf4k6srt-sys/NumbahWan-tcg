/**
 * NW_I18N — Legacy Compatibility Redirect
 * ========================================
 * Some older pages include <script src="/static/nw-i18n.js">.
 * The shim (nw-i18n-shim.js) handles the queue.
 * This file ensures nw-i18n-core.js is also loaded.
 * 
 * For NEW pages, just use:
 *   <script src="/static/nw-i18n-shim.js"></script>
 *   <script src="/static/nw-i18n-core.js" defer></script>
 */

// If nw-i18n-core.js hasn't replaced the shim yet, it will do so when
// it loads (it's deferred). Nothing else to do here — the shim already
// provides a working NW_I18N queue.
