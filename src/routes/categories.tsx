import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { ArrowUpRight, Sparkles } from "lucide-react";

const supabase = supabaseClient as any;

const CATEGORY_THEMES: Record<string, { gradient: string; text: string }> = {
  founders: {
    gradient: "from-amber-500 to-orange-600",
    text: "text-amber-700 dark:text-amber-400"
  },
  startups: {
    gradient: "from-indigo-500 to-purple-600",
    text: "text-indigo-700 dark:text-indigo-400"
  },
  ai: {
    gradient: "from-cyan-500 to-blue-600",
    text: "text-cyan-700 dark:text-cyan-400"
  },
  development: {
    gradient: "from-emerald-500 to-teal-600",
    text: "text-emerald-700 dark:text-emerald-400"
  },
  marketing: {
    gradient: "from-rose-500 to-pink-600",
    text: "text-rose-700 dark:text-rose-400"
  },
  sales: {
    gradient: "from-red-500 to-orange-600",
    text: "text-red-700 dark:text-red-400"
  },
  product: {
    gradient: "from-violet-500 to-fuchsia-600",
    text: "text-violet-700 dark:text-violet-400"
  },
  funding: {
    gradient: "from-amber-400 to-yellow-500",
    text: "text-yellow-700 dark:text-yellow-400"
  },
  "remote-work": {
    gradient: "from-sky-400 to-blue-500",
    text: "text-sky-700 dark:text-sky-400"
  },
  hiring: {
    gradient: "from-teal-400 to-emerald-500",
    text: "text-teal-700 dark:text-teal-400"
  },
};

const defaultTheme = {
  gradient: "from-muted-foreground/35 to-muted-foreground/60",
  text: "text-foreground"
};

export const Route = createFileRoute("/categories")({
  head: () => {
    const title = "Categories · Yesp Leaders";
    const desc = "Discover topics, discussions, and startup insights shared by builders and creators on Yesp Leaders.";
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
        { property: "og:url", content: "https://yespleaders.com/categories" },
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
      links: [{ rel: "canonical", href: "https://yespleaders.com/categories" }],
    };
  },
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data } = useQuery({
    queryKey: ["categories-all"],
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
    <div className="container-wide py-12 relative">
      {/* Background soft ambient orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mb-12 relative z-10">
        <div className="flex items-center gap-2 mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Knowledge Hubs</span>
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-3 tracking-tight">Browse by topic</h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Discover startup tutorials, creator strategies, engineering teardowns, and growth lessons shared by verified founders, creators, and AI builders.
        </p>
      </div>
      
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 relative z-10">
        {data?.map((c) => {
          const theme = CATEGORY_THEMES[c.slug] || defaultTheme;
          return (
            <Link
              key={c.slug}
              to="/c/$slug"
              params={{ slug: c.slug }}
              className="group relative overflow-hidden p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-md hover:border-primary/20 shadow-sm transition-all duration-300 scale-100 hover:scale-[1.03] hover:shadow-xl flex flex-col justify-between min-h-[140px]"
            >
              {/* Top border colored accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient} opacity-85 group-hover:opacity-100 transition-opacity`} />
              
              {/* Backglow accent */}
              <div className={`absolute -bottom-16 -right-16 w-32 h-32 bg-gradient-to-br ${theme.gradient} opacity-5 group-hover:opacity-10 blur-2xl rounded-full transition-all duration-300 pointer-events-none`} />

              <div className="flex flex-col">
                <span className={`font-serif text-xl font-bold tracking-tight ${theme.text}`}>
                  {c.name}
                </span>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                <span>Explore posts</span>
                <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
