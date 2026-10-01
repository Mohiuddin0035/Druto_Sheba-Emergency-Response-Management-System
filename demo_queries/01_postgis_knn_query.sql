-- ==============================================================================
-- Demo Query 1: PostGIS Nearest Hospital Spatial Calculation (KNN Proximity)
-- Uses: hospitals table, PostGIS <-> operator & ST_DistanceSphere
-- ==============================================================================
SELECT 
    name,
    type AS hospital_category,
    general_beds,
    icu_beds,
    ROUND((ST_DistanceSphere(location_coords, ST_SetSRID(ST_MakePoint(90.399452, 23.777176), 4326)) / 1000)::numeric, 2) AS distance_km
FROM hospitals
WHERE general_beds > 0 OR icu_beds > 0
ORDER BY location_coords <-> ST_SetSRID(ST_MakePoint(90.399452, 23.777176), 4326)
LIMIT 5;
