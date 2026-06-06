// SEO and Structured Data utilities for Yesp Leaders

export const SITE_CONFIG = {
  name: "Yesp Leaders",
  url: "https://yespleaders.com",
  description: "Public knowledge from founders, devs, creators & builders. Share lessons, get discovered by Google & AI engines.",
  logo: "https://yespleaders.com/logo.svg",
  socialImage: "https://yespleaders.com/logo.svg",
  twitter: "@yespleaders",
  organizationName: "Yesp Leaders",
  foundingDate: "2024",
};

// Organization Schema - For sitelinks and brand recognition
export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_CONFIG.url}/#organization`,
    name: SITE_CONFIG.organizationName,
    url: SITE_CONFIG.url,
    logo: {
      "@type": "ImageObject",
      url: SITE_CONFIG.logo,
    },
    description: SITE_CONFIG.description,
    foundingDate: SITE_CONFIG.foundingDate,
    sameAs: [
      // Add social media URLs when available
    ],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// WebSite Schema with Sitelinks SearchBox
export function getWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_CONFIG.url}/#website`,
    url: SITE_CONFIG.url,
    name: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    publisher: {
      "@id": `${SITE_CONFIG.url}/#organization`,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// WebPage Schema
export function getWebPageSchema(params: {
  url: string;
  title: string;
  description: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${params.url}#webpage`,
    url: params.url,
    name: params.title,
    description: params.description,
    isPartOf: {
      "@id": `${SITE_CONFIG.url}/#website`,
    },
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
    inLanguage: "en-US",
  };
}

// Article Schema - Enhanced for blog posts
export function getArticleSchema(params: {
  slug: string;
  title: string;
  description?: string;
  content: string;
  authorName: string;
  authorUsername: string;
  datePublished: string;
  dateModified?: string;
  imageUrl?: string;
  keywords?: string[];
  categoryName?: string;
  upvoteCount?: number;
  commentCount?: number;
}) {
  const articleUrl = `${SITE_CONFIG.url}/post/${params.slug}`;
  const authorUrl = `${SITE_CONFIG.url}/leader/${params.authorUsername}`;

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${articleUrl}#article`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    headline: params.title,
    description: params.description || params.content.slice(0, 155),
    image: params.imageUrl || SITE_CONFIG.logo,
    datePublished: params.datePublished,
    dateModified: params.dateModified || params.datePublished,
    author: {
      "@type": "Person",
      "@id": `${authorUrl}#person`,
      name: params.authorName,
      url: authorUrl,
    },
    publisher: {
      "@id": `${SITE_CONFIG.url}/#organization`,
    },
    articleSection: params.categoryName,
    keywords: params.keywords?.join(", "),
    wordCount: params.content.split(/\s+/).length,
    inLanguage: "en-US",
    commentCount: params.commentCount || 0,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: params.upvoteCount || 0,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: params.commentCount || 0,
      },
    ],
  };
}

// Person/ProfilePage Schema
export function getPersonSchema(params: {
  username: string;
  name: string;
  profession?: string;
  avatarUrl?: string;
  bio?: string;
  dateJoined?: string;
}) {
  const profileUrl = `${SITE_CONFIG.url}/leader/${params.username}`;

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${profileUrl}#profilepage`,
    mainEntity: {
      "@type": "Person",
      "@id": `${profileUrl}#person`,
      name: params.name,
      alternateName: params.username,
      url: profileUrl,
      image: params.avatarUrl || SITE_CONFIG.logo,
      jobTitle: params.profession,
      description: params.bio || `${params.name} on ${SITE_CONFIG.name}`,
      sameAs: [],
    },
    dateCreated: params.dateJoined,
    inLanguage: "en-US",
  };
}

// CollectionPage Schema - For category pages
export function getCollectionPageSchema(params: {
  slug: string;
  name: string;
  description: string;
  postCount?: number;
}) {
  const categoryUrl = `${SITE_CONFIG.url}/c/${params.slug}`;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${categoryUrl}#collectionpage`,
    url: categoryUrl,
    name: params.name,
    description: params.description,
    isPartOf: {
      "@id": `${SITE_CONFIG.url}/#website`,
    },
    numberOfItems: params.postCount || 0,
    inLanguage: "en-US",
  };
}

// BreadcrumbList Schema
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ItemList Schema - For list pages like homepage feed
export function getItemListSchema(params: {
  name: string;
  url: string;
  description: string;
  items: Array<{
    url: string;
    name: string;
    position: number;
  }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: params.name,
    description: params.description,
    url: params.url,
    numberOfItems: params.items.length,
    itemListElement: params.items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      url: item.url,
      name: item.name,
    })),
  };
}

// Helper to combine multiple schemas
export function combineSchemas(...schemas: any[]) {
  return {
    "@context": "https://schema.org",
    "@graph": schemas,
  };
}
