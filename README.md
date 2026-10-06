# Agenda des animations

Carte et liste filtrables des animations locales (concerts, marchés, fêtes, sport…) autour de destinations choisies.

## Fonctionnement

```
Routine Claude (vendredi 17h) ──push──► branche claude/events-data (events.json + agenda.xlsx)
                                                │
                     GitHub Actions ◄───────────┘  (aussi à chaque push sur main)
                           │
                           └──► GitHub Pages : site statique Vite + Leaflet
```

- **`config/zones.json`** : liste des destinations. C'est le seul fichier à modifier pour en ajouter une ;
  la routine le relit à chaque passage et le site l'embarque au build.
- **`public/events.json`** : jeu d'**exemple** pour le dev. En production il est remplacé au build par celui
  de la branche `claude/events-data`.
- Le site filtre tout côté navigateur (dates, types, zone, partie visible de la carte, score) ;
  les filtres sont dans l'URL, donc partageables.

## Format de `events.json`

```jsonc
{
  "generated_at": "2026-10-09T15:20:00Z",
  "events": [
    {
      "id": "pontcharra-2026-10-17-concert-le-comptoir", // stable d'une semaine sur l'autre
      "zone": "pontcharra",              // id de config/zones.json
      "title": "Concert rock",
      "date": "2026-10-17",              // premier jour
      "end_date": null,                  // dernier jour inclus si plusieurs jours (expo…)
      "time": "21:00",                   // null si inconnue
      "venue": "Le Comptoir", "town": "Pontcharra",
      "lat": 45.436, "lon": 6.020,       // null si non géocodé (affiché en liste seulement)
      "description": "≤ 200 caractères, reformulée",
      "category": "concert",             // voir liste ci-dessous
      "organizer_type": "bar",           // bar | restaurant | mairie | office de tourisme | association | autre
      "score": 3, "score_reason": "…",
      "confidence": "haute",             // haute | moyenne | faible
      "source_url": "https://…", "other_sources": []
    }
  ]
}
```

Catégories : `concert`, `soiree-bar`, `marche`, `fete-festival`, `sport`, `culture-expo`, `nature-sortie`,
`enfants-famille`, `vide-grenier`, `autre`.

## Développement

```bash
npm install
npm run dev
```

## Avant de rendre le site public

- Retirer `<meta name="robots" content="noindex">` dans `index.html`.
- Passer les tuiles OSM sur un fournisseur dédié (constante `TILES` dans `src/map.ts`).
- Ajouter une page de mentions légales.
