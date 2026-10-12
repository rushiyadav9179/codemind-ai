-- Enable vector similarity search extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
  RAISE NOTICE 'pgvector extension: %', (SELECT extversion FROM pg_extension WHERE extname = 'vector');
  RAISE NOTICE 'uuid-ossp extension: %', (SELECT extversion FROM pg_extension WHERE extname = 'uuid-ossp');
END
$$;
