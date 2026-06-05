/**
 * Simple, clean loading screen with the YESP Leaders rock-peak logo.
 * Renders a centered, animated logo with a subtle pulse + fade-in effect.
 * Automatically fades out after ~1.2s via CSS animation.
 */
export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo-wrapper">
        <svg
          viewBox="0 0 140 140"
          className="loading-logo"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="140" height="140" rx="28" fill="#111111" />
          <polygon points="70,28 22,124 118,124" fill="#FFFFFF" />
          <polygon points="70,50 42,124 98,124" fill="#111111" />
        </svg>
      </div>
    </div>
  );
}
