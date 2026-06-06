import { useState, useEffect } from "react";
import { Download, X, ExternalLink } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed";
const INSTALLED_KEY = "pwa-installed";
const COOLDOWN_HOURS = 36;

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    const installed = localStorage.getItem(INSTALLED_KEY);
    if (installed) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed within cooldown period
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const now = Date.now();
      const hoursPassed = (now - dismissedTime) / (1000 * 60 * 60);

      if (hoursPassed < COOLDOWN_HOURS) {
        return; // Still in cooldown period
      } else {
        // Cooldown expired, remove the key
        localStorage.removeItem(DISMISS_KEY);
      }
    }

    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      localStorage.setItem(INSTALLED_KEY, "true");
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful installation
    window.addEventListener("appinstalled", () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "true");
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowPrompt(false);
  };

  const handleOpenInApp = () => {
    // This would typically open the app if it's installed
    // For now, just navigate to home
    window.location.href = "/";
  };

  // Show "Open in App" button if installed
  if (isInstalled && window.matchMedia('(display-mode: browser)').matches) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={handleOpenInApp}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 font-medium text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Open in App
        </button>
      </div>
    );
  }

  // Show install prompt if not installed and not dismissed
  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-5 backdrop-blur-md">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-surface-2 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-serif text-lg font-bold text-foreground mb-1">
              Install Yesp Leaders
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get faster access and a better experience with our app
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity active:scale-95"
              >
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-surface text-foreground rounded-lg font-medium text-sm hover:bg-surface-2 transition-colors active:scale-95"
              >
                Not now
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Dismissed prompts reappear after 36 hours
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
