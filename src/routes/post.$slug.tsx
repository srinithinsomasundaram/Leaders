import { createFileRoute, Link, notFound, useRouter, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { useAuth } from "@/hooks/use-auth";
import {
  toggleVote,
  addComment,
  deletePost,
  deleteComment,
  editComment,
  toggleCommentVote,
} from "@/lib/posts.functions";
import { formatRelativeTime } from "@/lib/slug";
import { ArrowBigUp, MessageSquare, Sparkles, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { MentionTextarea } from "@/components/MentionTextarea";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SharePostDialog } from "@/components/SharePostDialog";
import { playUpvoteSound } from "@/lib/audio";
import { getArticleSchema, getBreadcrumbSchema, combineSchemas } from "@/lib/seo";

export const Route = createFileRoute("/post/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("posts")
      .select(
        "id, slug, title, content, image_urls, tags, ai_summary, ai_keywords, ai_insights, seo_title, seo_description, upvote_count, comment_count, created_at, user_id, profiles!inner(username, name, profession, avatar_url, is_verified, verification_tier), categories(name, slug)"
      )
      .eq("slug", params.slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data as any;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [] };
    const title = loaderData.seo_title || loaderData.title;
    const fullTitle = `${title} · Yesp Leaders`;
    const desc =
      loaderData.seo_description ||
      loaderData.ai_summary ||
      loaderData.content.slice(0, 155);
    const img = loaderData.image_urls?.[0];
    const absoluteImg = img
      ? (img.startsWith("http") ? img : `https://yespleaders.com${img}`)
      : "https://yespleaders.com/logo.svg";

    const metaTags: Array<{ title?: string; name?: string; property?: string; content?: string }> = [
      { title: fullTitle },
      { name: "title", content: fullTitle },
      { property: "og:title", content: title },
      { name: "twitter:title", content: title },
      { name: "description", content: desc },
      { property: "og:description", content: desc },
      { name: "twitter:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `https://yespleaders.com/post/${loaderData.slug}` },
      { property: "og:image", content: absoluteImg },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: absoluteImg },
      { property: "og:site_name", content: "Yesp Leaders" },

      // Geographical Meta Tags
      { name: "geo.region", content: "US-CA" },
      { name: "geo.placename", content: "San Francisco" },
      { name: "geo.position", content: "37.7749;-122.4194" },
      { name: "ICBM", content: "37.7749, -122.4194" },
    ];

    if (loaderData.created_at) {
      metaTags.push({ property: "article:published_time", content: loaderData.created_at });
    }
    if (loaderData.profiles?.name) {
      metaTags.push({ property: "article:author", content: loaderData.profiles.name });
    }
    if (loaderData.categories?.name) {
      metaTags.push({ property: "article:section", content: loaderData.categories.name });
    }

    const tags = loaderData.tags || [];
    tags.forEach((tag: string) => {
      metaTags.push({ property: "article:tag", content: tag });
    });

    const aiKeywords = loaderData.ai_keywords || [];
    aiKeywords.forEach((kw: string) => {
      if (!tags.includes(kw)) {
        metaTags.push({ property: "article:tag", content: kw });
      }
    });

    return {
      meta: metaTags,
      links: [{ rel: "canonical", href: `https://yespleaders.com/post/${loaderData.slug}` }],
    };
  },
  errorComponent: ({ error }) => <div className="container-narrow py-12">Failed to load: {error.message}</div>,
  notFoundComponent: () => <div className="container-narrow py-12">Post not found.</div>,
  component: PostPage,
});

function PostPage() {
  const post = Route.useLoaderData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();

  const voteFn = useServerFn(toggleVote);
  const commentFn = useServerFn(addComment);
  const deletePostFn = useServerFn(deletePost);
  const deleteCommentFn = useServerFn(deleteComment);
  const editCommentFn = useServerFn(editComment);
  const voteCommentFn = useServerFn(toggleCommentVote);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [animating, setAnimating] = useState(false);

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

  const isDeletable = user && (user.id === post.user_id || isAdmin);

  const { data: myVote } = useQuery({
    queryKey: ["my-vote", post.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("id").eq("post_id", post.id).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const { data: myCommentVotes } = useQuery({
    queryKey: ["my-comment-votes", post.id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("comment_votes")
        .select("comment_id")
        .eq("user_id", user!.id);
      return new Set(data?.map((d: any) => d.comment_id) ?? []);
    },
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, content, created_at, user_id, parent_id, upvote_count, profiles!inner(username, name, profession, avatar_url, is_verified, verification_tier)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  async function onDeletePost() {
    if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) return;
    try {
      await deletePostFn({ data: { post_id: post.id } });
      toast.success("Post deleted successfully");
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete post");
    }
  }

  async function onVote() {
    if (!user) {
      toast.info("Please login to upvote");
      return;
    }
    setAnimating(true);
    playUpvoteSound();
    setTimeout(() => setAnimating(false), 300);
    try {
      await voteFn({ data: { post_id: post.id } });
      qc.invalidateQueries({ queryKey: ["my-vote", post.id] });
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Vote failed");
    }
  }

  async function onComment(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.info("Sign in to comment");
      return;
    }
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await commentFn({ data: { post_id: post.id, content: commentText.trim() } });
      setCommentText("");
      await refetchComments();
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPosting(false);
    }
  }

  function startEdit(commentId: string, currentContent: string) {
    setEditingCommentId(commentId);
    setEditingText(currentContent);
  }

  async function onSaveEdit(commentId: string) {
    if (!editingText.trim()) return;
    try {
      await editCommentFn({ data: { comment_id: commentId, content: editingText.trim() } });
      setEditingCommentId(null);
      setEditingText("");
      await refetchComments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to edit comment");
    }
  }

  async function onDeleteComment(commentId: string) {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteCommentFn({ data: { comment_id: commentId } });
      await refetchComments();
      await router.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete comment");
    }
  }

  async function onCommentVote(commentId: string) {
    if (!user) {
      toast.info("Please login to upvote comments");
      return;
    }
    playUpvoteSound();
    try {
      await voteCommentFn({ data: { comment_id: commentId } });
      qc.invalidateQueries({ queryKey: ["my-comment-votes", post.id] });
      await refetchComments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to vote");
    }
  }

  // Enhanced structured data with Article, Breadcrumb, and more
  const articleSchema = getArticleSchema({
    slug: post.slug,
    title: post.title,
    description: post.seo_description || post.ai_summary,
    content: post.content,
    authorName: post.profiles?.name || "Unknown",
    authorUsername: post.profiles?.username || "unknown",
    datePublished: post.created_at,
    imageUrl: post.image_urls?.[0],
    keywords: [...(post.ai_keywords || []), ...(post.tags || [])],
    categoryName: post.categories?.name,
    upvoteCount: post.upvote_count,
    commentCount: post.comment_count,
  });

  const breadcrumbItems = [
    { name: "Home", url: "https://yespleaders.com/" },
  ];
  if (post.categories) {
    breadcrumbItems.push({
      name: post.categories.name,
      url: `https://yespleaders.com/c/${post.categories.slug}`,
    });
  }
  breadcrumbItems.push({
    name: post.title,
    url: `https://yespleaders.com/post/${post.slug}`,
  });

  const breadcrumbSchema = getBreadcrumbSchema(breadcrumbItems);
  const jsonLd = combineSchemas(articleSchema, breadcrumbSchema);

  return (
    <div className="container-narrow py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        {post.categories && (
          <Link to="/c/$slug" params={{ slug: post.categories.slug }} className="px-1.5 py-0.5 rounded bg-accent text-accent-foreground font-medium">
            {post.categories.name}
          </Link>
        )}
        <span>· {formatRelativeTime(post.created_at)}</span>
      </div>

      <h1 className="font-serif text-4xl sm:text-5xl font-bold leading-tight tracking-tight">{post.title}</h1>

      {post.profiles && (
        <div className="mt-5 flex items-center justify-between">
          <Link to="/leader/$username" params={{ username: post.profiles.username }} className="inline-flex items-center gap-3 group">
            {post.profiles.avatar_url ? (
              <img src={post.profiles.avatar_url} alt={post.profiles.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <span className="w-10 h-10 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center font-semibold">
                {post.profiles.name[0].toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold group-hover:text-primary inline-flex items-center gap-1">
                {post.profiles.name}
                {(post.profiles as any).is_verified && <VerifiedBadge size={15} tier={(post.profiles as any).verification_tier || "leader"} />}
              </p>
              {post.profiles.profession && <p className="text-xs text-muted-foreground">{post.profiles.profession}</p>}
            </div>
          </Link>

          {isDeletable && (
            <button
              onClick={onDeletePost}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      )}

      {post.image_urls?.[0] && (
        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <img src={post.image_urls[0]} alt={post.title} className="w-full max-h-[480px] object-cover" />
        </div>
      )}

      {post.image_urls && post.image_urls.length > 1 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(post.image_urls as string[]).slice(1).map((u: string) => (
            <img key={u} src={u} alt="" className="w-full h-32 object-cover rounded border border-border" />
          ))}
        </div>
      )}

      <div className="prose-content mt-8 text-base">
        {post.content.split("\n\n").map((p: string, i: number) => (
          <p key={i} className="whitespace-pre-wrap">{p}</p>
        ))}
      </div>

      {post.tags && post.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {(post.tags as string[]).map((t: string) => (
            <span key={t} className="font-mono text-xs px-2 py-1 rounded bg-surface-2 text-muted-foreground">#{t}</span>
          ))}
        </div>
      )}

      {/* AI Insights / GEO block */}
      {post.ai_insights && (
        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold">AI Summary</p>
            <span className="text-xs text-muted-foreground">Optimized for ChatGPT, Gemini, Claude & Perplexity</span>
          </div>
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            {(post.ai_insights as any).main_topic && (
              <Field label="Main topic" value={(post.ai_insights as any).main_topic} />
            )}
            {(post.ai_insights as any).business_impact && (
              <Field label="Business impact" value={(post.ai_insights as any).business_impact} />
            )}
            {(post.ai_insights as any).tools_mentioned?.length > 0 && (
              <Field label="Tools mentioned" value={(post.ai_insights as any).tools_mentioned.join(", ")} />
            )}
            {(post.ai_insights as any).quick_summary && (
              <Field label="Quick summary" value={(post.ai_insights as any).quick_summary} />
            )}
          </dl>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex items-center gap-3 sticky bottom-4 z-10">
        <button
          onClick={onVote}
          className={
            "inline-flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm bg-card transition-all duration-200 cursor-pointer " +
            (myVote ? "border-primary text-primary" : "border-border hover:border-primary") +
            " " + (animating ? "scale-120 rotate-[-8deg] bg-primary/5" : "hover:scale-105 active:scale-95")
          }
        >
          <ArrowBigUp className={"w-5 h-5 " + (myVote ? "fill-primary" : "")} />
          <span className="font-semibold tabular-nums">{post.upvote_count + (myVote ? 0 : 0)}</span>
          <span className="text-sm">Upvote</span>
        </button>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mr-auto">
          <MessageSquare className="w-4 h-4" /> {post.comment_count} comments
        </span>
        <SharePostDialog post={post} />
      </div>

      {/* Comments */}
      <section className="mt-10 pt-8 border-t border-border">
        <h2 className="font-serif text-2xl font-semibold mb-4">Comments</h2>

        {user ? (
          <form onSubmit={onComment} className="mb-6">
            <MentionTextarea
              rows={3}
              value={commentText}
              onValueChange={setCommentText}
              placeholder="Share your thoughts… Type @ to mention users"
              className="w-full px-4 py-3 rounded-md bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <div className="flex justify-end mt-2">
              <button disabled={posting} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {posting ? "Posting…" : "Post comment"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-6 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary font-medium">Sign in</Link> to join the discussion.
          </div>
        )}

        <ul className="space-y-5">
          {comments?.map((c) => (
            <li key={c.id} className="flex gap-3">
              {c.profiles?.avatar_url ? (
                <img src={c.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-8 h-8 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center text-xs font-semibold shrink-0">
                  {c.profiles?.name?.[0]?.toUpperCase()}
                </span>
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <Link to="/leader/$username" params={{ username: c.profiles?.username || "" }} className="font-semibold text-foreground hover:text-primary inline-flex items-center gap-1">
                      {c.profiles?.name}
                      {(c.profiles as any)?.is_verified && <VerifiedBadge size={12} tier={(c.profiles as any)?.verification_tier || "leader"} />}
                    </Link>
                    {c.profiles?.profession && <> · {c.profiles.profession}</>}
                    <> · {formatRelativeTime(c.created_at)}</>
                  </div>

                  {user && (user.id === c.user_id || isAdmin) && (
                    <div className="flex items-center gap-2 text-xs">
                      {user.id === c.user_id && (
                        <button
                          onClick={() => startEdit(c.id, c.content)}
                          className="text-muted-foreground hover:text-foreground font-medium flex items-center gap-0.5 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteComment(c.id)}
                        className="text-muted-foreground hover:text-foreground font-medium flex items-center gap-0.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {editingCommentId === c.id ? (
                  <div className="mt-2">
                    <MentionTextarea
                      value={editingText}
                      onValueChange={setEditingText}
                      className="w-full px-3 py-2 text-sm rounded bg-card border border-border focus:outline-none focus:ring-1 focus:ring-ring"
                      rows={2}
                    />
                    <div className="flex justify-end gap-2 mt-1.5">
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="px-2.5 py-1 text-xs rounded border border-border hover:bg-surface-2 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onSaveEdit(c.id)}
                        className="px-2.5 py-1 text-xs rounded bg-primary text-primary-foreground font-medium hover:opacity-90 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm whitespace-pre-wrap">{c.content}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <button
                        onClick={() => onCommentVote(c.id)}
                        className={
                          "inline-flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer " +
                          (myCommentVotes?.has(c.id) ? "text-primary font-bold" : "text-muted-foreground hover:text-primary")
                        }
                      >
                        <ArrowBigUp className={"w-3.5 h-3.5 " + (myCommentVotes?.has(c.id) ? "fill-primary text-primary" : "")} />
                        <span>{c.upvote_count} upvotes</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
          {comments && comments.length === 0 && (
            <li className="text-sm text-muted-foreground">No comments yet. Be the first.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}

