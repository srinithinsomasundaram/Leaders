import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

const PERMISSION_DISMISSED_KEY = "notification-permission-dismissed";
const COOLDOWN_HOURS = 72; // 3 days

export function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isClient, setIsClient] = useState(false);

  // Check if we're on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run on client side
    if (!isClient || typeof window === 'undefined') return;

    // Check current permission status
    if ('Notification' in window) {
      setPermission(Notification.permission);

      // Don't show if already granted or denied
      if (Notification.permission !== "default") {
        return;
      }

      // Check if dismissed within cooldown
      const dismissed = localStorage.getItem(PERMISSION_DISMISSED_KEY);
      if (dismissed) {
        const dismissedTime = parseInt(dismissed, 10);
        const now = Date.now();
        const hoursPassed = (now - dismissedTime) / (1000 * 60 * 60);

        if (hoursPassed < COOLDOWN_HOURS) {
          return;
        } else {
          localStorage.removeItem(PERMISSION_DISMISSED_KEY);
        }
      }

      // Show prompt after a short delay (let user see the site first)
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 10000); // 10 seconds delay

      return () => clearTimeout(timer);
    }
  }, [isClient]);

  const handleAllow = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        const permission = await Notification.requestPermission();
        setPermission(permission);

        if (permission === "granted") {
          // Register service worker if not already registered
          const registration = await navigator.serviceWorker.ready;

          // Subscribe to push notifications (you'll need to add your VAPID keys)
          // const subscription = await registration.pushManager.subscribe({
          //   userVisibleOnly: true,
          //   applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
          // });

          // Send subscription to your server
          // await fetch('/api/subscribe', {
          //   method: 'POST',
          //   body: JSON.stringify(subscription),
          //   headers: { 'Content-Type': 'application/json' }
          // });

          // Show a test notification
          new Notification("Notifications Enabled!", {
            body: "You'll now receive updates from Yesp Leaders",
            icon: "/logo.svg",
            badge: "/favicon.svg",
          });
        }
      } catch (error) {
        console.error("Error requesting notification permission:", error);
      }
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(PERMISSION_DISMISSED_KEY, Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if not on client or notifications not supported or permission already handled
  if (!isClient || (typeof window !== 'undefined' && !('Notification' in window)) || !showPrompt || permission !== "default") {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
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
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-serif text-lg font-bold text-foreground mb-1">
              Stay Updated
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get notified about new posts, comments, and updates from leaders you follow
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleAllow}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity active:scale-95"
              >
                Enable Notifications
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-surface text-foreground rounded-lg font-medium text-sm hover:bg-surface-2 transition-colors active:scale-95"
              >
                Later
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              You can change this anytime in your browser settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
