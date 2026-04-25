-- ============================================================
-- Spectral — Apache AGE Initialization Script
-- File: init/01_age.sql
--
-- Runs ONCE on first DB creation (Postgres entrypoint initdb).
-- If pgdata volume already exists, this script is NOT re-run.
-- ============================================================

-- 1. Load the AGE shared library into this session
LOAD 'age';

-- 2. Enable the AGE extension in this database
CREATE EXTENSION IF NOT EXISTS age;

-- 3. Set search_path so ag_catalog functions resolve without schema prefix
SET search_path = ag_catalog, "$user", public;

-- 4. Create the graph (idempotent — wrapped in a DO block to avoid
--    an error if the init script is somehow re-run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM ag_catalog.ag_graph WHERE name = 'spectral_graph'
    ) THEN
        PERFORM ag_catalog.create_graph('spectral_graph');
        RAISE NOTICE '[AGE] spectral_graph created successfully.';
    ELSE
        RAISE NOTICE '[AGE] spectral_graph already exists — skipping creation.';
    END IF;
END
$$;
