import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type PostCardData } from "@/components/PostCard";
import { FileText, Users } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => {
    const title = "Search · Yesp Leaders";
    const desc = "Search startup insights, creator strategies, AI trends, and founding lessons shared by verified builders on Yesp Leaders.";
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
        { property: "og:url", content: "https://yespleaders.com/search" },
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
      links: [{ rel: "canonical", href: "https://yespleaders.com/search" }],
    };
  },
  component: SearchPage,
});

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function PostCardSkeleton() {
  return (
    <div className="p-5 rounded-lg border border-border bg-card shadow-sm mb-4 animate-pulse">
      {/* User Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-surface-2 rounded w-1/4" />
          <div className="h-3 bg-surface-2 rounded w-1/6" />
        </div>
      </div>
      {/* Title */}
      <div className="h-5.5 bg-surface-2 rounded w-3/4 mb-3" />
      {/* Body preview */}
      <div className="space-y-2 mb-4">
        <div className="h-3.5 bg-surface-2 rounded w-full" />
        <div className="h-3.5 bg-surface-2 rounded w-5/6" />
      </div>
      {/* Footer details */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40">
        <div className="flex gap-4">
          <div className="w-10 h-4 bg-surface-2 rounded" />
          <div className="w-10 h-4 bg-surface-2 rounded" />
        </div>
        <div className="w-16 h-4 bg-surface-2 rounded" />
      </div>
    </div>
  );
}

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(q);
  const [activeTab, setActiveTab] = useState<"posts" | "users">("posts");
  const debouncedInput = useDebounce(input, 300);

  // Sync router parameter on typing (debounced)
  useEffect(() => {
    const trimmed = debouncedInput.trim();
    navigate({
      to: "/search",
      search: { q: trimmed || undefined },
      replace: true, // does not pollute browser back-history stack
    });
  }, [debouncedInput, navigate]);

  // Sync local input state if route param changes externally (e.g. from header search or back/forward navigation)
  useEffect(() => {
    setInput(q);
  }, [q]);

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ["search", "posts", q],
    enabled: q.trim().length > 0 && activeTab === "posts",
    queryFn: async () => {
      const term = `%${q}%`;
      const { data } = await supabase
        .from("posts")
        .select("id, slug, title, content, image_urls, tags, ai_summary, upvote_count, comment_count, created_at, profiles!inner(username, name, profession, avatar_url, is_verified), categories(name, slug)")
        .or(`title.ilike.${term},content.ilike.${term}`)
        .eq("hidden", false)
        .order("upvote_count", { ascending: false })
        .limit(40);
      return (data ?? []) as unknown as PostCardData[];
    },
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["search", "users", q],
    enabled: q.trim().length > 0 && activeTab === "users",
    queryFn: async () => {
      const term = `%${q}%`;
      const { data } = await supabase
        .from("profiles")
        .select("id, username, name, profession, avatar_url, is_verified, created_at")
        .or(`name.ilike.${term},username.ilike.${term},profession.ilike.${term}`)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as any[];
    },
  });

  const isLoading = activeTab === "posts" ? postsLoading : usersLoading;

  return (
    <div className="container-narrow py-6 md:py-8">
      <h1 className="font-serif text-2xl md:text-3xl font-bold mb-4">Search</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ to: "/search", search: { q: input.trim() || undefined } });
        }}
        className="mb-6"
      >
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search posts, users, topics…"
          className="w-full px-4 py-3 rounded-md bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary text-sm transition-all"
        />
      </form>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 text-sm border-b border-border">
        <button
          onClick={() => setActiveTab("posts")}
          className={
            "inline-flex items-center gap-1.5 px-4 py-2 font-medium transition-colors border-b-2 -mb-px " +
            (activeTab === "posts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          <FileText className="w-4 h-4" />
          Posts
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={
            "inline-flex items-center gap-1.5 px-4 py-2 font-medium transition-colors border-b-2 -mb-px " +
            (activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground")
          }
        >
          <Users className="w-4 h-4" />
          Users
        </button>
      </div>

      {q && !isLoading && (
        <p className="text-xs text-muted-foreground mb-4">
          Results for "{q}"
        </p>
      )}

      {isLoading && (
        <div className="space-y-4">
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {/* Posts results */}
      {!isLoading && activeTab === "posts" && posts?.map((p) => <PostCard key={p.id} post={p} />)}
      {!isLoading && activeTab === "posts" && posts && posts.length === 0 && q && (
        <p className="py-12 text-sm text-muted-foreground text-center">
          No posts found for "{q}". Try searching for something else.
        </p>
      )}

      {/* Users results */}
      {!isLoading && activeTab === "users" && (
        <div className="space-y-3">
          {users?.map((user) => (
            <Link
              key={user.id}
              to="/leader/$username"
              params={{ username: user.username }}
              className="block p-4 rounded-lg border border-border bg-card hover:bg-surface-2 transition-colors"
            >
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-12 h-12 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center text-lg font-semibold">
                    {user.name[0].toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{user.name}</p>
                    {user.is_verified && <VerifiedBadge size={14} />}
                  </div>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                  {user.profession && (
                    <p className="text-xs text-muted-foreground mt-0.5">{user.profession}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {!isLoading && activeTab === "users" && users && users.length === 0 && q && (
        <p className="py-12 text-sm text-muted-foreground text-center">
          No users found for "{q}". Try searching for something else.
        </p>
      )}
    </div>
  );
}
