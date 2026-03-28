/**
 * schema.ts – Schema.org JSON-LD Helpers für Nice Athletic Club
 * ─────────────────────────────────────────────────────────────────────────────
 * Alle strukturierten Daten (Google Rich Results, EEAT, Local SEO)
 * zentral definiert. Einfach in PageMeta via <schema> prop übergeben.
 *
 * Quellen:
 *  • https://schema.org/SportsActivityLocation
 *  • https://schema.org/GymOrHealthClub
 *  • https://schema.org/LocalBusiness
 *  • https://developers.google.com/search/docs/appearance/structured-data
 */

export const SITE_URL   = 'https://nicefitness.de';
export const SITE_NAME  = 'Nice Athletic Club';
export const SITE_NAME_SHORT = 'NAC';

// ── Stammdaten ────────────────────────────────────────────────────────────────
export const NAC_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress:   'Robert-Bosch-Straße 5',
  addressLocality: 'Göppingen',
  postalCode:      '73037',
  addressCountry:  'DE',
};

export const NAC_GEO = {
  '@type':    'GeoCoordinates',
  latitude:   48.7059,
  longitude:  9.6538,
};

export const NAC_OPENING_HOURS = [
  'Mo-Fr 06:00-23:00',
  'Sa-Su 08:00-21:00',
];

// ── 1. LocalBusiness / GymOrHealthClub (globaler Basis-Schema) ────────────────
export function buildGymSchema() {
  return {
    '@context':    'https://schema.org',
    '@type':       ['GymOrHealthClub', 'SportsActivityLocation', 'LocalBusiness'],
    '@id':         `${SITE_URL}/#gym`,
    name:          SITE_NAME,
    alternateName: ['NAC Göppingen', 'Nice Fitness Göppingen', 'Nice Athletic Club Göppingen'],
    url:           SITE_URL,
    logo: {
      '@type':    'ImageObject',
      url:        `${SITE_URL}/images/logo/nac-logo.png`,
      width:      '400',
      height:     '120',
    },
    image:            `${SITE_URL}/images/studio/entrance.png`,
    description:
      'Nice Athletic Club in Göppingen – Premium-Fitnessstudio mit CrossFit-Box, ' +
      'HYROX-Zone, Athletic Area, persönlichen Trainern und Nice Theke. ' +
      'Moderne Industriehallen-Atmosphäre für maximale Performance.',
    telephone:        '+4971619163663',
    email:            'info@nicefitness.de',
    vatID:            'DE320247039',
    address:          NAC_ADDRESS,
    geo:              NAC_GEO,
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '06:00', closes: '23:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday','Sunday'], opens: '08:00', closes: '21:00' },
    ],
    priceRange:       '€€',
    currenciesAccepted: 'EUR',
    paymentAccepted:  'Cash, Credit Card, SEPA',
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'CrossFit-Box',        value: true },
      { '@type': 'LocationFeatureSpecification', name: 'HYROX-Zone',          value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Athletic Area',        value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Personal Training',    value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Nice Theke & Café',    value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Duschen & Umkleiden',  value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Kinderbetreuung',      value: true },
      { '@type': 'LocationFeatureSpecification', name: 'EGYM Wellpass',        value: true },
    ],
    sameAs: [
      'https://www.instagram.com/nice_athletic_club/',
      'https://www.facebook.com/niceathleticclub/',
      'https://nice-fitness.de',
    ],
    hasMap: 'https://maps.google.com/?q=Robert-Bosch-Straße+5,+73037+Göppingen',
    areaServed: [
      { '@type': 'City', name: 'Göppingen' },
      { '@type': 'City', name: 'Eislingen' },
      { '@type': 'City', name: 'Geislingen' },
      { '@type': 'City', name: 'Süßen' },
    ],
    knowsAbout: [
      'CrossFit','HYROX','Krafttraining','Functional Fitness',
      'Personal Training','Gruppentraining','Ernährungsberatung',
    ],
  };
}

// ── 2. WebSite mit SearchAction ───────────────────────────────────────────────
export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type':    'WebSite',
    '@id':      `${SITE_URL}/#website`,
    url:        SITE_URL,
    name:       SITE_NAME,
    description: 'Premium-Fitnessstudio in Göppingen – CrossFit, HYROX, Athletic Training',
    inLanguage:  'de-DE',
    potentialAction: {
      '@type':       'SearchAction',
      target:        `${SITE_URL}/kurse?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
    publisher: { '@id': `${SITE_URL}/#gym` },
  };
}

// ── 3. BreadcrumbList ─────────────────────────────────────────────────────────
export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context':     'https://schema.org',
    '@type':        'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Startseite', item: SITE_URL },
      ...items.map((item, i) => ({
        '@type':    'ListItem',
        position:   i + 2,
        name:       item.name,
        item:       item.url,
      })),
    ],
  };
}

// ── 4. FAQPage ───────────────────────────────────────────────────────────────
export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context':      'https://schema.org',
    '@type':         'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name:    faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text:    faq.answer,
      },
    })),
  };
}

// ── 5. SportsEvent / Kurs-Schema ─────────────────────────────────────────────
export function buildSportsEventSchema(opts: {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'SportsEvent',
    name:         opts.name,
    description:  opts.description,
    startDate:    opts.startDate,
    endDate:      opts.endDate,
    location: {
      '@type':  'Place',
      name:     `${SITE_NAME} – ${opts.location ?? 'Göppingen'}`,
      address:  NAC_ADDRESS,
    },
    organizer: { '@id': `${SITE_URL}/#gym` },
    offers: {
      '@type':          'Offer',
      price:            '0',
      priceCurrency:    'EUR',
      availability:     'https://schema.org/InStock',
      validFrom:        new Date().toISOString().split('T')[0],
      url:              `${SITE_URL}/kurse`,
    },
  };
}

// ── 6. Service-Schema (für Personal Training, CrossFit etc.) ─────────────────
export function buildServiceSchema(opts: {
  name: string;
  description: string;
  url: string;
  image?: string;
  priceRange?: string;
}) {
  return {
    '@context':    'https://schema.org',
    '@type':       'Service',
    serviceType:   opts.name,
    name:          opts.name,
    description:   opts.description,
    url:           opts.url,
    image:         opts.image,
    provider:      { '@id': `${SITE_URL}/#gym` },
    areaServed: {
      '@type':     'City',
      name:        'Göppingen',
    },
    offers: {
      '@type':        'Offer',
      priceRange:     opts.priceRange ?? '€€',
      priceCurrency:  'EUR',
    },
  };
}

// ── 7. Person-Schema (Trainer/Team-Mitglieder) ────────────────────────────────
export function buildPersonSchema(opts: {
  name: string;
  jobTitle: string;
  image?: string;
  description?: string;
  sameAs?: string[];
}) {
  return {
    '@context':   'https://schema.org',
    '@type':      'Person',
    name:         opts.name,
    jobTitle:     opts.jobTitle,
    image:        opts.image,
    description:  opts.description,
    worksFor:     { '@id': `${SITE_URL}/#gym` },
    sameAs:       opts.sameAs ?? [],
  };
}

// ── 8. Review / AggregateRating ───────────────────────────────────────────────
export function buildAggregateRatingSchema(opts: {
  ratingValue: number;
  reviewCount: number;
}) {
  return {
    '@context':       'https://schema.org',
    '@type':          'GymOrHealthClub',
    '@id':            `${SITE_URL}/#gym`,
    name:             SITE_NAME,
    aggregateRating: {
      '@type':        'AggregateRating',
      ratingValue:    opts.ratingValue.toString(),
      bestRating:     '5',
      worstRating:    '1',
      reviewCount:    opts.reviewCount.toString(),
    },
  };
}
