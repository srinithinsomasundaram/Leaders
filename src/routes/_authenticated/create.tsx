import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
const supabase = supabaseClient as any;
import { createPost } from "@/lib/posts.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { MentionTextarea } from "@/components/MentionTextarea";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => {
    const title = "Write a post · Yesp Leaders";
    const desc = "Share a lesson, teardown, or insight with the Yesp Leaders community. Your post will be automatically SEO and GEO optimized.";
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
        { property: "og:url", content: "https://yespleaders.com/create" },
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
      links: [{ rel: "canonical", href: "https://yespleaders.com/create" }],
    };
  },
  component: CreatePage,
});

function CreatePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const createFn = useServerFn(createPost);

  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => ((await supabase.from("categories").select("name, slug").order("name")).data ?? []) as any[],
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categorySlug, setCategorySlug] = useState("startups");
  const [tagsRaw, setTagsRaw] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !user) return;
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(e.target.files).slice(0, 10 - images.length)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error } = await supabase.storage.from("post-images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("post-images").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
      setImages((cur) => [...cur, ...newUrls]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const tags = tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8);
      const res = await createFn({
        data: { title, content, category_slug: categorySlug, tags, image_urls: images },
      });
      toast.success("Published! Generating SEO in the background…");
      navigate({ to: "/post/$slug", params: { slug: res.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
      setSubmitting(false);
    }
  }

  return (
    <div className="container-narrow py-8">
      <h1 className="font-serif text-3xl font-bold mb-1">Write a post</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Share a lesson, teardown, or insight. We'll auto-generate SEO + GEO metadata after publishing.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</label>
          <input
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="How we got our first 100 SaaS users"
            className="mt-1 w-full px-4 py-3 rounded-md bg-card border border-border text-lg font-serif focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
          <p className="mt-1 text-xs text-muted-foreground">{title.length}/120</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-md bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {cats?.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags (comma separated)</label>
            <input
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="ai, growth, saas"
              className="mt-1 w-full px-3 py-2 rounded-md bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content (markdown supported)</label>
          <MentionTextarea
            required
            minLength={20}
            rows={16}
            value={content}
            onValueChange={setContent}
            placeholder="Write the full story… Type @ to mention users"
            className="mt-1 w-full px-4 py-3 rounded-md bg-card border border-border text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Images ({images.length}/10)</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {images.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="w-20 h-20 object-cover rounded-md border border-border" />
                <button type="button" onClick={() => setImages(images.filter((u) => u !== url))} className="absolute -top-1.5 -right-1.5 bg-foreground text-background rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 10 && (
              <label className="w-20 h-20 inline-flex items-center justify-center rounded-md border border-dashed border-border cursor-pointer hover:bg-surface-2">
                <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
              </label>
            )}
          </div>
          {uploading && <p className="mt-1 text-xs text-muted-foreground">Uploading…</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50">
            {submitting ? "Publishing…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
