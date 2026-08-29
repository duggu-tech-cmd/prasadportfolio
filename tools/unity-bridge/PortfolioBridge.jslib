// ============================================================================
// PortfolioBridge.jslib
// ----------------------------------------------------------------------------
// COPY THIS FILE INTO YOUR UNITY PROJECT AT:
//
//     Assets/Plugins/WebGL/PortfolioBridge.jslib
//
// The folder matters — Unity only compiles .jslib files under Plugins/WebGL
// into the WebGL build. Then see README.md in this folder for the C# side.
//
// What it does: lets the running game tell the hosting page to close the
// full-screen embed, so your in-game Exit button behaves the way Stop does in
// the Unity editor.
// ============================================================================

mergeInto(LibraryManager.library, {

  // Called from C# as: PortfolioBridge_Exit();
  PortfolioBridge_Exit: function () {
    try {
      if (window.PortfolioBridge && window.PortfolioBridge.exit) {
        window.PortfolioBridge.exit();
      } else {
        // Running outside the portfolio embed (standalone page, itch.io, local
        // Build folder opened directly). Post the message anyway so any host
        // that understands it can react, and do not throw.
        parent.postMessage({ type: 'portfolio:game-exit' }, '*');
      }
    } catch (e) {
      console.warn('[PortfolioBridge] exit failed:', e);
    }
  },

  // Optional: true when the game is inside an iframe. Use it to show or hide
  // your Exit button — quitting makes no sense on a standalone page.
  PortfolioBridge_IsEmbedded: function () {
    try {
      return (window.parent && window.parent !== window) ? 1 : 0;
    } catch (e) {
      return 1;   // cross-origin parent access throws, which means embedded
    }
  },
});
