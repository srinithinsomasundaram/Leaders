import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
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
  ArrowLeft,
  User,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => {
    const title = "Notifications · Yesp Leaders";
    const desc = "View your recent upvotes, comments, mentions, and updates on Yesp Leaders.";
    return {
      meta: [
        { title },
        { name: "title", content: title },
        { property: "og:title", content: title },
        { name: "twitter:title", content: title },
        { name: "description", content: desc },
        { property: "og:description", content: desc },
        { name: "twitter:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://yespleaders.com/notifications" },
        { property: "og:image", content: "https://yespleaders.com/logo.svg" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://yespleaders.com/logo.svg" },
        { property: "og:site_name", content: "Yesp Leaders" },

        // Geographical Meta Tags
        { name: "geo.region", content: "US-CA" },
        { name: "geo.placename", content: "San Francisco" },
        { name: "geo.position", content: "37.7749;-122.4194" },
        { name: "ICBM", content: "37.7749, -122.4194" },
      ],
      links: [{ rel: "canonical", href: "https://yespleaders.com/notifications" }],
    };
  },
  component: NotificationsPage,
});

interface ProfileData {
  name: string;
  username: string;
  avatar_url: string | null;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  actor_id: string | null;
  post_id: string | null;
  created_at: string;
  actor: ProfileData | null;
}

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const getNotificationsFn = useServerFn(getNotifications);
  const markAllReadFn = useServerFn(markNotificationsRead);
  const markOneReadFn = useServerFn(markNotificationRead);

  // Fetch notifications
  const { data: notifications = [], refetch } = useQuery<NotificationRow[]>({
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

    const channelId = `notifications-page-${user.id}-${Math.random().toString(36).substring(2, 9)}`;
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

  // Group notifications by date
  const groupNotifications = (list: NotificationRow[]) => {
    const today: NotificationRow[] = [];
    const yesterday: NotificationRow[] = [];
    const earlier: NotificationRow[] = [];

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    for (const n of list) {
      const time = new Date(n.created_at).getTime();
      if (time >= startOfToday) {
        today.push(n);
      } else if (time >= startOfYesterday) {
        yesterday.push(n);
      } else {
        earlier.push(n);
      }
    }

    return { today, yesterday, earlier };
  };

  const { today, yesterday, earlier } = groupNotifications(notifications);

  const renderSection = (title: string, list: NotificationRow[]) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">
          {title}
        </h2>
        <div className="rounded-lg bg-surface border border-border divide-y divide-border overflow-hidden shadow-sm">
          {list.map((n) => (
            <div
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`flex gap-3.5 p-4 hover:bg-surface-2/30 transition-colors cursor-pointer text-left ${
                !n.is_read ? "bg-primary/[0.03] border-l-2 border-primary" : ""
              }`}
            >
              <div className="shrink-0">
                {n.actor ? (
                  <div className="relative">
                    {n.actor.avatar_url ? (
                      <img
                        src={n.actor.avatar_url}
                        alt={n.actor.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center text-sm font-semibold">
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
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3 italic">
                    "{n.body}"
                  </p>
                )}
                <span className="text-[10px] text-muted-foreground mt-1.5 block">
                  {formatTime(n.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container-narrow py-6 px-4 md:py-8 mb-16 md:mb-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="p-1.5 rounded-md hover:bg-surface border border-border text-muted-foreground hover:text-foreground md:hidden"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-xs text-primary font-medium mt-0.5">
                {unreadCount} unread {unreadCount === 1 ? "notification" : "notifications"}
              </p>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border hover:bg-surface-2 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-sm"
          >
            <Check className="w-3.5 h-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface border border-border rounded-lg text-center p-6 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center text-muted-foreground mb-4">
            <Bell className="w-7 h-7" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            You're all caught up!
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            When leaders interact with your posts or verify your requests, they'll show up here.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-md bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Explore Posts
          </Link>
        </div>
      ) : (
        <>
          {renderSection("Today", today)}
          {renderSection("Yesterday", yesterday)}
          {renderSection("Earlier", earlier)}
        </>
      )}
    </div>
  );
}
