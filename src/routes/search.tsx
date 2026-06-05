import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type PostCardData } from "@/components/PostCard";

const searchSchema = z.object({ q: z.string().optional() });

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => {
    const title = "Search · Yesp Leaders";
    const desc = "Search startup insights, AI trends, and founding lessons shared by verified builders on Yesp Leaders.";
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

  const { data: posts, isLoading } = useQuery({
    queryKey: ["search", q],
    enabled: q.trim().length > 0,
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
          placeholder="Search posts, titles, content…"
          className="w-full px-4 py-3 rounded-md bg-surface border border-border focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary text-sm transition-all"
        />
      </form>
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
      {!isLoading && posts?.map((p) => <PostCard key={p.id} post={p} />)}
      {!isLoading && posts && posts.length === 0 && q && (
        <p className="py-12 text-sm text-muted-foreground text-center">
          No results found for "{q}". Try searching for something else.
        </p>
      )}
    </div>
  );
}
