import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { slugify, withRandomSuffix } from "@/lib/slug";

const CreatePostInput = z.object({
  title: z.string().trim().min(3).max(120),
  content: z.string().trim().min(20).max(20000),
  category_slug: z.string().min(1),
  tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
  image_urls: z.array(z.string().url()).max(10).default([]),
});

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreatePostInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;

    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", data.category_slug)
      .maybeSingle();

    const baseSlug = slugify(data.title) || "post";
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", baseSlug)
      .maybeSingle();
    const finalSlug = existing ? withRandomSuffix(baseSlug) : baseSlug;

    const { data: post, error } = await supabase
      .from("posts")
      .insert({
        user_id: userId,
        category_id: cat?.id ?? null,
        title: data.title,
        slug: finalSlug,
        content: data.content,
        tags: data.tags,
        image_urls: data.image_urls,
      })
      .select("id, slug")
      .single();

    if (error || !post) throw new Error(error?.message || "Failed to create post");

    // Fire-and-forget AI SEO generation (don't block the response).
    const { generateAiSeo } = await import("@/lib/ai-seo.server");
    const { supabaseAdmin: supabaseAdminClient } = await import("@/integrations/supabase/client.server");
    const supabaseAdmin = supabaseAdminClient as any;
    generateAiSeo(data.title, data.content)
      .then(async (seo) => {
        if (!seo) return;
        await supabaseAdmin
          .from("posts")
          .update({
            seo_title: seo.seo_title,
            seo_description: seo.seo_description,
            ai_summary: seo.ai_summary,
            ai_keywords: seo.ai_keywords,
            ai_insights: seo.ai_insights,
          })
          .eq("id", post.id);
      })
      .catch((e) => console.error("[ai-seo bg]", e));

    return { slug: post.slug };
  });

const UpdateProfileInput = z.object({
  name: z.string().trim().min(1).max(60),
  username: z.string().trim().min(3).max(30).regex(/^[a-z0-9_]+$/, "lowercase letters, numbers, underscore"),
  profession: z.string().trim().max(80).optional().nullable(),
  avatar_url: z.string().url().optional().nullable().or(z.literal("")),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpdateProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { error } = await supabase
      .from("profiles")
      .update({
        name: data.name,
        username: data.username,
        profession: data.profession || null,
        avatar_url: data.avatar_url || null,
      })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ToggleVoteInput = z.object({ post_id: z.string().uuid() });

export const toggleVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleVoteInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { data: existing } = await supabase
      .from("votes")
      .select("id")
      .eq("post_id", data.post_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase.from("votes").delete().eq("id", existing.id);
      return { voted: false };
    }
    const { error } = await supabase.from("votes").insert({ post_id: data.post_id, user_id: userId });
    if (error) throw new Error(error.message);

    // Trigger notification in background
    (async () => {
      try {
        const { data: post } = await supabase
          .from("posts")
          .select("user_id, title, slug")
          .eq("id", data.post_id)
          .maybeSingle();
        if (post && post.user_id !== userId) {
          const { data: actorProfile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", userId)
            .maybeSingle();
          await createNotification(supabase, {
            user_id: post.user_id,
            type: "upvote",
            title: `${actorProfile?.name || "Someone"} upvoted your post`,
            body: post.title,
            link: `/post/${post.slug}`,
            actor_id: userId,
            post_id: data.post_id,
          });
        }
      } catch (err) {
        console.error("[toggleVote notification error]", err);
      }
    })();

    return { voted: true };
  });

const CommentInput = z.object({
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().optional().nullable(),
  content: z.string().trim().min(1).max(5000),
});

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CommentInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { error } = await supabase.from("comments").insert({
      post_id: data.post_id,
      user_id: userId,
      parent_id: data.parent_id || null,
      content: data.content,
    });
    if (error) throw new Error(error.message);

    // Trigger notification in background
    (async () => {
      try {
        const { data: commenterProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", userId)
          .maybeSingle();
        const { data: post } = await supabase
          .from("posts")
          .select("user_id, title, slug")
          .eq("id", data.post_id)
          .maybeSingle();

        if (post) {
          const commentBody = data.content.slice(0, 100) + (data.content.length > 100 ? "..." : "");
          // 1. Notify post owner if commenter is not post owner
          if (post.user_id !== userId) {
            await createNotification(supabase, {
              user_id: post.user_id,
              type: "comment",
              title: `${commenterProfile?.name || "Someone"} commented on your post`,
              body: commentBody,
              link: `/post/${post.slug}`,
              actor_id: userId,
              post_id: data.post_id,
            });
          }

          // 2. Notify parent comment owner if this is a reply
          if (data.parent_id) {
            const { data: parentComment } = await supabase
              .from("comments")
              .select("user_id")
              .eq("id", data.parent_id)
              .maybeSingle();

            if (parentComment && parentComment.user_id !== userId && parentComment.user_id !== post.user_id) {
              await createNotification(supabase, {
                user_id: parentComment.user_id,
                type: "comment",
                title: `${commenterProfile?.name || "Someone"} replied to your comment`,
                body: commentBody,
                link: `/post/${post.slug}`,
                actor_id: userId,
                post_id: data.post_id,
              });
            }
          }
        }
      } catch (err) {
        console.error("[addComment notification error]", err);
      }
    })();

    return { ok: true };
  });

const DeletePostInput = z.object({ post_id: z.string().uuid() });
export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeletePostInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("posts").delete().eq("id", data.post_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteCommentInput = z.object({ comment_id: z.string().uuid() });
export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DeleteCommentInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("comments").delete().eq("id", data.comment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const EditCommentInput = z.object({
  comment_id: z.string().uuid(),
  content: z.string().trim().min(1).max(5000),
});
export const editComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EditCommentInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase
      .from("comments")
      .update({ content: data.content })
      .eq("id", data.comment_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ToggleCommentVoteInput = z.object({ comment_id: z.string().uuid() });
export const toggleCommentVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ToggleCommentVoteInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { data: existing } = await supabase
      .from("comment_votes")
      .select("id")
      .eq("comment_id", data.comment_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase.from("comment_votes").delete().eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { voted: false };
    }
    const { error } = await supabase.from("comment_votes").insert({ comment_id: data.comment_id, user_id: userId });
    if (error) throw new Error(error.message);
    return { voted: true };
  });

// ─── Verification ───────────────────────────────────────────────

const RequestVerificationInput = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const requestVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RequestVerificationInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;

    // Check if already verified
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_verified")
      .eq("id", userId)
      .single();
    if (profile?.is_verified) throw new Error("You are already verified.");

    // Check if there's already a pending request
    const { data: existing } = await supabase
      .from("verification_requests")
      .select("id, status")
      .eq("user_id", userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) throw new Error("You already have a pending verification request.");

    const { error } = await supabase.from("verification_requests").insert({
      user_id: userId,
      reason: data.reason || null,
      status: "pending",
    });
    if (error) throw new Error(error.message);

    // Mark timestamp on profile
    await supabase
      .from("profiles")
      .update({ verification_requested_at: new Date().toISOString() })
      .eq("id", userId);

    return { ok: true };
  });

const ReviewVerificationInput = z.object({
  request_id: z.string().uuid(),
  action: z.enum(["approved", "rejected"]),
  admin_note: z.string().trim().max(500).optional(),
});

export const reviewVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReviewVerificationInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;

    // Verify admin role
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) throw new Error("Unauthorized: admin only");

    // Update request status. The SECURITY DEFINER trigger in DB automatically
    // handles setting is_verified and verification_requested_at on the profiles table.
    const { error } = await supabase
      .from("verification_requests")
      .update({
        status: data.action,
        admin_note: data.admin_note || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.request_id);

    if (error) throw new Error(error.message);

    // Trigger notification in background
    (async () => {
      try {
        const { data: req } = await supabase
          .from("verification_requests")
          .select("user_id")
          .eq("id", data.request_id)
          .maybeSingle();

        if (req) {
          const { data: recipientProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", req.user_id)
            .maybeSingle();

          const profileLink = recipientProfile?.username ? `/leader/${recipientProfile.username}` : "/";

          if (data.action === "approved") {
            await createNotification(supabase, {
              user_id: req.user_id,
              type: "verification_approved",
              title: "Your profile has been verified!",
              body: data.admin_note || "You now have the golden verification badge.",
              link: profileLink,
              actor_id: userId,
            });
          } else {
            await createNotification(supabase, {
              user_id: req.user_id,
              type: "verification_rejected",
              title: "Verification request declined",
              body: data.admin_note || "Please review our guidelines and try again.",
              link: "/",
              actor_id: userId,
            });
          }
        }
      } catch (err) {
        console.error("[reviewVerification notification error]", err);
      }
    })();

    return { ok: true };
  });

async function createNotification(supabaseClient: any, params: {
  user_id: string;
  type: "upvote" | "comment" | "mention" | "verification_approved" | "verification_rejected";
  title: string;
  body?: string | null;
  link?: string | null;
  actor_id?: string | null;
  post_id?: string | null;
}) {
  try {
    const { error } = await supabaseClient.from("notifications").insert(params);
    if (error) {
      console.error("[createNotification] Error inserting notification:", error.message);
    }
  } catch (e) {
    console.error("[createNotification] Failed to insert notification:", e);
  }
}

export const getNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { data, error } = await supabase
      .from("notifications")
      .select(`
        id,
        user_id,
        type,
        title,
        body,
        link,
        is_read,
        actor_id,
        post_id,
        created_at,
        actor:profiles!notifications_actor_id_fkey(name, username, avatar_url)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data;
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MarkNotificationReadInput = z.object({ id: z.string().uuid() });
export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MarkNotificationReadInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const userId = context.userId;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
