// Server-only helper that calls standard AI APIs (OpenAI or Gemini) to generate SEO + GEO metadata.

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
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!openAiKey && !geminiKey) {
    console.warn("[ai-seo] Missing OPENAI_API_KEY or GEMINI_API_KEY. Skipping AI metadata generation.");
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
    let res: Response;
    if (geminiKey) {
      // Use official Google Gemini API endpoint
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );
    } else {
      // Use official OpenAI API endpoint
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
    }

    if (!res.ok) {
      console.error("[ai-seo] API error", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    let text = "";
    if (geminiKey) {
      text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      text = json.choices?.[0]?.message?.content;
    }

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
