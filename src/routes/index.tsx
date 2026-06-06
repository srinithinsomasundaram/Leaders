import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { PostCard, type PostCardData } from "@/components/PostCard";
import { Flame, Compass } from "lucide-react";
import { getItemListSchema } from "@/lib/seo";
import { useAuth } from "@/hooks/use-auth";

const searchSchema = z.object({
  sort: z.enum(["explore", "trending"]).optional(),
});

const POST_FIELDS = "id, slug, title, content, image_urls, tags, ai_summary, upvote_count, comment_count, created_at, profiles!inner(username, name, profession, avatar_url, is_verified), categories(name, slug)";

async function fetchFeed(sort: "explore" | "trending", userId?: string) {
  try {
    let q = supabase.from("posts").select(POST_FIELDS).eq("hidden", false).limit(30);

    // For "explore" feed, show all posts sorted by recent
    if (sort === "explore") {
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) {
        console.error("[home] Failed to load explore feed:", error);
        return [];
      }
      return data as unknown as PostCardData[];
    }

    // For "trending" feed, show posts with highest engagement (upvotes + comments)
    if (sort === "trending") {
      // Fetch posts and sort by engagement on client side
      // Note: Supabase doesn't support ORDER BY computed columns directly
      const { data, error } = await q;
      if (error) {
        console.error("[home] Failed to load trending feed:", error);
        return [];
      }

      // Sort by engagement: upvotes + (comments * 2) for higher weight on discussion
      const sorted = (data as unknown as PostCardData[]).sort((a, b) => {
        const engagementA = (a.upvote_count || 0) + ((a.comment_count || 0) * 2);
        const engagementB = (b.upvote_count || 0) + ((b.comment_count || 0) * 2);
        return engagementB - engagementA;
      });

      return sorted.slice(0, 30);
    }

    return [];
  } catch (error) {
    console.error("[home] Feed request crashed:", error);
    return [];
  }
}

async function fetchCategories() {
  try {
    const { data, error } = await supabase
      .from("categories_by_usage" as any)
      .select("name, slug, post_count")
      .order("post_count", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("[home] Failed to load categories:", error);
      return [];
    }

    return (data ?? []) as any[];
  } catch (error) {
    console.error("[home] Category request crashed:", error);
    return [];
  }
}

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { sort } }) => ({ sort }),
  loader: async ({ context: { queryClient, supabase }, deps: { sort } }) => {
    // Get current user ID for connected feed (with error handling for SSR)
    let userId: string | undefined;
    try {
      if (supabase) {
        const { data: { user } } = await (supabase as any).auth.getUser();
        userId = user?.id;
      }
    } catch (error) {
      console.error("[home loader] Failed to get user:", error);
      userId = undefined;
    }

    // Default: Explore
    const actualSort = sort || "explore";

    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["posts", "feed", actualSort, userId],
        queryFn: () => fetchFeed(actualSort, userId),
      }),
      queryClient.ensureQueryData({
        queryKey: ["categories"],
        queryFn: fetchCategories,
      }),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Yesp Leaders — Knowledge from founders, devs, creators & builders" },
      { name: "title", content: "Yesp Leaders — Knowledge from founders, devs, creators & builders" },
      { property: "og:title", content: "Yesp Leaders — Knowledge from founders, devs, creators & builders" },
      { name: "twitter:title", content: "Yesp Leaders — Knowledge from founders, devs, creators & builders" },
      { name: "description", content: "The public community where startup builders and creators share what's working. Trending posts on AI, founding, growth, and engineering." },
      { property: "og:description", content: "The public community where startup builders and creators share what's working. Trending posts on AI, founding, growth, and engineering." },
      { name: "twitter:description", content: "The public community where startup builders and creators share what's working. Trending posts on AI, founding, growth, and engineering." },
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
  const { user } = useAuth();

  // Default: Explore
  const { sort = "explore" } = Route.useSearch();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", "feed", sort, user?.id],
    queryFn: () => fetchFeed(sort, user?.id),
  });

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // Enhanced structured data for homepage feed
  const feedName = sort === "trending" ? "Trending" : "Explore";
  const itemListSchema = posts && posts.length > 0 ? getItemListSchema({
    name: `${feedName} Posts`,
    url: "https://yespleaders.com/",
    description: `${feedName} posts from founders, developers, creators, and builders`,
    items: posts.slice(0, 10).map((post, index) => ({
      url: `https://yespleaders.com/post/${post.slug}`,
      name: post.title,
      position: index + 1,
    })),
  }) : null;

  return (
    <div className="container-narrow py-6">
      {itemListSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
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
        <div className="flex items-center gap-1 mb-2 text-sm flex-wrap">
          <SortLink to="/" search={{ sort: "explore" }} active={sort === "explore"} icon={<Compass className="w-3.5 h-3.5" />}>
            Explore
          </SortLink>
          <SortLink to="/" search={{ sort: "trending" }} active={sort === "trending"} icon={<Flame className="w-3.5 h-3.5" />}>
            Trending
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
