// ── Classes / Programs Data ──────────────────────────────────────────────────
export interface FitnessClass {
  id: string;
  title: string;
  category: string;
  duration: string;
  intensity: "Low" | "Medium" | "High" | "Elite";
  description: string;
  image: string;
}

export const FITNESS_CLASSES: FitnessClass[] = [
  {
    id: "crossfit",
    title: "CrossFit WOD",
    category: "CrossFit",
    duration: "60 min",
    intensity: "Elite",
    description: "Taeglich wechselnde Workouts of the Day – functional Movements, hohe Intensitaet, zertifizierte Coaches. Fuer alle Level.",
    image: "https://images.unsplash.com/photo-1758875568582-ec8a4229c2b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  },
  {
    id: "hyrox",
    title: "Hyrox Training",
    category: "Hyrox",
    duration: "60 min",
    intensity: "Elite",
    description: "Gezielte Vorbereitung auf Hyrox-Wettkaempfe: Running, Sled Push/Pull, Burpee Broad Jumps, Wall Balls und mehr.",
    image: "https://images.unsplash.com/photo-1620123804851-70e94c55e84a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  },
  {
    id: "functional",
    title: "Functional Training",
    category: "Functional",
    duration: "60 min",
    intensity: "High",
    description: "Ganzkoerpertraining mit funktionellen Bewegungen. Kettlebells, Bodyweight, Rigs – Training das im Alltag ankommt.",
    image: "https://images.unsplash.com/photo-1763403921315-f2ef8697199f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  },
  {
    id: "strength",
    title: "Strength & Conditioning",
    category: "Kraft",
    duration: "60 min",
    intensity: "High",
    description: "Strukturiertes Krafttraining mit progressivem Overload. Squats, Deadlifts, Presses – wissenschaftlich fundiert.",
    image: "https://images.unsplash.com/photo-1700784795176-7ff886439d79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
  },
];

// ── NEW: Modular Pricing System ──────────────────────────────────────────────

/** Base membership plan */
export interface BasePlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  highlight: boolean;
  badge?: string;
  features: string[];
  cta: string;
  restrictions?: string;
  blaulichtDiscount?: number;
  studentPrice?: number;
  sortOrder: number;
}

/** Add-on option (e.g. "1x pro Woche" for 20€) */
export interface AddOnOption {
  label: string;
  price: number;
}

/** Add-on that can be added to base plans */
export interface AddOn {
  id: string;
  name: string;
  options: AddOnOption[];
  description?: string;
  sortOrder: number;
}

/** Full pricing config */
export interface PricingData {
  basePlans: BasePlan[];
  addOns: AddOn[];
  contractNote: string;
  blaulichtNote: string;
}

// ── Default Data ─────────────────────────────────────────────────────────────

export const DEFAULT_BASE_PLANS: BasePlan[] = [
  {
    id: "athletic-weekend",
    name: "Athletic Weekend",
    price: 39,
    period: "pro Monat",
    description: "Das Athletic Paket zum reduzierten Preis – nur am Wochenende. Freitag bis Sonntag, 5:00–00:00 Uhr.",
    highlight: false,
    restrictions: "Nur Wochenende: Freitag bis Sonntag, 5:00–00:00 Uhr",
    features: [
      "Alles aus dem Athletic Paket",
      "Training Fr–So, 5:00–00:00 Uhr",
    ],
    cta: "Jetzt starten",
    sortOrder: 0,
  },
  {
    id: "athletic",
    name: "Athletic",
    price: 69,
    period: "pro Monat",
    description: "Dein Basis-Paket: Freies Training auf über 1.500 qm mit allen Geräten und Freiflächen. Täglich von 5:00 bis 00:00 Uhr.",
    highlight: false,
    studentPrice: 49,
    features: [
      "Freies Training täglich 5:00–00:00",
      "Alle Geräte & Freiflächen",
      "1.500+ qm Trainingsfläche",
      "NAC App-Zugang",
    ],
    cta: "Jetzt starten",
    blaulichtDiscount: 10,
    sortOrder: 1,
  },
  {
    id: "nicest",
    name: "Nicest",
    price: 104,
    period: "pro Monat",
    description: "Alles aus dem Athletic Paket – plus Zugang zum Nice Fitness & Spa in Eislingen mit E-Gym, Sauna, Solarium, Massageliege und Kursen.",
    highlight: true,
    badge: "Der Klassiker",
    features: [
      "Alles aus dem Athletic Paket",
      "Training im Nice Fitness & Spa Eislingen",
      "E-Gym Zugang",
      "Sauna & Solarium",
      "Massageliege",
      "Kurse in Eislingen",
    ],
    cta: "Nicest werden",
    blaulichtDiscount: 10,
    sortOrder: 2,
  },
  {
    id: "athletic-unlimited",
    name: "Athletic + Unlimited",
    price: 119,
    period: "pro Monat",
    description: "Alles aus dem Athletic Paket – plus unbegrenzte CrossFit- und HYROX-Kurse. Train without limits.",
    highlight: false,
    features: [
      "Alles aus dem Athletic Paket",
      "Unlimited CrossFit Kurse",
      "Unlimited HYROX Kurse",
    ],
    cta: "Jetzt starten",
    blaulichtDiscount: 10,
    sortOrder: 3,
  },
];

export const DEFAULT_ADDONS: AddOn[] = [
  {
    id: "crossfit-hyrox",
    name: "CrossFit / HYROX Kurse",
    options: [
      { label: "1× pro Woche", price: 20 },
      { label: "2× pro Woche", price: 30 },
      { label: "Unlimited", price: 50 },
    ],
    description: "Zugang zu allen CrossFit- und HYROX-Kursen. Wird auf den Athletic-Grundpreis aufgerechnet.",
    sortOrder: 0,
  },
  {
    id: "sauna",
    name: "Sauna",
    options: [
      { label: "Sauna-Zugang", price: 10 },
    ],
    description: "Sauna-Nutzung im Nice Fitness & Spa Eislingen.",
    sortOrder: 1,
  },
];

export const DEFAULT_CONTRACT_NOTE = "Alle Verträge haben keine Mindestlaufzeit und sind monatlich kündbar.";
export const DEFAULT_BLAULICHT_NOTE = "Blaulicht-Kräfte (Feuerwehr, Polizei, Rettungsdienst) erhalten 10 € Rabatt auf die Tarife Athletic und Nicest.";

export const DEFAULT_PRICING_DATA: PricingData = {
  basePlans: DEFAULT_BASE_PLANS,
  addOns: DEFAULT_ADDONS,
  contractNote: DEFAULT_CONTRACT_NOTE,
  blaulichtNote: DEFAULT_BLAULICHT_NOTE,
};

// ── Legacy: Keep MEMBERSHIP_PLANS for backward compat ────────────────────────
// Some components may still reference this. It now derives from the new model.
export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  laufzeit: string;
  highlight: boolean;
  badge?: string;
  description: string;
  studentPrice?: number;
  features: string[];
  cta: string;
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = DEFAULT_BASE_PLANS.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  period: p.period,
  laufzeit: "Monatlich kündbar",
  highlight: p.highlight,
  badge: p.badge,
  description: p.description,
  studentPrice: p.studentPrice,
  features: p.features,
  cta: p.cta,
}));

// ── Stats ───────────────────────────────────────────────────────────────────
export const STATS = [
  { value: "1.500+", label: "qm Trainingsfläche" },
  { value: "38", label: "Kurse pro Woche" },
  { value: "10", label: "Zertifizierte Trainer" },
  { value: "6", label: "Jahre Excellence" },
];