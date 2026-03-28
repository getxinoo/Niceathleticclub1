/**
 * PageMeta.tsx – Vollständige SEO-Komponente für Nice Athletic Club
 * ─────────────────────────────────────────────────────────────────────────────
 * Unterstützt:
 *  • Meta Title & Description (optimiert für 2026 Best Practices)
 *  • Canonical URL
 *  • Open Graph (Facebook, LinkedIn, WhatsApp)
 *  • Twitter Card (X)
 *  • Robots-Direktiven (noindex, nofollow, noarchive)
 *  • JSON-LD Structured Data (beliebig viele Schemas)
 *  • Hreflang (optional)
 *  • Preconnect / DNS-Prefetch Hints
 */

import { Helmet } from 'react-helmet-async';
import { SITE_URL, SITE_NAME } from '../../../lib/schema';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PageMetaProps {
  /** Seiten-Titel – wird mit " | Nice Athletic Club" gesuffixed */
  title: string;
  /** Meta Description – Ziel: 145–158 Zeichen */
  description: string;
  /** Canonical URL – absolut, z.B. "https://nicefitness.de/kurse" */
  canonical?: string;
  /** OG-Bild – absoluter URL, 1200×630px empfohlen */
  ogImage?: string;
  /** OG-Typ */
  ogType?: 'website' | 'article';
  /** JSON-LD Schemas – Array von schema.org Objekten */
  schemas?: object[];
  /**
   * Robots-Direktiven:
   *  - undefined / 'index' → normale Indexierung (Standard)
   *  - 'noindex'           → Seite nicht indexieren (Login, Admin, Member)
   *  - 'noindex,nofollow'  → weder indexieren noch Links folgen
   */
  robots?: 'index' | 'noindex' | 'noindex,nofollow';
  /** Alternativ-URL für Hreflang */
  hreflangDe?: string;
}

const DEFAULT_OG_IMAGE = `${SITE_URL}/images/studio/entrance.png`;

// ── Component ────────────────────────────────────────────────────────────────
export function PageMeta({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  schemas,
  robots = 'index',
  hreflangDe,
}: PageMetaProps) {
  const fullTitle   = `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical ?? SITE_URL;

  return (
    <Helmet>
      {/* ── Primary ─────────────────────────────────────────────────────── */}
      <title>{fullTitle}</title>
      <meta name="description"          content={description} />
      <meta name="robots"               content={robots === 'index' ? 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1' : robots} />
      <link rel="canonical"             href={canonicalUrl} />

      {/* ── Language & Geo ──────────────────────────────────────────────── */}
      <meta httpEquiv="content-language" content="de" />
      <meta name="language"              content="German" />
      <meta name="geo.region"            content="DE-BW" />
      <meta name="geo.placename"         content="Göppingen" />
      <meta name="geo.position"          content="48.7059;9.6538" />
      <meta name="ICBM"                  content="48.7059, 9.6538" />

      {/* ── Open Graph ──────────────────────────────────────────────────── */}
      <meta property="og:site_name"      content={SITE_NAME} />
      <meta property="og:title"          content={fullTitle} />
      <meta property="og:description"    content={description} />
      <meta property="og:type"           content={ogType} />
      <meta property="og:url"            content={canonicalUrl} />
      <meta property="og:image"          content={ogImage} />
      <meta property="og:image:width"    content="1200" />
      <meta property="og:image:height"   content="630" />
      <meta property="og:image:alt"      content={`${SITE_NAME} – ${title}`} />
      <meta property="og:locale"         content="de_DE" />

      {/* ── Twitter / X Card ────────────────────────────────────────────── */}
      <meta name="twitter:card"          content="summary_large_image" />
      <meta name="twitter:site"          content="@niceathleticclub" />
      <meta name="twitter:title"         content={fullTitle} />
      <meta name="twitter:description"   content={description} />
      <meta name="twitter:image"         content={ogImage} />

      {/* ── Hreflang (falls vorhanden) ───────────────────────────────────── */}
      {hreflangDe && <link rel="alternate" hrefLang="de" href={hreflangDe} />}
      {hreflangDe && <link rel="alternate" hrefLang="x-default" href={hreflangDe} />}

      {/* ── Performance Hints ───────────────────────────────────────────── */}
      <link rel="preconnect"    href="https://fonts.gstatic.com" />
      <link rel="dns-prefetch"  href="https://www.google-analytics.com" />
      <link rel="dns-prefetch"  href="https://maps.googleapis.com" />

      {/* ── JSON-LD Structured Data ─────────────────────────────────────── */}
      {schemas?.map((schema, i) => (
        <script
          key={`schema-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema, null, 0) }}
        />
      ))}
    </Helmet>
  );
}
