-- Initialization script for KAMPÜS+ database
-- This runs automatically when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kampus_plus TO kampus_user;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'KAMPÜS+ database initialized successfully!';
END $$;
