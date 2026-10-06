import zonesJson from '../config/zones.json';

export interface Zone {
  id: string;
  name: string;
  query: string;
  lat: number;
  lon: number;
  radius_km: number;
}

export interface EventItem {
  id: string;
  zone: string;
  title: string;
  /** AAAA-MM-JJ, premier jour */
  date: string;
  /** AAAA-MM-JJ inclus, pour les événements sur plusieurs jours (expo…) */
  end_date?: string | null;
  /** HH:MM */
  time?: string | null;
  venue?: string | null;
  town?: string | null;
  lat?: number | null;
  lon?: number | null;
  description?: string | null;
  category: string;
  organizer_type?: string | null;
  score: number;
  score_reason?: string | null;
  confidence?: 'haute' | 'moyenne' | 'faible' | null;
  source_url: string;
  other_sources?: string[];
}

export interface Dataset {
  generated_at: string;
  events: EventItem[];
}

export const ZONES: Zone[] = zonesJson;

export const CATEGORIES = [
  { id: 'concert', label: 'Concert', color: '#d6336c' },
  { id: 'soiree-bar', label: 'Soirée / bar', color: '#7048e8' },
  { id: 'marche', label: 'Marché', color: '#2f9e44' },
  { id: 'fete-festival', label: 'Fête / festival', color: '#e8590c' },
  { id: 'sport', label: 'Sport', color: '#1c7ed6' },
  { id: 'culture-expo', label: 'Culture / expo', color: '#ae3ec9' },
  { id: 'nature-sortie', label: 'Nature / sortie', color: '#0b7285' },
  { id: 'enfants-famille', label: 'Enfants / famille', color: '#f08c00' },
  { id: 'vide-grenier', label: 'Vide-grenier', color: '#8d6e63' },
  { id: 'autre', label: 'Autre', color: '#6c757d' },
];

export function category(id: string) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export async function loadDataset(): Promise<Dataset> {
  const res = await fetch(`${import.meta.env.BASE_URL}events.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`events.json : HTTP ${res.status}`);
  return res.json();
}

// --- Dates (toujours en heure locale, format ISO AAAA-MM-JJ) ---

export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00`);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

export const today = () => isoDate(new Date());

/** Samedi–dimanche à venir (ou en cours). */
export function weekend(): [string, string] {
  const t = today();
  const dow = new Date(`${t}T12:00`).getDay(); // 0 = dimanche
  if (dow === 0) return [t, t];
  const sat = addDays(t, 6 - dow);
  return [dow === 6 ? t : sat, addDays(sat, 1)];
}

export function formatDay(iso: string): string {
  const s = new Date(`${iso}T12:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShort(iso: string): string {
  return new Date(`${iso}T12:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function escapeHtml(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** N'accepte que les liens http(s), pour ne pas injecter de javascript: venant des données. */
export function safeUrl(u: string | null | undefined): string {
  return u && /^https?:\/\//i.test(u) ? escapeHtml(u) : '#';
}
