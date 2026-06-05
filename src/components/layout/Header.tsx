import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, PenSquare, LogOut, User as UserIcon, Menu } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface SearchSuggestion {
  id: string;
  title: string;
  slug: string;
  profiles: {
    name: string;
  } | null;
}

export function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLFormElement>(null);

  const debouncedQ = useDebounce(q, 250);
  const isSearchPage = location.pathname.startsWith("/search");
  const shouldShowDropdown = showSuggestions && q.trim().length > 1 && !isSearchPage;

  const { data: suggestions = [], isFetching } = useQuery<SearchSuggestion[]>({
    queryKey: ["search-suggestions", debouncedQ],
    enabled: debouncedQ.trim().length > 1 && !isSearchPage,
    queryFn: async () => {
      const term = `%${debouncedQ}%`;
      const { data } = await supabase
        .from("posts")
        .select("id, title, slug, profiles(name)")
        .or(`title.ilike.${term},content.ilike.${term}`)
        .eq("hidden", false)
        .order("upvote_count", { ascending: false })
        .limit(5);
      return (data ?? []) as any;
    },
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    },
  });

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    setShowSuggestions(false);
    navigate({ to: "/search", search: { q: v } });
  };

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-background/85 border-b border-border">
      <div className="container-wide flex items-center justify-between md:justify-start gap-4 h-14 relative">
        {/* Mobile Left Avatar */}
        <div className="md:hidden flex items-center">
          {user && profile ? (
            <Link to="/leader/$username" params={{ username: profile.username }} className="hover:opacity-90">
              <Avatar name={profile.name} url={profile.avatar_url} />
            </Link>
          ) : (
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">
              <UserIcon className="w-5.5 h-5.5" />
            </Link>
          )}
        </div>

        {/* Desktop Logo Link */}
        <Link to="/" className="hidden md:flex items-center gap-2 shrink-0">
          <svg viewBox="0 0 140 140" className="w-7 h-7 flex-shrink-0 rounded-[6px]" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="140" height="140" rx="28" fill="#111111" />
            <polygon points="70,28 22,124 118,124" fill="#FFFFFF" />
            <polygon points="70,50 42,124 98,124" fill="#111111" />
          </svg>
          <span className="font-serif text-lg font-semibold tracking-tight">Yesp Leaders</span>
        </Link>

        {/* Mobile Centered Logo */}
        <div className="flex md:hidden absolute left-1/2 -translate-x-1/2">
          <Link to="/" className="flex items-center">
            <svg viewBox="0 0 140 140" className="w-7 h-7 rounded-[6px]" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="140" height="140" rx="28" fill="#111111" />
              <polygon points="70,28 22,124 118,124" fill="#FFFFFF" />
              <polygon points="70,50 42,124 98,124" fill="#111111" />
            </svg>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/" search={{ sort: "trending" }}>Trending</NavLink>
          <NavLink to="/" search={{ sort: "latest" }}>Latest</NavLink>
          <NavLink to="/categories">Categories</NavLink>
          {isAdmin && <NavLink to="/admin/verifications">Verifications</NavLink>}
        </nav>

        {/* Desktop Search Form */}
        <form ref={searchRef} onSubmit={onSearch} className="hidden md:flex flex-1 max-w-sm ml-auto relative">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search posts, leaders, tags…"
              className="w-full pl-9 pr-3 py-1.5 rounded-md bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary transition-all"
            />
          </div>

          {shouldShowDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-lg bg-surface border border-border shadow-xl z-50 overflow-hidden transform origin-top transition-all duration-200 divide-y divide-border">
              {isFetching && suggestions.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground animate-pulse flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Searching matching posts...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  No matching posts found.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {suggestions.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => {
                        navigate({ to: `/post/${post.slug}` as any });
                        setQ("");
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors text-sm flex flex-col cursor-pointer"
                    >
                      <span className="font-medium text-foreground line-clamp-1">{post.title}</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">
                        by {(post.profiles as any)?.name || "Someone"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div className="p-2 bg-surface-2/30 text-[10px] text-center text-muted-foreground select-none font-medium">
                Press Enter to view all results
              </div>
            </div>
          )}
        </form>

        {/* Desktop Right Actions */}
        <div className="hidden md:flex items-center gap-2 ml-auto">
          {user ? (
            <>
              <NotificationBell />
              <Link
                to="/create"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 animate-fade-in"
              >
                <PenSquare className="w-4 h-4" /> Write
              </Link>
              {profile && (
                <Link
                  to="/leader/$username"
                  params={{ username: profile.username }}
                  className="inline-flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Avatar name={profile.name} url={profile.avatar_url} />
                </Link>
              )}
              <button
                onClick={() => signOut()}
                className="p-1.5 rounded-md hover:bg-surface-2 text-muted-foreground"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-sm font-medium hover:opacity-90"
            >
              <UserIcon className="w-4 h-4" /> Sign in
            </Link>
          )}
        </div>

        {/* Mobile Right Search & Notifications */}
        <div className="md:hidden ml-auto flex items-center gap-1">
          <Link to="/search" className="p-2 text-muted-foreground hover:text-foreground" aria-label="Search">
            <Search className="w-5.5 h-5.5" />
          </Link>
          {user && <NotificationBell />}
        </div>
      </div>
    </header>
  );
}

function NavLink(props: { to: string; search?: Record<string, unknown>; children: ReactNodeLike }) {
  return (
    <Link
      to={props.to as never}
      search={props.search as never}
      className="px-3 py-1.5 rounded-md hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors"
      activeProps={{ className: "px-3 py-1.5 rounded-md bg-surface-2 text-foreground" }}
      activeOptions={{ exact: true, includeSearch: false }}
    >
      {props.children}
    </Link>
  );
}

type ReactNodeLike = React.ReactNode;

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) return <img src={url} alt={name} className="w-7 h-7 rounded-full object-cover" />;
  const init = name.slice(0, 1).toUpperCase();
  return (
    <span className="w-7 h-7 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center text-xs font-semibold">
      {init}
    </span>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}
