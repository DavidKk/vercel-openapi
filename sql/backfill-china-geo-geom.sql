-- Backfill china_geo.geom from polygon text (WKT-like).
--
-- polygon_text_to_geom() expects a single-ring POLYGON string. Many rows store
-- multiple rings separated by ';' (outer ring + holes or multi-part fragments).
-- For those rows, only the segment before the first ';' is used so ST_GeomFromText
-- succeeds. Holes and additional rings are ignored; refine data or extend the
-- parser if you need full multipolygon fidelity.
--
-- Run after china_geo data import and after polygon_text_to_geom exists.

update public.china_geo
set geom = public.polygon_text_to_geom(
  case
    when position(';' in polygon) > 0 then split_part(polygon, ';', 1)
    else polygon
  end
)
where geom is null
  and polygon is not null
  and trim(polygon) <> '';
