import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { PostCard, type PostCardData } from "@/components/PostCard";
import { Flame, Clock } from "lucide-react";

const searchSchema = z.object({
  sort: z.enum(["trending", "latest"]).optional(),
});

const POST_FIELDS = "id, slug, title, content, image_urls, tags, ai_summary, upvote_count, comment_count, created_at, profiles!inner(username, name, profession, avatar_url, is_verified), categories(name, slug)";

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { sort } }) => ({ sort }),
  loader: async ({ context: { queryClient }, deps: { sort = "trending" } }) => {
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["posts", "feed", sort],
        queryFn: async () => {
          const q = supabase.from("posts").select(POST_FIELDS).eq("hidden", false).limit(30);
          const ordered = sort === "latest"
            ? q.order("created_at", { ascending: false })
            : q.order("upvote_count", { ascending: false }).order("created_at", { ascending: false });
          const { data, error } = await ordered;
          if (error) throw error;
          return data as unknown as PostCardData[];
        },
      }),
      queryClient.ensureQueryData({
        queryKey: ["categories"],
        queryFn: async () => {
          const { data } = await supabase
            .from("categories_by_usage" as any)
            .select("name, slug, post_count")
            .order("post_count", { ascending: false })
            .order("name", { ascending: true });
          return (data ?? []) as any[];
        },
      }),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Yesp Leaders — Knowledge from founders, devs & builders" },
      { name: "title", content: "Yesp Leaders — Knowledge from founders, devs & builders" },
      { property: "og:title", content: "Yesp Leaders — Knowledge from founders, devs & builders" },
      { name: "twitter:title", content: "Yesp Leaders — Knowledge from founders, devs & builders" },
      { name: "description", content: "The public community where startup builders share what's working. Trending posts on AI, founding, growth, and engineering." },
      { property: "og:description", content: "The public community where startup builders share what's working. Trending posts on AI, founding, growth, and engineering." },
      { name: "twitter:description", content: "The public community where startup builders share what's working. Trending posts on AI, founding, growth, and engineering." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://yespleaders.com/" },
      { property: "og:image", content: "https://yespleaders.com/logo.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://yespleaders.com/logo.svg" },
      { name: "geo.region", content: "US-CA" },
      { name: "geo.placename", content: "San Francisco" },
      { name: "geo.position", content: "37.7749;-122.4194" },
      { name: "ICBM", content: "37.7749, -122.4194" },
    ],
    links: [
      { rel: "canonical", href: "https://yespleaders.com/" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { sort = "trending" } = Route.useSearch();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", "feed", sort],
    queryFn: async () => {
      const q = supabase.from("posts").select(POST_FIELDS).eq("hidden", false).limit(30);
      const ordered = sort === "latest"
        ? q.order("created_at", { ascending: false })
        : q.order("upvote_count", { ascending: false }).order("created_at", { ascending: false });
      const { data, error } = await ordered;
      if (error) throw error;
      return data as unknown as PostCardData[];
    },
  });

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories_by_usage" as any)
        .select("name, slug, post_count")
        .order("post_count", { ascending: false })
        .order("name", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="container-narrow py-6">
      {/* Categories scroll */}
      <div className="-mx-4 px-4 mb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Link
            to="/"
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-foreground text-background"
          >
            All
          </Link>
          {cats?.map((c) => (
            <Link
              key={c.slug}
              to="/c/$slug"
              params={{ slug: c.slug }}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface border border-border hover:border-primary hover:text-primary"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1 mb-2 text-sm">
          <SortLink to="/" search={{ sort: "trending" }} active={sort === "trending"} icon={<Flame className="w-3.5 h-3.5" />}>
            Trending
          </SortLink>
          <SortLink to="/" search={{ sort: "latest" }} active={sort === "latest"} icon={<Clock className="w-3.5 h-3.5" />}>
            Latest
          </SortLink>
        </div>

        {isLoading && (
          <div className="divide-y divide-border">
            <PostCardSkeleton />
            <PostCardSkeleton />
            <PostCardSkeleton />
          </div>
        )}
        {!isLoading && posts && posts.length === 0 && (
          <EmptyState />
        )}
        {posts?.map((p, i) => (
          <PostCard key={p.id} post={p} rank={sort === "trending" ? i + 1 : undefined} />
        ))}
      </div>
    </div>
  );
}

function SortLink({ to, search, active, children, icon }: { to: string; search: Record<string, unknown>; active: boolean; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Link
      to={to as never}
      search={search as never}
      className={
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors " +
        (active ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-surface")
      }
    >
      {icon}
      {children}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-border rounded-lg py-16 text-center">
      <h2 className="font-serif text-2xl font-semibold">No posts yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">Be the first leader to share a lesson.</p>
      <Link to="/create" className="mt-5 inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">
        Write the first post
      </Link>
    </div>
  );
}

function PostCardSkeleton() {
  return (
    <div className="py-5 flex gap-4 animate-pulse">
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-16 h-4 rounded bg-muted/60" />
          <div className="w-20 h-4 rounded bg-muted/60" />
          <div className="w-12 h-4 rounded bg-muted/60" />
        </div>
        <div className="w-3/4 h-6 rounded bg-muted/70" />
        <div className="w-full h-4 rounded bg-muted/50" />
        <div className="w-2/3 h-4 rounded bg-muted/50" />
        <div className="flex gap-4 pt-1">
          <div className="w-10 h-3 rounded bg-muted/40" />
          <div className="w-10 h-3 rounded bg-muted/40" />
        </div>
      </div>
      <div className="hidden sm:block w-28 h-28 rounded-md bg-muted/40 shrink-0" />
    </div>
  );
}
