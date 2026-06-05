import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { PostCard, type PostCardData } from "@/components/PostCard";

export const Route = createFileRoute("/c/$slug")({
  loader: async ({ context: { queryClient }, params }) => {
    const { data } = await supabase.from("categories").select("id, name, slug").eq("slug", params.slug).maybeSingle();
    if (!data) throw notFound();

    // Prefetch category posts in loader
    await queryClient.ensureQueryData({
      queryKey: ["cat-posts", data.id],
      queryFn: async () => {
        const { data: posts } = await supabase
          .from("posts")
          .select("id, slug, title, content, image_urls, tags, ai_summary, upvote_count, comment_count, created_at, profiles!inner(username, name, profession, avatar_url, is_verified), categories(name, slug)")
          .eq("category_id", data.id)
          .eq("hidden", false)
          .order("upvote_count", { ascending: false });
        return (posts ?? []) as unknown as PostCardData[];
      },
    });

    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const title = `${loaderData.name} · Yesp Leaders`;
    const desc = `Top posts and lessons about ${loaderData.name} from founders, creators, and builders on Yesp Leaders.`;
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
        { property: "og:url", content: `https://yespleaders.com/c/${loaderData.slug}` },
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
      links: [{ rel: "canonical", href: `https://yespleaders.com/c/${loaderData.slug}` }],
    };
  },
  errorComponent: ({ error }) => <div className="container-narrow py-12">{error.message}</div>,
  notFoundComponent: () => <div className="container-narrow py-12">Category not found.</div>,
  component: CategoryPage,
});

function CategoryPage() {
  const cat = Route.useLoaderData() as any;
  const { data: posts } = useQuery({
    queryKey: ["cat-posts", cat.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, slug, title, content, image_urls, tags, ai_summary, upvote_count, comment_count, created_at, profiles!inner(username, name, profession, avatar_url, is_verified), categories(name, slug)")
        .eq("category_id", cat.id)
        .eq("hidden", false)
        .order("upvote_count", { ascending: false });
      return (data ?? []) as unknown as PostCardData[];
    },
  });

  return (
    <div className="container-narrow py-8">
      <h1 className="font-serif text-3xl font-bold">{cat.name}</h1>
      <p className="text-sm text-muted-foreground mb-6">Top posts in this topic</p>
      {posts?.map((p, i) => <PostCard key={p.id} post={p} rank={i + 1} />)}
      {posts && posts.length === 0 && <p className="py-12 text-center text-muted-foreground text-sm">No posts in this category yet.</p>}
    </div>
  );
}
