/**
 * YLS (Yesp Leaders Score) Ranking System
 * Business-value based algorithm, not vanity metrics
 */

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

interface BusinessRelevanceAnalysis {
  business_relevance_score: number; // 0-10
  is_opportunity: boolean;
  opportunity_type?: "hiring" | "partnership" | "investment" | "sales_lead" | "collaboration" | null;
  detected_topics: string[];
  spam_score: number; // 0-10
  completion_rate: number; // 0-100
}

/**
 * Analyze post content for business relevance and opportunities
 */
export async function analyzeBusinessRelevance(
  title: string,
  content: string
): Promise<BusinessRelevanceAnalysis> {
  try {
    const prompt = `You are analyzing a post on Yesp Leaders, a business community platform. Your job is to evaluate it for business value.

Title: ${title}

Content: ${content}

Analyze this post and return a JSON object with:

1. business_relevance_score (0-10):
   HIGH (8-10): Lead opportunities, startup insights, sales strategies, business partnerships, AI implementation, founder experiences, actionable advice
   MEDIUM (4-7): Industry news, professional discussions, career advice, technical content
   LOW (0-3): Motivational quotes, generic content, pure self-promotion, spam

2. is_opportunity (boolean):
   true if post contains: job listings, hiring, seeking partnerships, looking for investors, sales opportunities, collaboration requests
   false otherwise

3. opportunity_type (if is_opportunity is true):
   - "hiring": Looking for employees/contractors
   - "partnership": Seeking business partners
   - "investment": Looking for investors or offering investment
   - "sales_lead": Sales opportunity or looking for vendors
   - "collaboration": Open to collaboration/projects
   - null if not an opportunity

4. detected_topics (array of strings):
   Extract relevant topics like: AI, SaaS, Startups, Marketing, Sales, Development, Design, etc.
   Maximum 5 topics

5. spam_score (0-10):
   HIGH (7-10): Excessive links, repetitive content, mass promotion, clickbait, scams
   MEDIUM (4-6): Some self-promotion but with value
   LOW (0-3): Genuine content, minimal promotion

6. completion_rate (0-100):
   Estimate how complete/well-written the post is:
   - Has clear structure
   - Proper formatting
   - Complete thoughts
   - Good length (not too short, not too long)

Return ONLY valid JSON, no other text.`;

    const message = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "{}";

    // Parse the JSON response
    const analysis: BusinessRelevanceAnalysis = JSON.parse(responseText);

    // Validate and clamp values
    return {
      business_relevance_score: Math.max(
        0,
        Math.min(10, analysis.business_relevance_score || 0)
      ),
      is_opportunity: analysis.is_opportunity || false,
      opportunity_type: analysis.opportunity_type || null,
      detected_topics: (analysis.detected_topics || []).slice(0, 5),
      spam_score: Math.max(0, Math.min(10, analysis.spam_score || 0)),
      completion_rate: Math.max(
        0,
        Math.min(100, analysis.completion_rate || 0)
      ),
    };
  } catch (error) {
    console.error("[YLS] Failed to analyze business relevance:", error);

    // Return default values on error
    return {
      business_relevance_score: 5,
      is_opportunity: false,
      opportunity_type: null,
      detected_topics: [],
      spam_score: 0,
      completion_rate: 50,
    };
  }
}

/**
 * Analyze comment quality
 */
export async function analyzeCommentQuality(
  commentContent: string
): Promise<{
  quality_score: number; // 1-5
  is_high_value: boolean;
  has_question: boolean;
  has_experience: boolean;
}> {
  const content = commentContent.trim();
  const wordCount = content.split(/\s+/).length;

  // Quick pattern matching for low-value comments
  const lowValuePatterns = [
    /^(nice|great|thanks|cool|awesome|good|ok|okay)$/i,
    /^(👍|👏|🔥|💯|❤️|✅)$/,
  ];

  const isLowValue = lowValuePatterns.some((pattern) => pattern.test(content));

  if (isLowValue || wordCount < 3) {
    return {
      quality_score: 1,
      is_high_value: false,
      has_question: false,
      has_experience: false,
    };
  }

  // Check for questions
  const hasQuestion = /\?/.test(content);

  // Check for experience markers
  const hasExperience = /(i|we|my|our) (built|created|developed|launched|tried|used|found|learned|experienced)/i.test(
    content
  );

  // Calculate quality score
  let qualityScore = 1;

  if (wordCount >= 10) qualityScore = 2;
  if (wordCount >= 20) qualityScore = 3;
  if (wordCount >= 40) qualityScore = 4;
  if (wordCount >= 60 && (hasQuestion || hasExperience)) qualityScore = 5;

  const isHighValue = qualityScore >= 3;

  return {
    quality_score: qualityScore,
    is_high_value: isHighValue,
    has_question: hasQuestion,
    has_experience: hasExperience,
  };
}

/**
 * Detect spam patterns in post
 */
export function detectSpamPatterns(title: string, content: string): number {
  let spamScore = 0;

  // Excessive links
  const linkCount = (content.match(/https?:\/\//g) || []).length;
  if (linkCount > 3) spamScore += 3;
  if (linkCount > 5) spamScore += 2;

  // Excessive caps
  const capsRatio =
    (content.match(/[A-Z]/g) || []).length / (content.length || 1);
  if (capsRatio > 0.3) spamScore += 2;

  // Repetitive content
  const words = content.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const repetitionRatio = 1 - uniqueWords.size / (words.length || 1);
  if (repetitionRatio > 0.5) spamScore += 3;

  // Spam keywords
  const spamKeywords = [
    "buy now",
    "click here",
    "limited time",
    "act now",
    "free money",
    "make money fast",
    "guaranteed",
    "100% free",
  ];
  const hasSpamKeywords = spamKeywords.some((keyword) =>
    content.toLowerCase().includes(keyword)
  );
  if (hasSpamKeywords) spamScore += 4;

  // Very short title with link
  if (title.length < 10 && linkCount > 0) spamScore += 2;

  return Math.min(10, spamScore);
}
