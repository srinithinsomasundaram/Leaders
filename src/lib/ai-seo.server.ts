// Server-only helper that calls Lovable AI Gateway to generate SEO + GEO metadata.

export type AiSeoResult = {
  seo_title: string;
  seo_description: string;
  ai_summary: string;
  ai_keywords: string[];
  ai_insights: {
    main_topic: string;
    tools_mentioned: string[];
    business_impact: string;
    quick_summary: string;
  };
};

export async function generateAiSeo(title: string, content: string): Promise<AiSeoResult | null> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    console.error("[ai-seo] Missing LOVABLE_API_KEY");
    return null;
  }

  const prompt = `You are an SEO + GEO (Generative Engine Optimization) editor for a public knowledge community about startups, AI, and product building. Given the post below, return a STRICT JSON object with these fields:
- seo_title: under 60 chars, keyword-rich, no quotes
- seo_description: under 155 chars meta description
- ai_summary: 2-3 sentence neutral summary
- ai_keywords: 5-8 lowercase keywords
- ai_insights: { main_topic, tools_mentioned (array of named products/tools), business_impact, quick_summary }

POST TITLE: ${title}
POST CONTENT:
${content.slice(0, 6000)}

Return ONLY JSON. No markdown.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("[ai-seo] gateway error", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content;
    if (!text) return null;
    const parsed = JSON.parse(text);
    return {
      seo_title: String(parsed.seo_title || title).slice(0, 120),
      seo_description: String(parsed.seo_description || "").slice(0, 200),
      ai_summary: String(parsed.ai_summary || ""),
      ai_keywords: Array.isArray(parsed.ai_keywords) ? parsed.ai_keywords.slice(0, 10).map(String) : [],
      ai_insights: {
        main_topic: String(parsed.ai_insights?.main_topic || ""),
        tools_mentioned: Array.isArray(parsed.ai_insights?.tools_mentioned)
          ? parsed.ai_insights.tools_mentioned.map(String)
          : [],
        business_impact: String(parsed.ai_insights?.business_impact || ""),
        quick_summary: String(parsed.ai_insights?.quick_summary || ""),
      },
    };
  } catch (e) {
    console.error("[ai-seo] failed", e);
    return null;
  }
}
