import { today, type EventItem } from './data';

export interface Filters {
  from: string;
  to: string;
  cats: string[];
  zone: string;
  inView: boolean;
  minScore: number;
}

export const defaultFilters = (): Filters => ({
  from: today(),
  to: '',
  cats: [],
  zone: '',
  inView: false,
  minScore: 1,
});

// Les filtres vivent dans l'URL pour pouvoir partager un lien « concerts à Vassivière ce week-end ».
export function readUrl(): Filters {
  const p = new URLSearchParams(location.search);
  const f = defaultFilters();
  return {
    from: p.get('du') ?? f.from,
    to: p.get('au') ?? f.to,
    cats: p.get('types')?.split(',').filter(Boolean) ?? f.cats,
    zone: p.get('zone') ?? f.zone,
    inView: p.get('vue') === '1',
    minScore: Number(p.get('score')) || f.minScore,
  };
}

export function writeUrl(f: Filters) {
  const d = defaultFilters();
  const p = new URLSearchParams();
  if (f.from !== d.from) p.set('du', f.from);
  if (f.to) p.set('au', f.to);
  if (f.cats.length) p.set('types', f.cats.join(','));
  if (f.zone) p.set('zone', f.zone);
  if (f.inView) p.set('vue', '1');
  if (f.minScore > 1) p.set('score', String(f.minScore));
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

export const endOf = (e: EventItem) => e.end_date || e.date;

export interface Bounds {
  contains(latlng: [number, number]): boolean;
}

export function matches(e: EventItem, f: Filters, bounds: Bounds | null, ignoreCats = false): boolean {
  const end = endOf(e);
  if (end < today()) return false; // les événements passés ne s'affichent jamais
  if (f.from && end < f.from) return false;
  if (f.to && e.date > f.to) return false;
  if (!ignoreCats && f.cats.length && !f.cats.includes(e.category)) return false;
  if (f.zone && e.zone !== f.zone) return false;
  if (e.score < f.minScore) return false;
  if (bounds) {
    if (e.lat == null || e.lon == null) return false;
    if (!bounds.contains([e.lat, e.lon])) return false;
  }
  return true;
}

export function activeCount(f: Filters): number {
  const d = defaultFilters();
  return [f.from !== d.from || !!f.to, f.cats.length > 0, !!f.zone || f.inView, f.minScore > 1].filter(Boolean).length;
}
