/**
 * Yesp Leaders Email System using Resend
 *
 * Email Philosophy:
 * Every email should answer: "What opportunity will the member miss if they don't open this email?"
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

const FROM_EMAIL = "Yesp Leaders <noreply@yespleaders.com>";
const BASE_URL = "https://yespleaders.com";

// Email Engagement Scoring
export const EMAIL_ENGAGEMENT_SCORES = {
  OPEN_EMAIL: 1,
  CLICK_LINK: 3,
  VISIT_PLATFORM: 5,
  CREATE_POST: 10,
  MAKE_CONNECTION: 15,
};

interface EmailRecipient {
  email: string;
  name: string;
  username: string;
}

/**
 * 1. Daily Leader Digest
 * Sent every morning with top posts, opportunities, and featured leaders
 */
export async function sendDailyDigest(
  recipient: EmailRecipient,
  content: {
    topPosts: Array<{ title: string; slug: string; author: string; upvotes: number }>;
    opportunities: Array<{ title: string; type: string; slug: string }>;
    featuredLeader: { name: string; username: string; profession: string };
  }
) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Yesp Leaders Daily Digest</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">🚀 Your Daily Digest</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">The best of Yesp Leaders today</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <h2 style="color: #111827; margin-top: 0;">📈 Top Posts Today</h2>
    ${content.topPosts.map(post => `
      <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea;">
        <h3 style="margin: 0 0 5px 0; font-size: 16px;">
          <a href="${BASE_URL}/post/${post.slug}" style="color: #111827; text-decoration: none;">${post.title}</a>
        </h3>
        <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
          by ${post.author} • ${post.upvotes} upvotes
        </p>
      </div>
    `).join('')}

    <h2 style="color: #111827; margin-top: 30px;">🔥 New Opportunities</h2>
    ${content.opportunities.map(opp => `
      <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #f59e0b;">
        <span style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
          ${opp.type}
        </span>
        <h3 style="margin: 10px 0 0 0; font-size: 16px;">
          <a href="${BASE_URL}/post/${opp.slug}" style="color: #111827; text-decoration: none;">${opp.title}</a>
        </h3>
      </div>
    `).join('')}

    <h2 style="color: #111827; margin-top: 30px;">⭐ Featured Leader</h2>
    <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
      <h3 style="margin: 0; font-size: 18px;">${content.featuredLeader.name}</h3>
      <p style="margin: 5px 0; color: #6b7280;">${content.featuredLeader.profession}</p>
      <a href="${BASE_URL}/leader/${content.featuredLeader.username}"
         style="display: inline-block; margin-top: 10px; background: #667eea; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
        View Profile
      </a>
    </div>

    <div style="margin-top: 30px; text-align: center;">
      <a href="${BASE_URL}"
         style="display: inline-block; background: #111827; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Explore More
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
      You're receiving this because you're a member of Yesp Leaders.<br>
      <a href="${BASE_URL}/settings" style="color: #667eea;">Manage email preferences</a>
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: "🚀 Your Yesp Leaders Daily Digest",
    html,
  });
}

/**
 * 2. New Connection Request Alert
 */
export async function sendConnectionRequest(
  recipient: EmailRecipient,
  requester: {
    name: string;
    username: string;
    profession: string;
    avatarUrl?: string;
    reason?: string;
    type?: string;
  }
) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">🤝 New Connection Request</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: white; padding: 25px; border-radius: 8px; text-align: center;">
      ${requester.avatarUrl ? `
        <img src="${requester.avatarUrl}" alt="${requester.name}"
             style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 15px;">
      ` : `
        <div style="width: 80px; height: 80px; border-radius: 50%; background: #667eea; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; margin-bottom: 15px;">
          ${requester.name[0].toUpperCase()}
        </div>
      `}
      <h2 style="margin: 0; font-size: 22px;">${requester.name}</h2>
      <p style="margin: 5px 0; color: #6b7280;">${requester.profession}</p>
      ${requester.type ? `
        <span style="display: inline-block; margin-top: 10px; background: #dbeafe; color: #1e40af; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
          ${requester.type}
        </span>
      ` : ''}
    </div>

    ${requester.reason ? `
      <div style="background: white; padding: 20px; margin-top: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
        <p style="margin: 0; font-style: italic; color: #374151;">
          "${requester.reason}"
        </p>
      </div>
    ` : ''}

    <div style="margin-top: 25px; text-align: center;">
      <a href="${BASE_URL}/leader/${requester.username}"
         style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 5px;">
        View Profile & Respond
      </a>
    </div>

    <p style="margin-top: 25px; font-size: 14px; color: #6b7280; text-align: center;">
      Building meaningful connections is what Yesp Leaders is all about.
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: "🤝 You have a new connection request",
    html,
  });
}

/**
 * 3. Opportunity Alert (matching user interests)
 */
export async function sendOpportunityAlert(
  recipient: EmailRecipient,
  opportunity: {
    title: string;
    slug: string;
    type: string;
    author: string;
    excerpt: string;
  }
) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">🔥 New Opportunity</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Matching your interests</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: white; padding: 25px; border-radius: 8px;">
      <span style="background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
        ${opportunity.type}
      </span>
      <h2 style="margin: 15px 0 10px 0; font-size: 22px; color: #111827;">
        ${opportunity.title}
      </h2>
      <p style="margin: 0 0 15px 0; color: #6b7280;">
        by ${opportunity.author}
      </p>
      <p style="margin: 0; color: #374151; line-height: 1.8;">
        ${opportunity.excerpt}
      </p>
    </div>

    <div style="margin-top: 25px; text-align: center;">
      <a href="${BASE_URL}/post/${opportunity.slug}"
         style="display: inline-block; background: #f59e0b; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View Opportunity
      </a>
    </div>

    <p style="margin-top: 25px; font-size: 13px; color: #9ca3af; text-align: center;">
      Don't miss out on opportunities that match your business goals.
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: "🔥 New opportunity matching your interests",
    html,
  });
}

/**
 * 4. Post Performance Update
 */
export async function sendPostPerformance(
  recipient: EmailRecipient,
  post: {
    title: string;
    slug: string;
    views: number;
    upvotes: number;
    comments: number;
    newFollowers: number;
  }
) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">📈 Your Post is Gaining Traction</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: white; padding: 25px; border-radius: 8px;">
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #111827;">
        "${post.title}"
      </h2>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
          <div style="font-size: 32px; font-weight: bold; color: #667eea;">${post.views}</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 5px;">Views</div>
        </div>
        <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
          <div style="font-size: 32px; font-weight: bold; color: #10b981;">${post.upvotes}</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 5px;">Upvotes</div>
        </div>
        <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
          <div style="font-size: 32px; font-weight: bold; color: #f59e0b;">${post.comments}</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 5px;">Comments</div>
        </div>
        <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
          <div style="font-size: 32px; font-weight: bold; color: #8b5cf6;">${post.newFollowers}</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 5px;">New Followers</div>
        </div>
      </div>
    </div>

    <div style="margin-top: 25px; text-align: center;">
      <a href="${BASE_URL}/post/${post.slug}"
         style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View Post & Engage
      </a>
    </div>

    <p style="margin-top: 25px; font-size: 14px; color: #6b7280; text-align: center;">
      Keep the momentum going by responding to comments!
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: "📈 Your post is gaining traction",
    html,
  });
}

/**
 * 5. Weekly Leader Report
 */
export async function sendWeeklyReport(
  recipient: EmailRecipient,
  stats: {
    newConnections: number;
    profileViews: number;
    engagementGrowth: number;
    topPost?: { title: string; slug: string; upvotes: number };
  }
) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">📊 Your Weekly Report</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Leadership growth this week</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="margin: 0 0 20px 0; font-size: 18px; color: #111827;">This Week's Highlights</h2>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="text-align: center; padding: 15px; background: #eff6ff; border-radius: 8px; border: 2px solid #3b82f6;">
          <div style="font-size: 36px; font-weight: bold; color: #3b82f6;">${stats.newConnections}</div>
          <div style="font-size: 13px; color: #1e40af; margin-top: 5px; font-weight: 600;">New Connections</div>
        </div>
        <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
          <div style="font-size: 36px; font-weight: bold; color: #6b7280;">${stats.profileViews}</div>
          <div style="font-size: 13px; color: #4b5563; margin-top: 5px; font-weight: 600;">Profile Views</div>
        </div>
      </div>

      <div style="text-align: center; padding: 20px; background: #ecfdf5; border-radius: 8px;">
        <div style="font-size: 42px; font-weight: bold; color: #10b981;">+${stats.engagementGrowth}%</div>
        <div style="font-size: 14px; color: #047857; margin-top: 5px; font-weight: 600;">Engagement Growth</div>
      </div>
    </div>

    ${stats.topPost ? `
      <div style="background: white; padding: 25px; border-radius: 8px;">
        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #6b7280;">🏆 Your Top Post</h3>
        <h2 style="margin: 0 0 10px 0; font-size: 18px; color: #111827;">
          <a href="${BASE_URL}/post/${stats.topPost.slug}" style="color: #111827; text-decoration: none;">
            ${stats.topPost.title}
          </a>
        </h2>
        <p style="margin: 0; color: #6b7280;">${stats.topPost.upvotes} upvotes</p>
      </div>
    ` : ''}

    <div style="margin-top: 25px; text-align: center;">
      <a href="${BASE_URL}/leader/${recipient.username}"
         style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View Your Profile
      </a>
    </div>

    <p style="margin-top: 25px; font-size: 13px; color: #9ca3af; text-align: center;">
      Keep growing your leadership presence on Yesp Leaders.
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: "📊 Your weekly leadership report",
    html,
  });
}

/**
 * 6. Milestone Email
 */
export async function sendMilestone(
  recipient: EmailRecipient,
  milestone: {
    type: 'first_post' | 'first_100_followers' | 'creator_verified' | 'leader_verified' | 'top_contributor';
    title: string;
    message: string;
  }
) {
  const milestoneEmojis = {
    first_post: '🎉',
    first_100_followers: '🎊',
    creator_verified: '🔵',
    leader_verified: '🏆',
    top_contributor: '⭐',
  };

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: white; padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
    <div style="font-size: 64px; margin-bottom: 15px;">${milestoneEmojis[milestone.type]}</div>
    <h1 style="margin: 0; font-size: 28px;">${milestone.title}</h1>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: white; padding: 30px; border-radius: 8px; text-align: center;">
      <p style="margin: 0; font-size: 18px; color: #374151; line-height: 1.8;">
        ${milestone.message}
      </p>
    </div>

    <div style="margin-top: 25px; text-align: center;">
      <a href="${BASE_URL}/leader/${recipient.username}"
         style="display: inline-block; background: #ec4899; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View Your Profile
      </a>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">
      You're making an impact on Yesp Leaders. Keep it up!
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: `${milestoneEmojis[milestone.type]} ${milestone.title}`,
    html,
  });
}

/**
 * 7. Re-engagement Email (inactive for 7 days)
 */
export async function sendReengagement(
  recipient: EmailRecipient,
  content: {
    missedOpportunities: number;
    trendingPosts: Array<{ title: string; slug: string }>;
    pendingConnections: number;
  }
) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">Your network is growing without you 👀</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Here's what you've missed</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    <div style="background: white; padding: 25px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
      <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #111827;">
        ${content.missedOpportunities} opportunities you might have missed
      </h2>
      <p style="margin: 0; color: #6b7280;">
        Including hiring, partnerships, and investment opportunities matching your profile.
      </p>
    </div>

    ${content.pendingConnections > 0 ? `
      <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; border: 2px solid #10b981;">
        <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #111827;">
          🤝 ${content.pendingConnections} pending connection${content.pendingConnections > 1 ? 's' : ''}
        </h3>
        <p style="margin: 0; color: #6b7280; font-size: 14px;">
          Leaders are waiting to connect with you
        </p>
      </div>
    ` : ''}

    <h3 style="margin: 20px 0 15px 0; font-size: 16px; color: #6b7280;">🔥 Trending Discussions</h3>
    ${content.trendingPosts.map(post => `
      <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px;">
        <a href="${BASE_URL}/post/${post.slug}" style="color: #111827; text-decoration: none; font-weight: 600;">
          ${post.title}
        </a>
      </div>
    `).join('')}

    <div style="margin-top: 30px; text-align: center;">
      <a href="${BASE_URL}"
         style="display: inline-block; background: #6366f1; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Catch Up Now
      </a>
    </div>

    <p style="margin-top: 25px; font-size: 13px; color: #9ca3af; text-align: center;">
      Don't let opportunities pass you by.
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: "Your network is growing without you 👀",
    html,
  });
}

/**
 * 8. AI-Powered Match Email
 */
export async function sendAIMatches(
  recipient: EmailRecipient,
  matches: Array<{
    name: string;
    username: string;
    profession: string;
    matchScore: number;
    reason: string;
  }>
) {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">🎯 ${matches.length} Leaders You Should Connect With</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">AI-matched based on your profile</p>
  </div>

  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
    ${matches.map(match => `
      <div style="background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border: 2px solid #d1fae5;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
          <div>
            <h3 style="margin: 0; font-size: 18px; color: #111827;">${match.name}</h3>
            <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${match.profession}</p>
          </div>
          <span style="background: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 700;">
            ${match.matchScore}% Match
          </span>
        </div>
        <p style="margin: 10px 0; color: #374151; font-size: 14px;">
          ${match.reason}
        </p>
        <a href="${BASE_URL}/leader/${match.username}"
           style="display: inline-block; margin-top: 10px; background: #14b8a6; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 13px;">
          View Profile & Connect
        </a>
      </div>
    `).join('')}

    <p style="margin-top: 25px; font-size: 14px; color: #6b7280; text-align: center;">
      These connections could unlock new opportunities for your business.
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: `🎯 ${matches.length} leaders you should connect with`,
    html,
  });
}

/**
 * 9. Welcome Email (for all users)
 */
export async function sendWelcomeEmail(recipient: EmailRecipient) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Yesp Leaders Community</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
    <div style="font-size: 64px; margin-bottom: 15px;">🚀</div>
    <h1 style="margin: 0; font-size: 32px;">Welcome to Yesp Leaders!</h1>
    <p style="margin: 15px 0 0 0; opacity: 0.95; font-size: 18px;">Where business leaders connect and grow</p>
  </div>

  <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px;">
    <p style="margin: 0 0 20px 0; font-size: 18px; color: #111827; font-weight: 600;">
      Hi ${recipient.name},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.8;">
      We're thrilled to have you join the Yesp Leaders community! This is where founders, executives, and business professionals come together to share insights, discover opportunities, and build meaningful connections.
    </p>

    <div style="background: #f3f4f6; padding: 25px; border-radius: 8px; margin: 30px 0;">
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #111827;">🎯 What You Can Do on Yesp Leaders</h2>

      <div style="margin: 15px 0;">
        <div style="display: flex; align-items: start; margin-bottom: 15px;">
          <span style="font-size: 24px; margin-right: 12px;">📝</span>
          <div>
            <strong style="color: #111827;">Share Your Expertise</strong>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Create posts about your business insights, startup journey, and professional experiences</p>
          </div>
        </div>

        <div style="display: flex; align-items: start; margin-bottom: 15px;">
          <span style="font-size: 24px; margin-right: 12px;">🤝</span>
          <div>
            <strong style="color: #111827;">Connect with Leaders</strong>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Build your network with founders, investors, and professionals in your industry</p>
          </div>
        </div>

        <div style="display: flex; align-items: start; margin-bottom: 15px;">
          <span style="font-size: 24px; margin-right: 12px;">🔥</span>
          <div>
            <strong style="color: #111827;">Discover Opportunities</strong>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Find hiring, partnerships, investments, and collaboration opportunities</p>
          </div>
        </div>

        <div style="display: flex; align-items: start;">
          <span style="font-size: 24px; margin-right: 12px;">🏆</span>
          <div>
            <strong style="color: #111827;">Get Verified</strong>
            <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Earn Creator, Leader, or Elite badges by contributing quality content and building your reputation</p>
          </div>
        </div>
      </div>
    </div>

    <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
      <h3 style="margin: 0 0 15px 0; font-size: 18px; color: white;">🎁 Start Strong</h3>
      <p style="margin: 0 0 20px 0; color: white; opacity: 0.95; font-size: 14px;">
        Create your first post to earn the Creator badge! Share your expertise, ask questions, or introduce yourself to the community.
      </p>
      <a href="${BASE_URL}/create"
         style="display: inline-block; background: white; color: #059669; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">
        Create Your First Post
      </a>
    </div>

    <div style="margin-top: 30px; text-align: center;">
      <a href="${BASE_URL}"
         style="display: inline-block; background: #667eea; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 5px;">
        Explore the Community
      </a>
      <a href="${BASE_URL}/leader/${recipient.username}"
         style="display: inline-block; background: #111827; color: white; padding: 14px 35px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 5px;">
        Complete Your Profile
      </a>
    </div>

    <div style="margin-top: 40px; padding-top: 30px; border-top: 2px solid #f3f4f6;">
      <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151; line-height: 1.8;">
        We're building something special here - a community where business relationships turn into real opportunities. We can't wait to see what you'll contribute!
      </p>
      <p style="margin: 0; font-size: 16px; color: #374151;">
        Welcome aboard,<br>
        <strong style="color: #667eea;">The Yesp Leaders Team</strong>
      </p>
    </div>

    <p style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      You're receiving this as a member of Yesp Leaders.<br>
      Questions? Reply to this email or visit our <a href="${BASE_URL}" style="color: #667eea;">community</a>.
    </p>
  </div>
</body>
</html>
  `;

  return await resend.emails.send({
    from: FROM_EMAIL,
    to: recipient.email,
    subject: "🚀 Welcome to Yesp Leaders Community!",
    html,
  });
}

/**
 * Track email engagement
 */
export async function trackEmailEngagement(
  userId: string,
  emailType: string,
  action: 'sent' | 'opened' | 'clicked',
  metadata?: Record<string, any>
) {
  // This would be called from your email tracking endpoints
  // You'll need to implement tracking pixel and link tracking
  const score = action === 'opened' ? EMAIL_ENGAGEMENT_SCORES.OPEN_EMAIL :
               action === 'clicked' ? EMAIL_ENGAGEMENT_SCORES.CLICK_LINK : 0;

  return {
    userId,
    emailType,
    action,
    score,
    metadata,
    timestamp: new Date().toISOString(),
  };
}
