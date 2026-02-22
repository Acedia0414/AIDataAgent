-- Add label fields to metadata tables
ALTER TABLE metadata_tables 
ADD COLUMN label VARCHAR(255),
ADD COLUMN labelText TEXT;

-- Add label fields to metadata fields
ALTER TABLE metadata_fields 
ADD COLUMN label VARCHAR(255),
ADD COLUMN labelText TEXT;
