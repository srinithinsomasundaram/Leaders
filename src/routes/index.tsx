import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { PostCard, type PostCardData } from "@/components/PostCard";
import { Flame, Clock, Users } from "lucide-react";
import { getItemListSchema } from "@/lib/seo";
import { useAuth } from "@/hooks/use-auth";

const searchSchema = z.object({
  sort: z.enum(["trending", "latest", "connected"]).optional(),
});

const POST_FIELDS = "id, slug, title, content, image_urls, tags, ai_summary, upvote_count, comment_count, created_at, profiles!inner(username, name, profession, avatar_url, is_verified), categories(name, slug)";

async function fetchFeed(sort: "trending" | "latest" | "connected", userId?: string) {
  try {
    let q = supabase.from("posts").select(POST_FIELDS).eq("hidden", false).limit(30);

    // For "connected" feed, filter by user's connections
    if (sort === "connected" && userId) {
      // Get user's connections
      const { data: connections } = await supabase
        .from("connections")
        .select("requester_id, receiver_id")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq("status", "accepted");

      if (connections && connections.length > 0) {
        const connectedUserIds = connections.map((c: any) =>
          c.requester_id === userId ? c.receiver_id : c.requester_id
        );
        q = q.in("user_id", connectedUserIds);
      } else {
        // No connections, return empty
        return [];
      }
    }

    const ordered = sort === "latest"
      ? q.order("created_at", { ascending: false })
      : q.order("upvote_count", { ascending: false }).order("created_at", { ascending: false });
    const { data, error } = await ordered;
    if (error) {
      console.error("[home] Failed to load feed:", error);
      return [];
    }
    return data as unknown as PostCardData[];
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
  loader: async ({ context: { queryClient, supabase }, deps: { sort = "trending" } }) => {
    // Get current user ID for connected feed
    const { data: { user } } = await (supabase as any).auth.getUser();
    const userId = user?.id;

    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ["posts", "feed", sort, userId],
        queryFn: () => fetchFeed(sort, userId),
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
  const { sort = "trending" } = Route.useSearch();
  const { user } = useAuth();

  const { data: posts, isLoading } = useQuery({
    queryKey: ["posts", "feed", sort, user?.id],
    queryFn: () => fetchFeed(sort, user?.id),
  });

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // Enhanced structured data for homepage feed
  const itemListSchema = posts && posts.length > 0 ? getItemListSchema({
    name: sort === "trending" ? "Trending Posts" : "Latest Posts",
    url: "https://yespleaders.com/",
    description: `${sort === "trending" ? "Trending" : "Latest"} posts from founders, developers, creators, and builders`,
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
          <SortLink to="/" search={{ sort: "trending" }} active={sort === "trending"} icon={<Flame className="w-3.5 h-3.5" />}>
            Trending
          </SortLink>
          <SortLink to="/" search={{ sort: "latest" }} active={sort === "latest"} icon={<Clock className="w-3.5 h-3.5" />}>
            Latest
          </SortLink>
          {user && (
            <SortLink to="/" search={{ sort: "connected" }} active={sort === "connected"} icon={<Users className="w-3.5 h-3.5" />}>
              Connected
            </SortLink>
          )}
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
