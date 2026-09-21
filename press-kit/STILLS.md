# Stainless stills

Preview photos only. No wrap. No invented VIN. The truck in these stills is
not a reserved BrandMyBeast vehicle.

Public site files live in `/public`:

| File | Angle | Credit |
|---|---|---|
| `hero-truck-preview.jpg` / `hero-truck-preview-640.jpg` | Locked hero-master (all-caps R1). BMB hood + BRANDMYBEAST doors. Not as delivered. | Homepage hero |
| `truck-view-driver.jpg` | Joe L 27908531 garage profile | Photo by Joe L on Pexels — https://www.pexels.com/photo/a-car-is-parked-in-a-garage-with-a-large-concrete-floor-27908531/ |
| `truck-view-passenger.jpg` | Mylo Kaye 24734498 plaza | Photo by Mylo Kaye on Pexels — https://www.pexels.com/photo/silver-tesla-cybertruck-24734498/ |
| `truck-view-front.jpg` | Head-on front | Photo by Mylo Kaye on Pexels — https://www.pexels.com/photo/tesla-cyber-truck-24734499/ |
| `truck-view-rear.jpg` | Stephen Leonardi lock | Photo by Stephen Leonardi on Pexels — https://www.pexels.com/photo/futuristic-truck-on-a-forest-road-in-autumn-29278630/ |

Rebuild clean bases (do not paint number dots — SVG overlays carry labels):

```
python3 scripts/install-locked-training-stills.py
```

Each public `truck-view-*.jpg` carries the photographer name and Pexels URL in
EXIF Artist / Copyright / ImageDescription, IPTC By-line / Source, and XMP
dc:creator / dc:rights / WebStatement.

Pexels license allows free use with credit. Sami Abdullah city shot
https://www.pexels.com/photo/photo-of-a-tesla-cybertruck-on-the-street-in-a-city-26546824/
is a spare only (open driver door). It is not a primary board plate.

Older Wikimedia Greenwich stills remain in `scripts/build-truck-stills.py` as
the prior stainless compositor path. The homepage board uses the Pexels set.
