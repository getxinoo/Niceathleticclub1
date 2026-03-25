import { Helmet } from "react-helmet-async";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PageMetaProps {
  /** Page title – will be suffixed with " | Nice Athletic Club" */
  title: string;
  /** Meta description – aim for 150–160 characters */
  description: string;
  /** Canonical URL – e.g. "https://niceathleticclub.de/kurse" */
  canonical?: string;
  /** OG image URL – defaults to club hero image */
  ogImage?: string;
  /** OG type – defaults to "website" */
  ogType?: "website" | "article";
}

const SITE_NAME = "Nice Athletic Club";
const BASE_URL = "https://niceathleticclub.de";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-default.jpg`;

// ── Component ────────────────────────────────────────────────────────────────
export function PageMeta({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
}: PageMetaProps) {
  const fullTitle = `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ?? BASE_URL;

  return (
    <Helmet>
      {/* ── Primary ── */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonicalUrl} />}

      {/* ── Open Graph ── */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* ── Twitter Card ── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
