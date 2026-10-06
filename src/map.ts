import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { category, type EventItem, type Zone } from './data';

// Serveur de tuiles OSM : suffisant pour un proto à faible trafic.
// Pour la version publique, remplacer par un fournisseur (MapTiler, Stadia…) — une seule ligne à changer.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>';

export class EventMap {
  readonly map: L.Map;
  private cluster = L.markerClusterGroup({ maxClusterRadius: 40, showCoverageOnHover: false });
  private markers = new Map<string, L.Marker>();
  /** Dernière emprise connue avec une carte visible (sur mobile la carte peut être masquée). */
  bounds: L.LatLngBounds | null = null;

  constructor(el: HTMLElement, onMove: () => void) {
    this.map = L.map(el, { zoomControl: true }).setView([46.5, 3.5], 6);
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(this.map);
    this.map.addLayer(this.cluster);
    this.map.on('moveend', () => {
      if (this.map.getSize().x > 0) this.bounds = this.map.getBounds();
      onMove();
    });
  }

  setEvents(events: EventItem[], popup: (e: EventItem) => string) {
    this.cluster.clearLayers();
    this.markers.clear();
    const layers: L.Marker[] = [];
    for (const e of events) {
      if (e.lat == null || e.lon == null) continue;
      const size = 12 + e.score * 2;
      const icon = L.divIcon({
        className: 'pin',
        html: `<span style="background:${category(e.category).color};width:${size}px;height:${size}px"></span>`,
        iconSize: [size, size],
      });
      const m = L.marker([e.lat, e.lon], { icon, title: e.title }).bindPopup(() => popup(e), { maxWidth: 300 });
      this.markers.set(e.id, m);
      layers.push(m);
    }
    this.cluster.addLayers(layers);
  }

  fitZones(zones: Zone[]) {
    const b = L.latLngBounds([]);
    for (const z of zones) b.extend(L.latLng(z.lat, z.lon).toBounds(z.radius_km * 2000));
    // La taille mise en cache par Leaflet peut dater d'avant l'application du CSS
    this.map.invalidateSize();
    if (b.isValid()) this.map.fitBounds(b, { padding: [10, 10] });
  }

  focus(id: string) {
    const m = this.markers.get(id);
    if (m) this.cluster.zoomToShowLayer(m, () => m.openPopup());
  }

  refreshSize() {
    this.map.invalidateSize();
  }
}
