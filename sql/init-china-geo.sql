-- ---------------------------------------------------------------------------
-- china_geo – China province/city/district boundary data (Supabase + PostGIS)
-- ---------------------------------------------------------------------------
--
-- Purpose
--   Table, indexes, and functions for point-in-polygon reverse geocoding.
--
-- Prerequisites
--   Run once in SQL Editor. Enable PostGIS: Database → Extensions (schema: extensions).
--
-- Data source
--   Level-3 (province/city/district) boundary data:
--     GitHub  https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov
--     Gitee   https://gitee.com/xiangyuecn/AreaCity-JsSpider-StatsGov
--   File: ok_geo.csv (version 2023.240319.250114).
--   Transform tool (CSV → DB, export shp/geojson/sql): 
--     https://xiangyuecn.github.io/AreaCity-JsSpider-StatsGov/assets/AreaCity-Geo-Transform-Tools.html
--   Point-in-polygon query reference: https://gitee.com/xiangyuecn/AreaCity-Query-Geometry
--
-- After importing rows
--   Run sql/backfill-china-geo-geom.sql so geom is populated and spatial queries use the index.
--
-- ---------------------------------------------------------------------------

-- 1. Table
create table public.china_geo (
  id       bigint primary key,
  pid      bigint not null,
  deep     int    not null,
  name     text,
  ext_path text,
  geo      text,
  polygon  text
);

comment on table public.china_geo is 'China admin divisions geo data';
comment on column public.china_geo.id is 'Primary key';
comment on column public.china_geo.pid is 'Parent id';
comment on column public.china_geo.deep is 'Level depth (0=province, 1=city, 2=district)';
comment on column public.china_geo.name is 'Region name';
comment on column public.china_geo.ext_path is 'Hierarchy path';
comment on column public.china_geo.geo is 'Center point: lng lat';
comment on column public.china_geo.polygon is 'Boundary polygon: lng lat,lng lat,...; multiple rings may be separated by ;';

create index idx_china_geo_pid  on public.china_geo(pid);
create index idx_china_geo_deep on public.china_geo(deep);
create index idx_china_geo_name on public.china_geo(name);

-- 2. PostGIS and geom column
create extension if not exists postgis with schema extensions;

alter table public.china_geo
  add column if not exists geom extensions.geometry(polygon, 4326);

-- Spatial index on geometry (PostGIS / PostgreSQL; index access method name is fixed by the database).
create index if not exists idx_china_geo_geom
  on public.china_geo using gist (geom);

-- Converts polygon text (lng lat,lng lat,...) to geometry; closes ring automatically.
create or replace function public.polygon_text_to_geom(t text)
returns extensions.geometry
language plpgsql immutable as $$
declare
  first_pt text;
  closed   text;
begin
  if t is null or trim(t) = '' then return null; end if;
  first_pt := trim(split_part(t, ',', 1));
  closed   := trim(t) || ',' || first_pt;
  return extensions.st_setsrid(
    extensions.st_geomfromtext('POLYGON((' || closed || '))'),
    4326
  );
exception when others then return null;
end;
$$;

-- 3. Point-in-region (uses geom and spatial index)
create or replace function public.geo_containing_point(lng float, lat float)
returns table (id bigint, pid bigint, deep int, name text, ext_path text)
language sql stable
as $$
  select g.id, g.pid, g.deep, g.name, g.ext_path
  from public.china_geo g
  where g.geom is not null
    and extensions.st_covers(
      g.geom,
      extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)
    );
$$;

-- Returns province/city/district and boundary polygon for the deepest matching region (district).
-- Polygon format: lng lat,lng lat,... from china_geo.polygon.
drop function if exists public.geo_containing_point_deepest(double precision, double precision);
create or replace function public.geo_containing_point_deepest(lng float, lat float)
returns table (
  province_id bigint,
  province_name text,
  city_id bigint,
  city_name text,
  district_id bigint,
  district_name text,
  ext_path text,
  polygon text
)
language sql stable
as $$
  with recursive
  matches as (
    select g.id, g.pid, g.deep, g.name, g.ext_path, g.geom, g.polygon
    from public.china_geo g
    where g.geom is not null
      and extensions.st_covers(
        g.geom,
        extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)
      )
  ),
  deepest as (
    select m.* from matches m order by m.deep desc limit 1
  ),
  rec as (
    select g.id, g.pid, g.deep, g.name from public.china_geo g join deepest d on g.id = d.id
    union all
    select g.id, g.pid, g.deep, g.name from public.china_geo g join rec r on g.id = r.pid
  )
  select
    max(case when rec.deep = 0 then rec.id end)::bigint,
    max(case when rec.deep = 0 then rec.name end),
    max(case when rec.deep = 1 then rec.id end)::bigint,
    max(case when rec.deep = 1 then rec.name end),
    max(case when rec.deep = 2 then rec.id end)::bigint,
    max(case when rec.deep = 2 then rec.name end),
    (select d.ext_path from deepest d limit 1),
    (select d.polygon from deepest d limit 1)
  from rec;
$$;

-- 4. Lookup by name and level
create or replace function public.get_region_by_name(
  region_name text,
  deep_filter int default null
)
returns table (id bigint, pid bigint, deep int, name text, ext_path text)
language sql stable
as $$
  select g.id, g.pid, g.deep, g.name, g.ext_path
  from public.china_geo g
  where g.name ilike '%' || region_name || '%'
    and (deep_filter is null or g.deep = deep_filter)
  order by g.deep, g.id
  limit 50;
$$;

create or replace function public.get_parent_chain(region_id bigint)
returns table (
  province_id bigint,
  province_name text,
  city_id bigint,
  city_name text,
  district_id bigint,
  district_name text
)
language sql stable
as $$
  with recursive up as (
    select g.id, g.pid, g.deep, g.name from public.china_geo g where g.id = region_id
    union all
    select g.id, g.pid, g.deep, g.name from public.china_geo g join up on g.id = up.pid
  )
  select
    max(case when u.deep = 0 then u.id end)::bigint,
    max(case when u.deep = 0 then u.name end),
    max(case when u.deep = 1 then u.id end)::bigint,
    max(case when u.deep = 1 then u.name end),
    max(case when u.deep = 2 then u.id end)::bigint,
    max(case when u.deep = 2 then u.name end)
  from up u;
$$;

create or replace function public.get_children(parent_id bigint)
returns table (id bigint, pid bigint, deep int, name text, ext_path text)
language sql stable
as $$
  select g.id, g.pid, g.deep, g.name, g.ext_path
  from public.china_geo g
  where g.pid = parent_id
  order by g.name;
$$;

-- 5. Post-import: backfill geom (required for spatial index on lat/lng queries)
-- Prefer sql/backfill-china-geo-geom.sql: plain polygon_text_to_geom(polygon) fails
-- when polygon contains ';' (multi-ring text); that script uses split_part for the first ring.

-- 6. Optional: normalize empty or "EMPTY" strings to NULL
-- update public.china_geo set
--   name     = case when trim(coalesce(name,     '')) = '' or upper(trim(coalesce(name,     ''))) = 'EMPTY' then null else name     end,
--   ext_path = case when trim(coalesce(ext_path, '')) = '' or upper(trim(coalesce(ext_path, ''))) = 'EMPTY' then null else ext_path end,
--   geo      = case when trim(coalesce(geo,      '')) = '' or upper(trim(coalesce(geo,      ''))) = 'EMPTY' then null else geo      end,
--   polygon  = case when trim(coalesce(polygon,  '')) = '' or upper(trim(coalesce(polygon,  ''))) = 'EMPTY' then null else polygon  end;
