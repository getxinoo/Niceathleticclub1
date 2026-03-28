// ── Team Images via figma:asset ───────────────────────────────────────────────
// Diese Imports werden durch vite.config.ts (figmaAssetPlugin) auf
// stabile /images/team/NAME.png Pfade aufgelöst.
// Im Figma-Make-Preview: nativ geladen ✅
// Im Build/Export:       → dist/images/team/NAME.png ✅ (einmal hochladen, fertig)
import domeFuchsImg    from 'figma:asset/284e5d8ca0e490b15fa5e6c243baade9f2c5e58b.png';
import michaelKrausImg from 'figma:asset/01e56d888ada221139d4cd3ceecf9e84c5b1b489.png';
import bellaKrausImg   from 'figma:asset/186758abe630a88bee123d9214674c4db4c0e1a3.png';
import wilhelmWalterImg from 'figma:asset/09670aeabc97c82b7de10ec256887020863e72bf.png';
import lydiTImg        from 'figma:asset/967204562f3f0d41ab9c97feb6a34996ff6af024.png';
import janaEbtImg      from 'figma:asset/99cbcf366cae64b5d24c337635adb1f9e3434879.png';
import leoHolznerImg   from 'figma:asset/40c3992dc8c9be1044ab34af0be6248aaf203465.png';

// ── Team / Trainer Data ──────────────────────────────────────────────────────
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  /** "leadership" = Geschaeftsleitung, "coach" = aktiver Trainer */
  type: "leadership" | "coach";
  specialties: string[];
  bio: string;
  image: string;
  instagram?: string;
  certifications: string[];
  /** Sichtbar auf der oeffentlichen Team-Seite? */
  visible: boolean;
}

// Alias fuer Abwaertskompatibilitaet
export type Trainer = TeamMember;

export const TEAM_MEMBERS: TeamMember[] = [
  // ── Geschaeftsleitung ────────────────────────────────────────────────────────
  {
    id: "mimi",
    name: "Michael Kraus",
    role: "Gruenderin & Visionaerin",
    type: "leadership",
    specialties: ["Unternehmensgruendung", "Brand Building", "Community"],
    bio: `Die treibende Kraft hinter dem Nice Athletic Club. Michael "Mimi" Kraus hat mit seiner Vision ein Fitness-Konzept geschaffen, das Leistung, Gemeinschaft und Premium-Qualitaet vereint – mitten in Goeppingen.`,
    image: michaelKrausImg,
    instagram: "https://www.instagram.com/mimikraus/",
    certifications: [],
    visible: true,
  },
  {
    id: "bella",
    name: "Bella Kraus",
    role: "Co-Gruenderin & Kreativdirektorin",
    type: "leadership",
    specialties: ["Kreativkonzept", "Markenstrategie", "Design"],
    bio: "Als Mitgruenderin hat Bella die Marke Nice Athletic Club massgeblich gepraegt. Ihre kreative Handschrift findet sich im gesamten Erscheinungsbild des Clubs wieder.",
    image: bellaKrausImg,
    instagram: "https://www.instagram.com/bellakraus/",
    certifications: [],
    visible: true,
  },
  {
    id: "wilhelm",
    name: "Wilhelm Walter",
    role: "Geschaeftsfuehrer & Executive Director",
    type: "leadership",
    specialties: ["Unternehmensfuehrung", "Strategie", "Operations"],
    bio: "Wilhelm leitet das operative Geschaeft des Nice Athletic Club. Mit klarem Fokus auf Qualitaet und Wachstum stellt er sicher, dass jedes Mitglied eine erstklassige Erfahrung erlebt.",
    image: wilhelmWalterImg,
    instagram: "https://www.instagram.com/mrwilllllllllson/",
    certifications: [],
    visible: true,
  },

  // ── Coaches ──────────────────────────────────────────────────────────────────
  {
    id: "dome",
    name: "Dome Fuchs",
    role: "Studioleiter & Hyrox Pro Athlete",
    type: "coach",
    specialties: ["Hyrox", "CrossFit", "Functional Training", "Athletiktraining"],
    bio: "Als Studioleiter und aktiver Hyrox-Wettkampfathlet verbindet Dome operatives Management mit Coaching auf hoechstem Niveau. Seine Hyrox- und CrossFit-Kurse sind bekannt fuer Intensitaet und Struktur.",
    image: domeFuchsImg,
    instagram: "https://www.instagram.com/dome.fu/",
    certifications: ["Hyrox Pro", "CrossFit Level 2 Trainer", "Functional Training Specialist"],
    visible: true,
  },
  {
    id: "leo",
    name: "Leo Holzner",
    role: "Hyrox & CrossFit Performance Coach",
    type: "coach",
    specialties: ["Hyrox", "CrossFit", "Wettkampfvorbereitung", "Ausdauer"],
    bio: "Leo lebt fuer den Wettkampf. Als spezialisierter Hyrox- und CrossFit-Coach bereitet er Athleten jedes Levels auf ihre Ziele vor – ob erstes Hyrox Race oder neue Bestzeit.",
    image: leoHolznerImg,
    instagram: "https://www.instagram.com/leo_holzner/",
    certifications: ["Hyrox Coach", "CrossFit Level 1 Trainer", "Ausdauertraining Lizenz"],
    visible: true,
  },
  {
    id: "jana",
    name: "Jana Ebt",
    role: "Strength & Conditioning Specialist",
    type: "coach",
    specialties: ["Kraft & Kondition", "Gewichtheben", "Mobility", "Athletiktraining"],
    bio: "Jana bringt Struktur und Wissenschaft ins Training. Ihre Staerke: individuelle Kraft- und Konditionsprogramme, die nachhaltig Ergebnisse liefern – fuer Anfaenger wie fuer Fortgeschrittene.",
    image: janaEbtImg,
    instagram: "https://www.instagram.com/janaa.ebt/",
    certifications: ["NSCA-CSCS", "Weightlifting Coach", "Mobility Specialist"],
    visible: true,
  },
  {
    id: "lydi",
    name: "Lydi Tauber",
    role: "Head Coach | CrossFit · Hyrox · Functional Training",
    type: "coach",
    specialties: ["CrossFit", "Hyrox", "Functional Training", "Gruppencoaching"],
    bio: "Lydi ist das Herz unserer Coaching-Abteilung. Als Head Coach vereint sie CrossFit, Hyrox und funktionelles Training zu einem ganzheitlichen Programm. Ihre Energie ist ansteckend, ihre Standards kompromisslos.",
    image: lydiTImg,
    instagram: "https://www.instagram.com/gymily_10/",
    certifications: ["CrossFit Level 2 Trainer", "Hyrox Coach", "Functional Training Pro"],
    visible: true,
  },
];

// ── Legacy export: TRAINERS = alle sichtbaren TeamMembers ─────────────────────
export const TRAINERS: TeamMember[] = TEAM_MEMBERS.filter((m) => m.visible);

// ── Nur Coaches (fuer Kursplan-Referenz) ──────────────────────────────────────
export const COACHES: TeamMember[] = TEAM_MEMBERS.filter((m) => m.type === "coach");

// ── Timetable Data ────────────────────────────────────────────────────────────
export type WeekDay = "Mo" | "Di" | "Mi" | "Do" | "Fr" | "Sa" | "So";

export interface TimetableEntry {
  id: string;
  title: string;
  trainer: string;
  time: string;
  duration: string;
  day: WeekDay;
  category: "CrossFit" | "Hyrox" | "Functional" | "Strength" | "Open Gym";
  spots: number;
  spotsLeft: number;
  /** Manuell gesperrt – Anmeldungen blockiert */
  locked?: boolean;
}

export const TIMETABLE: TimetableEntry[] = [
  // ── Montag ────────────────────────────────────────────────────────────────
  { id: "t1",  day: "Mo", time: "06:30", duration: "60 min", title: "CrossFit WOD",          trainer: "Lydi Tauber",  category: "CrossFit",   spots: 16, spotsLeft: 5  },
  { id: "t2",  day: "Mo", time: "08:00", duration: "60 min", title: "Functional Training",    trainer: "Jana Ebt",     category: "Functional", spots: 14, spotsLeft: 8  },
  { id: "t3",  day: "Mo", time: "10:00", duration: "60 min", title: "Hyrox Training",         trainer: "Dome Fuchs",   category: "Hyrox",      spots: 12, spotsLeft: 4  },
  { id: "t4",  day: "Mo", time: "17:00", duration: "60 min", title: "CrossFit WOD",           trainer: "Lydi Tauber",  category: "CrossFit",   spots: 16, spotsLeft: 2  },
  { id: "t5",  day: "Mo", time: "18:30", duration: "60 min", title: "Hyrox Race Prep",        trainer: "Leo Holzner",  category: "Hyrox",      spots: 12, spotsLeft: 6  },
  { id: "t6",  day: "Mo", time: "20:00", duration: "60 min", title: "Strength & Conditioning", trainer: "Jana Ebt",   category: "Strength",   spots: 12, spotsLeft: 9  },

  // ── Dienstag ───────────────────────────────────────────────────────────────
  { id: "t7",  day: "Di", time: "06:30", duration: "60 min", title: "Hyrox Training",         trainer: "Leo Holzner",  category: "Hyrox",      spots: 12, spotsLeft: 3  },
  { id: "t8",  day: "Di", time: "08:00", duration: "60 min", title: "CrossFit WOD",           trainer: "Lydi Tauber",  category: "CrossFit",   spots: 16, spotsLeft: 7  },
  { id: "t9",  day: "Di", time: "12:00", duration: "45 min", title: "Lunch Burn",             trainer: "Dome Fuchs",   category: "Functional", spots: 14, spotsLeft: 11 },
  { id: "t10", day: "Di", time: "17:30", duration: "60 min", title: "Strength & Conditioning", trainer: "Jana Ebt",   category: "Strength",   spots: 12, spotsLeft: 5  },
  { id: "t11", day: "Di", time: "19:00", duration: "60 min", title: "CrossFit WOD",           trainer: "Dome Fuchs",   category: "CrossFit",   spots: 16, spotsLeft: 0  },

  // ── Mittwoch ───────────────────────────────────────────────────────────────
  { id: "t12", day: "Mi", time: "06:30", duration: "60 min", title: "CrossFit WOD",           trainer: "Lydi Tauber",  category: "CrossFit",   spots: 16, spotsLeft: 6  },
  { id: "t13", day: "Mi", time: "09:00", duration: "60 min", title: "Hyrox Simulation",       trainer: "Leo Holzner",  category: "Hyrox",      spots: 12, spotsLeft: 2  },
  { id: "t14", day: "Mi", time: "17:00", duration: "60 min", title: "Functional Fitness",     trainer: "Jana Ebt",     category: "Functional", spots: 14, spotsLeft: 8  },
  { id: "t15", day: "Mi", time: "18:30", duration: "60 min", title: "CrossFit WOD",           trainer: "Dome Fuchs",   category: "CrossFit",   spots: 16, spotsLeft: 4  },
  { id: "t16", day: "Mi", time: "20:00", duration: "60 min", title: "Hyrox Training",         trainer: "Dome Fuchs",   category: "Hyrox",      spots: 12, spotsLeft: 7  },

  // ── Donnerstag ─────────────────────────────────────────────────────────────
  { id: "t17", day: "Do", time: "06:30", duration: "60 min", title: "Hyrox Race Prep",        trainer: "Leo Holzner",  category: "Hyrox",      spots: 12, spotsLeft: 5  },
  { id: "t18", day: "Do", time: "08:00", duration: "60 min", title: "CrossFit WOD",           trainer: "Lydi Tauber",  category: "CrossFit",   spots: 16, spotsLeft: 3  },
  { id: "t19", day: "Do", time: "17:00", duration: "60 min", title: "Strength & Conditioning", trainer: "Jana Ebt",   category: "Strength",   spots: 12, spotsLeft: 0  },
  { id: "t20", day: "Do", time: "18:30", duration: "60 min", title: "CrossFit WOD",           trainer: "Dome Fuchs",   category: "CrossFit",   spots: 16, spotsLeft: 6  },
  { id: "t21", day: "Do", time: "20:00", duration: "60 min", title: "Functional Training",    trainer: "Lydi Tauber",  category: "Functional", spots: 14, spotsLeft: 10 },

  // ── Freitag ────────────────────────────────────────────────────────────────
  { id: "t22", day: "Fr", time: "06:30", duration: "60 min", title: "CrossFit WOD",           trainer: "Lydi Tauber",  category: "CrossFit",   spots: 16, spotsLeft: 8  },
  { id: "t23", day: "Fr", time: "09:00", duration: "60 min", title: "Hyrox Training",         trainer: "Dome Fuchs",   category: "Hyrox",      spots: 12, spotsLeft: 4  },
  { id: "t24", day: "Fr", time: "12:00", duration: "45 min", title: "Lunch Burn",             trainer: "Jana Ebt",     category: "Functional", spots: 14, spotsLeft: 9  },
  { id: "t25", day: "Fr", time: "16:30", duration: "60 min", title: "Hyrox Race Prep",        trainer: "Leo Holzner",  category: "Hyrox",      spots: 12, spotsLeft: 1  },
  { id: "t26", day: "Fr", time: "18:00", duration: "60 min", title: "CrossFit WOD",           trainer: "Dome Fuchs",   category: "CrossFit",   spots: 16, spotsLeft: 5  },

  // ── Samstag ────────────────────────────────────────────────────────────────
  { id: "t27", day: "Sa", time: "09:00", duration: "75 min", title: "Hyrox Team Special",     trainer: "Dome Fuchs",   category: "Hyrox",      spots: 20, spotsLeft: 7  },
  { id: "t28", day: "Sa", time: "10:30", duration: "60 min", title: "CrossFit WOD",           trainer: "Lydi Tauber",  category: "CrossFit",   spots: 16, spotsLeft: 6  },
  { id: "t29", day: "Sa", time: "12:00", duration: "60 min", title: "Open Gym + Coaching",    trainer: "Leo Holzner",  category: "Open Gym",   spots: 20, spotsLeft: 14 },

  // ── Sonntag ────────────────────────────────────────────────────────────────
  { id: "t30", day: "So", time: "10:00", duration: "60 min", title: "CrossFit WOD",           trainer: "Lydi Tauber",  category: "CrossFit",   spots: 16, spotsLeft: 9  },
  { id: "t31", day: "So", time: "11:30", duration: "60 min", title: "Open Gym + Coaching",    trainer: "Jana Ebt",     category: "Open Gym",   spots: 20, spotsLeft: 12 },
];
