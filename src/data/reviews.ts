/**
 * reviews.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Google Reviews Daten – wird sowohl im Frontend als auch im Admin verwendet.
 * Echte Daten kommen spaeter per PHP-API aus der DB.
 */

export interface GoogleReview {
  id: string;
  author: string;
  rating: number;          // 1–5
  text: string;
  /** ISO date string */
  publishedAt: string;
  /** Google profile photo URL (optional) */
  profilePhoto?: string;
  /** Whether to show on frontend */
  visible: boolean;
  /** Source identifier */
  source: "google";
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>; // 1-5 -> count
  lastSyncedAt: string | null;
}

// ── Mock Reviews (echte Google-Rezensionen vom NAC) ──────────────────────────
export const MOCK_REVIEWS: GoogleReview[] = [
  {
    id: "rev-001",
    author: "Marc D.",
    rating: 5,
    text: "Bin seit etwa einem Jahr im Nice Athletic Club und kann das Studio jedem nur weiter empfehlen. Top Geräte auch um eine Crossfit bzw. Hyrox-Session zu starten.",
    publishedAt: "2025-11-15T10:00:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-002",
    author: "Carsten D.",
    rating: 5,
    text: "Schönes Studio. Freundliches Team. Tolle Geräte.",
    publishedAt: "2025-10-22T14:30:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-003",
    author: "Carl Wheezer",
    rating: 5,
    text: "In der Region meiner Meinung nach das beste Studio. Die Ausstattung ist offensichtlich von jemandem ausgewählt worden der sich damit auskennt.",
    publishedAt: "2025-09-18T09:15:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-004",
    author: "Simon Oechsle",
    rating: 5,
    text: "Studioleiter Willi ist wirklich ein ganz feiner Kerl! Er führt das NICE voller Herzblut und hat für jeden ein offenes Ohr und ist immer lösungsorientiert.",
    publishedAt: "2025-08-12T16:45:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-005",
    author: "Sonic The Hedgehog",
    rating: 5,
    text: "Ein Hammer Fitness-Studio mit sehr freundlichem Personal modernen Geräten. Hier wird alles sehr kompetent gehandhabt. Das beste Fitnessstudio in dem ich bisher war.",
    publishedAt: "2025-07-30T11:20:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-006",
    author: "Selcuk C.",
    rating: 5,
    text: "Top Studio! Erstaunlich, was aus der alten Fabrikhalle geworden ist, modern trifft auf Retro.",
    publishedAt: "2025-07-05T08:00:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-007",
    author: "Michael Karp",
    rating: 5,
    text: "Absolut empfehlenswert! Professionelles Equipment, top Atmosphäre und ein Team, das sich wirklich um seine Mitglieder kümmert.",
    publishedAt: "2025-06-20T19:30:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-008",
    author: "Sven Kümmel",
    rating: 5,
    text: "Um es auf den Punkt zu bringen: es ist einfach überragend Nice!!!!!",
    publishedAt: "2025-06-10T13:00:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-009",
    author: "Johnny",
    rating: 4,
    text: "Zwar wirklich das top Studio in der Region oder vielleicht sogar fast deutschlandweit mit ein paar anderen Gyms.",
    publishedAt: "2025-05-28T15:45:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-010",
    author: "Thomas R.",
    rating: 5,
    text: "Bestes Gym in Göppingen und Umgebung! Die CrossFit Box ist der Hammer, die Trainer sind super motiviert und die Community ist einfach genial.",
    publishedAt: "2025-05-15T10:30:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-011",
    author: "Laura M.",
    rating: 5,
    text: "Ich trainiere seit 6 Monaten hier und bin begeistert. Die Geräte sind top, das Studio ist sauber und das Team immer hilfsbereit. Der HYROX-Bereich ist einzigartig!",
    publishedAt: "2025-04-22T17:00:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-012",
    author: "Markus W.",
    rating: 5,
    text: "Fantastisches Studio mit einer unglaublichen Atmosphäre. Die Trainer kennen sich wirklich aus und gehen auf jeden individuell ein.",
    publishedAt: "2025-04-10T09:00:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-013",
    author: "Sandra K.",
    rating: 5,
    text: "Endlich ein Studio, das hält was es verspricht! Premium Equipment, motivierte Trainer und eine mega Community. Die Theke ist auch top!",
    publishedAt: "2025-03-28T14:15:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-014",
    author: "Patrick H.",
    rating: 5,
    text: "Das Nice Athletic Club ist mit Abstand das beste Fitnessstudio in der Region. Die Vielfalt an Trainingsmöglichkeiten ist beeindruckend.",
    publishedAt: "2025-03-15T11:30:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-015",
    author: "Nina F.",
    rating: 4,
    text: "Tolles Studio, super Ausstattung. Manchmal zu den Stoßzeiten etwas voll, aber insgesamt ein top Erlebnis. Die Sauna ist ein echtes Highlight.",
    publishedAt: "2025-03-01T16:00:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-016",
    author: "Alexander B.",
    rating: 5,
    text: "1.500 qm pures Fitness-Erlebnis! Von CrossFit über HYROX bis hin zum klassischen Krafttraining – hier findet jeder sein perfektes Workout.",
    publishedAt: "2025-02-18T08:45:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-017",
    author: "Jessica L.",
    rating: 5,
    text: "Ich bin durch eine Freundin hierher gekommen und sofort Mitglied geworden. Die Atmosphäre, die Leute und die Möglichkeiten sind einfach unschlagbar.",
    publishedAt: "2025-02-05T12:00:00Z",
    visible: true,
    source: "google",
  },
  {
    id: "rev-018",
    author: "Daniel S.",
    rating: 5,
    text: "Perfektes Studio für alle, die ernsthaft trainieren wollen. Die Trainer sind alle zertifiziert und wissen genau, was sie tun. Preis-Leistung ist top!",
    publishedAt: "2025-01-20T18:30:00Z",
    visible: true,
    source: "google",
  },
];

export const MOCK_REVIEW_STATS: ReviewStats = {
  averageRating: 4.9,
  totalReviews: 84,
  ratingDistribution: { 5: 76, 4: 6, 3: 1, 2: 0, 1: 1 },
  lastSyncedAt: "2026-03-10T08:00:00Z",
};
