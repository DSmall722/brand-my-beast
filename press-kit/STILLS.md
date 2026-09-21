# Stainless stills

Preview photos only. No wrap. No invented VIN. The truck in these stills is
not a reserved BrandMyBeast vehicle.

Public site files live in `/public`:

| File | Angle | Credit |
|---|---|---|
| `hero-truck-preview.jpg` / `hero-truck-preview-640.jpg` | Locked hero-master (all-caps R1). BMB hood + BRANDMYBEAST doors. Not as delivered. | Homepage hero |
| `truck-view-driver.jpg` | Closed-door driver-side profile. TRACE AID lime flat. | Photo by Joe L on Pexels — https://www.pexels.com/photo/a-car-is-parked-in-a-garage-with-a-large-concrete-floor-27908531/ |
| `truck-view-passenger.jpg` | Passenger-side ¾. TRACE AID lime flat. | Photo by Mylo Kaye on Pexels — https://www.pexels.com/photo/silver-tesla-cybertruck-24734498/ |
| `truck-view-front.jpg` | Head-on front. TRACE AID lime flat. | Photo by Mylo Kaye on Pexels — https://www.pexels.com/photo/tesla-cyber-truck-24734499/ |
| `truck-view-rear.jpg` | Straight-on rear, forest autumn road. TRACE AID lime flat. | Photo by Stephen Leonardi on Pexels — https://www.pexels.com/photo/futuristic-truck-on-a-forest-road-in-autumn-29278630/ |

Production board JPEGs are the approved **TRACE AID lime flats** (2048×1360).
Lime outlines and `(N) Name` labels are baked into the pixels. SVG polygons
are hit targets and hover/focus fill only — they do not draw a second set of
labels. Do not replace these with unmarked 1280×720 Pexels originals.

```
# Guard only — refuses to overwrite TRACE AID flats with unmarked stills:
python3 scripts/paint-board-marks.py
```

Do not run `scripts/build-pexels-board-stills.py` or
`scripts/credit-board-stills.py` against the board plates. Those rebuild
unmarked 16:9 Pexels files.

Each camera owns only that face’s seats: front 1–3, driver 4–6,
passenger 7–9, rear 10–11.

Pexels license allows free use with credit. Sami Abdullah city shot
https://www.pexels.com/photo/photo-of-a-tesla-cybertruck-on-the-street-in-a-city-26546824/
is a spare only (open driver door). It is not a primary board plate.

Older Wikimedia Greenwich stills remain in `scripts/build-truck-stills.py` as
the prior stainless compositor path. The homepage board uses the TRACE AID
lime flats on the Pexels bases.
