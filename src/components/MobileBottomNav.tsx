import { Link, useMatches } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Home, Search, PenSquare, User as UserIcon, Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getNotifications } from "@/lib/posts.functions";

/**
 * X (Twitter)-style bottom tab navigation bar — visible only on mobile.
 * Provides quick access to Home, Search, Write, Notifications, and Profile.
 */
export function MobileBottomNav() {
  const { user, profile } = useAuth();
  const matches = useMatches();
  const currentPath = String(matches[matches.length - 1]?.fullPath || "/");

  const isHome = currentPath === "/" || currentPath === "";
  const isSearch = currentPath.startsWith("/search");
  const isCreate = currentPath.startsWith("/create");
  const isNotifications = currentPath.startsWith("/notifications");
  const isProfile = currentPath.startsWith("/leader/");

  const getNotificationsFn = useServerFn(getNotifications);

  // Share notifications query cache for badge
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await getNotificationsFn();
      return res ?? [];
    },
  });
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-stretch justify-around h-12">
        <NavTab to="/" active={isHome} icon={<Home className="w-[22px] h-[22px]" strokeWidth={isHome ? 2.5 : 1.5} />} label="Home" />
        <NavTab to="/search" search={{ q: "" }} active={isSearch} icon={<Search className="w-[22px] h-[22px]" strokeWidth={isSearch ? 2.5 : 1.5} />} label="Search" />
        <NavTab to={user ? "/create" : "/auth"} active={isCreate} icon={<PenSquare className="w-[22px] h-[22px]" strokeWidth={isCreate ? 2.5 : 1.5} />} label="Write" />
        <NavTab
          to={user ? "/notifications" : "/auth"}
          active={isNotifications}
          icon={
            <div className="relative">
              <Bell className="w-[22px] h-[22px]" strokeWidth={isNotifications ? 2.5 : 1.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white ring-1 ring-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
          }
          label="Notifications"
        />
        <NavTab
          to={user && profile ? `/leader/${profile.username}` : "/auth"}
          active={isProfile}
          icon={
            user && profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className={`w-6 h-6 rounded-full object-cover ${isProfile ? "ring-2 ring-foreground" : ""}`}
              />
            ) : (
              <UserIcon className="w-[22px] h-[22px]" strokeWidth={isProfile ? 2.5 : 1.5} />
            )
          }
          label="Profile"
        />
      </div>
    </nav>
  );
}

function NavTab({
  to,
  search,
  active,
  icon,
  label,
}: {
  to: string;
  search?: Record<string, unknown>;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to as never}
      search={search as never}
      className={
        "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors " +
        (active ? "text-foreground" : "text-muted-foreground")
      }
      aria-label={label}
    >
      {icon}
    </Link>
  );
}
