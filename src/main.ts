import './style.css';
import {
  CATEGORIES, ZONES, addDays, category, escapeHtml, formatDay, formatShort, loadDataset, safeUrl, today, weekend,
  type EventItem,
} from './data';
import { activeCount, defaultFilters, endOf, matches, readUrl, writeUrl, type Filters } from './filters';
import { EventMap } from './map';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const el = {
  from: $<HTMLInputElement>('#from'),
  to: $<HTMLInputElement>('#to'),
  cats: $('#cats'),
  zone: $<HTMLSelectElement>('#zone'),
  inView: $<HTMLInputElement>('#inview'),
  score: $<HTMLSelectElement>('#score'),
  list: $('#list'),
  summary: $('#summary'),
  updated: $('#updated'),
  toggle: $<HTMLButtonElement>('#toggle-filters'),
  countTab: $('#count-tab'),
};

let filters: Filters = readUrl();
let events: EventItem[] = [];
const zoneName = (id: string) => ZONES.find((z) => z.id === id)?.name ?? id;

const eventMap = new EventMap($('#map'), () => {
  if (filters.inView) render();
});

// --- Construction des contrôles ---

for (const z of ZONES) el.zone.add(new Option(z.name, z.id));

el.cats.innerHTML = CATEGORIES.map(
  (c) => `<button type="button" class="chip" data-cat="${c.id}" style="--c:${c.color}">
    <i></i>${escapeHtml(c.label)} <span class="n"></span></button>`,
).join('');

function syncControls() {
  el.from.value = filters.from;
  el.to.value = filters.to;
  el.zone.value = filters.zone;
  el.inView.checked = filters.inView;
  el.score.value = String(filters.minScore);
  for (const b of el.cats.querySelectorAll<HTMLElement>('.chip')) {
    b.classList.toggle('on', filters.cats.includes(b.dataset.cat!));
  }
  const n = activeCount(filters);
  el.toggle.textContent = n ? `Filtres (${n})` : 'Filtres';
}

function update(patch: Partial<Filters>) {
  filters = { ...filters, ...patch };
  writeUrl(filters);
  syncControls();
  render();
}

el.from.addEventListener('change', () => update({ from: el.from.value || today() }));
el.to.addEventListener('change', () => update({ to: el.to.value }));
el.score.addEventListener('change', () => update({ minScore: Number(el.score.value) }));
el.inView.addEventListener('change', () => update({ inView: el.inView.checked }));
el.zone.addEventListener('change', () => {
  update({ zone: el.zone.value });
  eventMap.fitZones(filters.zone ? ZONES.filter((z) => z.id === filters.zone) : ZONES);
});

el.cats.addEventListener('click', (ev) => {
  const b = (ev.target as HTMLElement).closest<HTMLElement>('.chip');
  if (!b) return;
  const id = b.dataset.cat!;
  update({ cats: filters.cats.includes(id) ? filters.cats.filter((c) => c !== id) : [...filters.cats, id] });
});

$('#date-presets').addEventListener('click', (ev) => {
  const p = (ev.target as HTMLElement).closest<HTMLElement>('[data-preset]')?.dataset.preset;
  if (!p) return;
  const t = today();
  if (p === 'today') update({ from: t, to: t });
  else if (p === 'weekend') {
    const [from, to] = weekend();
    update({ from, to });
  } else if (p === 'all') update({ from: t, to: '' });
  else update({ from: t, to: addDays(t, Number(p) - 1) });
});

$('#reset').addEventListener('click', () => {
  update(defaultFilters());
  eventMap.fitZones(ZONES);
});

// Mobile : panneau de filtres repliable + onglets Carte / Liste
el.toggle.addEventListener('click', () => document.body.classList.toggle('filters-open'));
$('.tabs').addEventListener('click', (ev) => {
  const tab = (ev.target as HTMLElement).closest<HTMLElement>('[data-tab]')?.dataset.tab;
  if (tab) showTab(tab);
});

function showTab(tab: string) {
  document.body.dataset.tab = tab;
  for (const b of document.querySelectorAll<HTMLElement>('.tabs [data-tab]')) {
    b.classList.toggle('active', b.dataset.tab === tab);
  }
  if (tab === 'map') eventMap.refreshSize();
}

el.list.addEventListener('click', (ev) => {
  const t = ev.target as HTMLElement;
  if (t.closest('a')) return;
  const li = t.closest<HTMLElement>('[data-id]');
  if (!li) return;
  if (getComputedStyle($('.tabs')).display !== 'none') showTab('map');
  eventMap.focus(li.dataset.id!);
});

// --- Rendu ---

function whenText(e: EventItem): string {
  const parts = [];
  if (e.end_date && e.end_date !== e.date) parts.push(`du ${formatShort(e.date)} au ${formatShort(e.end_date)}`);
  if (e.time) parts.push(e.time.replace(':', 'h'));
  return parts.join(' · ');
}

const scoreDots = (s: number) => `<span class="score" title="Intérêt ${s}/5">${'●'.repeat(s)}${'○'.repeat(5 - s)}</span>`;

function osmUrl(e: EventItem): string | null {
  if (e.lat == null || e.lon == null) return null;
  return `https://www.openstreetmap.org/?mlat=${e.lat}&mlon=${e.lon}#map=17/${e.lat}/${e.lon}`;
}

function popupHtml(e: EventItem): string {
  const c = category(e.category);
  const osm = osmUrl(e);
  return `<div class="pop">
    <div class="cat" style="--c:${c.color}">${escapeHtml(c.label)}</div>
    <h3>${escapeHtml(e.title)}</h3>
    <p class="when">${escapeHtml(formatDay(e.date))}${whenText(e) ? ' · ' + escapeHtml(whenText(e)) : ''}</p>
    <p class="where">${escapeHtml([e.venue, e.town].filter(Boolean).join(', '))}</p>
    ${e.description ? `<p>${escapeHtml(e.description)}</p>` : ''}
    <p>${scoreDots(e.score)} <small>${escapeHtml(e.score_reason)}</small></p>
    ${e.confidence && e.confidence !== 'haute' ? `<p class="warn">Fiabilité ${escapeHtml(e.confidence)} : vérifiez auprès de la source.</p>` : ''}
    <p class="links"><a href="${safeUrl(e.source_url)}" target="_blank" rel="noopener">Source</a>
    ${osm ? ` · <a href="${osm}" target="_blank" rel="noopener">Voir sur OpenStreetMap</a>` : ''}</p>
  </div>`;
}

function itemHtml(e: EventItem): string {
  const c = category(e.category);
  const where = [e.venue, e.town].filter(Boolean).join(', ');
  return `<li class="item${e.lat == null ? ' nomap' : ''}" data-id="${escapeHtml(e.id)}" style="--c:${c.color}">
    <div class="meta"><span class="cat">${escapeHtml(c.label)}</span>${scoreDots(e.score)}</div>
    <h3>${escapeHtml(e.title)}</h3>
    <p class="when">${escapeHtml(whenText(e))}${whenText(e) && where ? ' · ' : ''}${escapeHtml(where)}</p>
    ${e.description ? `<p class="desc">${escapeHtml(e.description)}</p>` : ''}
    <p class="links"><a href="${safeUrl(e.source_url)}" target="_blank" rel="noopener">Source</a>
      <span class="zone">${escapeHtml(zoneName(e.zone))}</span>
      ${e.lat == null ? '<span class="zone">non localisé</span>' : ''}</p>
  </li>`;
}

function render() {
  const bounds = filters.inView ? eventMap.bounds : null;
  const shown = events.filter((e) => matches(e, filters, bounds));

  // Comptes par type, calculés avec tous les autres filtres actifs
  const counts = new Map<string, number>();
  for (const e of events) {
    if (matches(e, filters, bounds, true)) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  }
  for (const b of el.cats.querySelectorAll<HTMLElement>('.chip')) {
    const n = counts.get(b.dataset.cat!) ?? 0;
    b.querySelector('.n')!.textContent = String(n);
    b.classList.toggle('empty', n === 0);
  }

  eventMap.setEvents(shown, popupHtml);

  // Liste groupée par jour ; un événement sur plusieurs jours apparaît au premier jour visible
  const start = (e: EventItem) => [e.date, filters.from, today()].reduce((a, b) => (b > a ? b : a));
  const sorted = [...shown].sort(
    (a, b) => start(a).localeCompare(start(b)) || (a.time ?? '99').localeCompare(b.time ?? '99') || b.score - a.score,
  );
  let html = '';
  let day = '';
  for (const e of sorted) {
    const d = start(e);
    if (d !== day) {
      if (day) html += '</ol></li>';
      html += `<li class="day"><h2>${escapeHtml(formatDay(d))}</h2><ol>`;
      day = d;
    }
    html += itemHtml(e);
  }
  if (day) html += '</ol></li>';
  el.list.innerHTML = html || '<li class="none">Aucun événement ne correspond à ces filtres.</li>';

  const n = shown.length;
  el.summary.textContent = `${n} événement${n > 1 ? 's' : ''}`;
  el.countTab.textContent = `(${n})`;
}

// --- Démarrage ---

syncControls();
showTab('map');
if (filters.zone) eventMap.fitZones(ZONES.filter((z) => z.id === filters.zone));
else eventMap.fitZones(ZONES);

// L'Excel n'existe qu'une fois la routine passée
fetch(`${import.meta.env.BASE_URL}agenda.xlsx`, { method: 'HEAD' })
  .then((r) => {
    if (r.ok && !r.headers.get('content-type')?.includes('html')) $('#xlsx').hidden = false;
  })
  .catch(() => {});

loadDataset()
  .then((ds) => {
    events = ds.events.filter((e) => endOf(e) >= today());
    const d = new Date(ds.generated_at);
    el.updated.textContent = `Mis à jour le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`;
    render();
  })
  .catch((err) => {
    el.summary.textContent = 'Impossible de charger les événements.';
    console.error(err);
  });
