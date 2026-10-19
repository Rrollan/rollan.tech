# 3D assets

- `source/`: untouched Tripo GLB exports; preserve original quality.
- `web/`: optimized derivatives after geometry and visual QA.
- Generation records and status: `../../docs/ASSET_LEDGER.json`.

All three models are downloaded, retopologized in Tripo and compressed locally.
Visual approval of the assembled scene is still pending.

## Preparation targets

Measure actual geometry and texture costs after export. Do not assume that a
prompt requesting a lightweight model produces optimized geometry.

| Asset | Triangle budget | Texture target | Purpose |
|---|---:|---|---|
| Shelter | 30–80k | 2K base, normal and ORM | Close-up interior |
| Apartment block | 5–15k | 1K–2K | Repeated distant background |
| Sleeping cat | 8–15k | 1K | Small near-field prop |

Create web derivatives using mesh simplification and texture compression,
retaining high-quality source models. Check silhouette, UV seams and the shelter
interior after each reduction. Prefer KTX2/Basis textures and Meshopt geometry
when supported by the chosen loader. Do not ship 4K source maps by default.

The shelter must have complete inward-facing surfaces and flat areas for posters.
Check the bench, open front entrance and standing volume at human eye height.
The final scene will add its own sky, environment lighting, ground and road.
