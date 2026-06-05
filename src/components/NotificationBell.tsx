import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getNotifications,
  markNotificationsRead,
  markNotificationRead,
} from "@/lib/posts.functions";
import {
  Bell,
  Heart,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Check,
  User,
} from "lucide-react";

interface ProfileData {
  name: string;
  username: string;
  avatar_url: string | null;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string; // 'upvote' | 'comment' | 'mention' | 'verification_approved' | 'verification_rejected'
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  actor_id: string | null;
  post_id: string | null;
  created_at: string;
  actor: ProfileData | null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getNotificationsFn = useServerFn(getNotifications);
  const markAllReadFn = useServerFn(markNotificationsRead);
  const markOneReadFn = useServerFn(markNotificationRead);

  // Fetch notifications
  const { data: notifications = [] } = useQuery<NotificationRow[]>({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await getNotificationsFn();
      return (res ?? []) as unknown as NotificationRow[];
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Realtime updates
  useEffect(() => {
    if (!user?.id) return;

    const channelId = `notifications-bell-${user.id}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      await markAllReadFn();
      queryClient.setQueryData(
        ["notifications", user?.id],
        (prev: NotificationRow[] | undefined) =>
          prev ? prev.map((n) => ({ ...n, is_read: true })) : []
      );
    } catch (err) {
      console.error("Failed to mark notifications read", err);
    }
  };

  const handleItemClick = async (n: NotificationRow) => {
    setIsOpen(false);
    if (!n.is_read) {
      try {
        await markOneReadFn({ data: { id: n.id } });
        queryClient.setQueryData(
          ["notifications", user?.id],
          (prev: NotificationRow[] | undefined) =>
            prev
              ? prev.map((item) =>
                  item.id === n.id ? { ...item, is_read: true } : item
                )
              : []
        );
      } catch (err) {
        console.error("Failed to mark single notification read", err);
      }
    }
    if (n.link) {
      navigate({ to: n.link as any });
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "upvote":
        return (
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Heart className="w-4.5 h-4.5 fill-current" />
          </div>
        );
      case "comment":
      case "mention":
        return (
          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <MessageSquare className="w-4.5 h-4.5" />
          </div>
        );
      case "verification_approved":
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <ShieldCheck className="w-4.5 h-4.5" />
          </div>
        );
      case "verification_rejected":
        return (
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-muted-foreground">
            <User className="w-4.5 h-4.5" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-all duration-200 cursor-pointer group"
        aria-label="Notifications"
      >
        <Bell className="w-5.5 h-5.5 transition-transform duration-200 group-hover:rotate-12" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-background animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 rounded-lg bg-surface border border-border shadow-xl z-50 overflow-hidden transform origin-top-right transition-all duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2/30">
            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-surface-2 flex items-center justify-center text-muted-foreground mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-1">No new notifications here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`flex gap-3 p-4 hover:bg-surface-2/45 transition-colors cursor-pointer text-left ${
                    !n.is_read ? "bg-primary/5 border-l-2 border-primary" : ""
                  }`}
                >
                  <div className="shrink-0">
                    {n.actor ? (
                      <div className="relative">
                        {n.actor.avatar_url ? (
                          <img
                            src={n.actor.avatar_url}
                            alt={n.actor.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center text-xs font-semibold">
                            {n.actor.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div className="absolute -bottom-1 -right-1">
                          {getNotificationIcon(n.type)}
                        </div>
                      </div>
                    ) : (
                      getNotificationIcon(n.type)
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">
                      <span className="font-medium">
                        {n.actor ? n.actor.name : "Someone"}
                      </span>{" "}
                      {n.title.replace(/^[^\s]+\s+/, "")}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                        "{n.body}"
                      </p>
                    )}
                    <span className="text-[10px] text-muted-foreground mt-1.5 block">
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border p-2 bg-surface-2/15 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground inline-block py-1 px-4 rounded-md hover:bg-surface-2 transition-all"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
