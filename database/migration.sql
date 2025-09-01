-- ActivityPro Database Migration
-- Sistema de Controle de Atividades e Tempo
-- Este arquivo contém toda a estrutura do banco de dados

-- Criação dos tipos (ENUMs)
CREATE TYPE user_role AS ENUM ('collaborator', 'sector_chief', 'admin');
CREATE TYPE activity_type AS ENUM ('simple', 'checklist');
CREATE TYPE activity_status AS ENUM ('next', 'in_progress', 'paused', 'completed', 'cancelled');
CREATE TYPE priority AS ENUM ('low', 'medium', 'high');

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de sessões (necessária para autenticação)
CREATE TABLE sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Índice para otimizar limpeza de sessões expiradas
CREATE INDEX IDX_session_expire ON sessions (expire);

-- Tabela de setores
CREATE TABLE sectors (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de usuários
CREATE TABLE users (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- hash bcrypt
    email VARCHAR UNIQUE,
    first_name VARCHAR,
    last_name VARCHAR,
    profile_image_url VARCHAR,
    sector_id VARCHAR REFERENCES sectors(id),
    role user_role NOT NULL DEFAULT 'collaborator',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de atividades
CREATE TABLE activities (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    type activity_type NOT NULL,
    priority priority NOT NULL,
    plant VARCHAR(100) NOT NULL,
    project VARCHAR(255),
    requester VARCHAR(255),
    status activity_status NOT NULL DEFAULT 'next',
    total_time INTEGER DEFAULT 0, -- em segundos
    collaborator_id VARCHAR REFERENCES users(id) NOT NULL,
    evidence_url VARCHAR,
    completion_notes TEXT,
    is_retroactive BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    paused_at TIMESTAMP,
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de subtarefas (para atividades tipo checklist)
CREATE TABLE subtasks (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR REFERENCES activities(id) NOT NULL,
    title VARCHAR(500) NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de logs de ajuste de tempo
CREATE TABLE time_adjustment_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR REFERENCES activities(id) NOT NULL,
    user_id VARCHAR REFERENCES users(id) NOT NULL,
    previous_time INTEGER NOT NULL, -- em segundos
    new_time INTEGER NOT NULL, -- em segundos
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de sessões de atividade (para controlar start/pause)
CREATE TABLE activity_sessions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR REFERENCES activities(id) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    duration INTEGER DEFAULT 0, -- em segundos
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de logs de atividade (para feed/histórico)
CREATE TABLE activity_logs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR REFERENCES activities(id) NOT NULL,
    user_id VARCHAR REFERENCES users(id) NOT NULL,
    action VARCHAR NOT NULL, -- 'created', 'started', 'paused', 'completed', 'cancelled'
    activity_title VARCHAR NOT NULL,
    time_spent INTEGER, -- em segundos, apenas para atividades completadas
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para otimização de performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_sector_id ON users(sector_id);
CREATE INDEX idx_activities_collaborator_id ON activities(collaborator_id);
CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_created_at ON activities(created_at);
CREATE INDEX idx_subtasks_activity_id ON subtasks(activity_id);
CREATE INDEX idx_activity_sessions_activity_id ON activity_sessions(activity_id);
CREATE INDEX idx_activity_logs_activity_id ON activity_logs(activity_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Inserção de dados iniciais
-- Setor padrão
INSERT INTO sectors (id, name) VALUES 
    ('default_sector_001', 'Desenvolvimento'),
    ('default_sector_002', 'Administração');

-- Usuário administrador padrão
INSERT INTO users (id, username, password, role, sector_id) VALUES 
    ('admin_user_001', 'admin', '$2b$10$NzHsXwuWdzV0u5L6gxEBw.Bbqj.8ulLxSEN/cV/pEXvwl1tDWrfmy', 'admin', 'default_sector_002');

-- Usuário demo
INSERT INTO users (id, username, password, role, sector_id) VALUES 
    ('demo_user_001', 'demo', '$2b$10$NzHsXwuWdzV0u5L6gxEBw.Bbqj.8ulLxSEN/cV/pEXvwl1tDWrfmy', 'collaborator', 'default_sector_001');

-- Comentários explicativos
COMMENT ON TABLE sectors IS 'Setores/departamentos da organização';
COMMENT ON TABLE users IS 'Usuários do sistema com autenticação local';
COMMENT ON TABLE activities IS 'Atividades principais do sistema';
COMMENT ON TABLE subtasks IS 'Subtarefas para atividades tipo checklist';
COMMENT ON TABLE time_adjustment_logs IS 'Logs de ajustes de tempo para auditoria';
COMMENT ON TABLE activity_sessions IS 'Sessões de trabalho para controle de tempo';
COMMENT ON TABLE activity_logs IS 'Histórico de ações para feed de atividades';

-- Triggers para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fim da migração ActivityPro
-- Versão: 1.0.0
-- Data: $(date)
-- 
-- Credenciais padrão após migração:
-- Administrador: admin / admin123  
-- Demo: demo / demo123
--
-- Para aplicar esta migração:
-- 1. Execute este arquivo em seu banco PostgreSQL
-- 2. Configure as variáveis de ambiente do sistema
-- 3. Inicie a aplicação