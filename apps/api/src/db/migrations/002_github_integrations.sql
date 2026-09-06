-- ==============================================================================
-- Migration: 002_github_integrations.sql
-- Description: GitHub App Integrations, Linked Repositories & Installation Data
-- ==============================================================================

CREATE TABLE IF NOT EXISTS github_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    installation_id VARCHAR(100) NOT NULL,
    repository_full_name VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_integrations_user ON github_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_github_integrations_repo ON github_integrations(repository_full_name);
