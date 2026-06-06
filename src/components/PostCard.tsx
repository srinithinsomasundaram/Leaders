import { Link, useRouter } from "@tanstack/react-router";
import { MessageSquare, ArrowBigUp } from "lucide-react";
import { formatRelativeTime } from "@/lib/slug";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SharePostDialog } from "@/components/SharePostDialog";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { toggleVote } from "@/lib/posts.functions";
import { playUpvoteSound } from "@/lib/audio";
import { toast } from "sonner";

const supabase = supabaseClient as any;

export type PostCardData = {
  id: string;
  slug: string;
  title: string;
  content: string;
  image_urls: string[];
  tags: string[];
  ai_summary: string | null;
  upvote_count: number;
  comment_count: number;
  created_at: string;
  profiles: { username: string; name: string; profession: string | null; avatar_url: string | null; is_verified?: boolean; verification_tier?: "creator" | "leader" | "elite" | null } | null;
  categories: { name: string; slug: string } | null;
};

export function PostCard({ post, rank }: { post: PostCardData; rank?: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const voteFn = useServerFn(toggleVote);
  const [animating, setAnimating] = useState(false);

  const { data: hasVoted } = useQuery({
    queryKey: ["post-vote", post.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("votes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  async function handleVote(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.info("Please login to upvote");
      return;
    }

    setAnimating(true);
    playUpvoteSound();
    setTimeout(() => setAnimating(false), 300);

    try {
      await voteFn({ data: { post_id: post.id } });
      qc.invalidateQueries({ queryKey: ["post-vote", post.id] });
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
    }
  }

  const preview = post.ai_summary || post.content.replace(/[#*_>`]/g, "").slice(0, 220);
  return (
    <article className="group relative flex gap-4 py-5 border-b border-border last:border-b-0">
      {rank !== undefined && (
        <div className="hidden sm:block text-2xl font-serif text-muted-foreground/60 w-8 text-right tabular-nums">
          {rank}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
          {post.categories && (
            <Link
              to="/c/$slug"
              params={{ slug: post.categories.slug }}
              className="px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {post.categories.name}
            </Link>
          )}
          {post.profiles && (
            <>
              <Link to="/leader/$username" params={{ username: post.profiles.username }} className="hover:text-foreground font-medium inline-flex items-center gap-1">
                {post.profiles.name}
                {post.profiles.is_verified && <VerifiedBadge size={13} tier={post.profiles.verification_tier || "leader"} />}
              </Link>
              {post.profiles.profession && <span className="text-muted-foreground/70">· {post.profiles.profession}</span>}
            </>
          )}
          <span>· {formatRelativeTime(post.created_at)}</span>
        </div>

        <Link to="/post/$slug" params={{ slug: post.slug }} className="block">
          <h2 className="font-serif text-xl sm:text-2xl font-semibold tracking-tight leading-snug group-hover:text-primary transition-colors">
            {post.title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{preview}</p>
        </Link>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <button
              onClick={handleVote}
              className={`inline-flex items-center gap-1 hover:text-primary transition-all duration-200 cursor-pointer ${
                hasVoted ? "text-primary font-semibold" : ""
              } ${animating ? "scale-125 rotate-[-8deg]" : "hover:scale-105 active:scale-95"}`}
              title="Upvote post"
            >
              <ArrowBigUp className={`w-4 h-4 ${hasVoted ? "fill-primary" : ""}`} />
              <span className="tabular-nums">{post.upvote_count}</span>
            </button>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" /> {post.comment_count}
            </span>
            {post.tags?.slice(0, 3).map((t) => (
              <span key={t} className="font-mono text-[11px] text-muted-foreground/70">#{t}</span>
            ))}
          </div>
          <SharePostDialog post={post} />
        </div>
      </div>

      {post.image_urls?.[0] && (
        <Link to="/post/$slug" params={{ slug: post.slug }} className="hidden sm:block shrink-0">
          <img
            src={post.image_urls[0]}
            alt=""
            className="w-28 h-28 object-cover rounded-md border border-border"
            loading="lazy"
          />
        </Link>
      )}
    </article>
  );
}
