-- Postgres 9.5+ has support of upserting records
-- If record exists... do nothing
INSERT INTO target_table (field_one, field_two, field_three ) 
SELECT field_one, field_two, field_three
FROM source_table
ON CONFLICT (field_one) DO NOTHING;