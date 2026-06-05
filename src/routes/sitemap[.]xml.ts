import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const [{ data: posts }, { data: cats }, { data: profiles }] = (await Promise.all([
          supabase.from("posts").select("slug, updated_at").eq("hidden", false).limit(5000),
          supabase.from("categories").select("slug"),
          supabase.from("profiles").select("username, updated_at").limit(5000),
        ])) as any;

        const entries: { path: string; lastmod?: string }[] = [
          { path: "/" },
          { path: "/categories" },
        ];
        cats?.forEach((c: any) => entries.push({ path: `/c/${c.slug}` }));
        posts?.forEach((p: any) => entries.push({ path: `/post/${p.slug}`, lastmod: p.updated_at }));
        profiles?.forEach((p: any) => entries.push({ path: `/leader/${p.username}`, lastmod: p.updated_at }));

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...entries.map((e) =>
            `  <url><loc>${BASE_URL}${e.path}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}</url>`
          ),
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
