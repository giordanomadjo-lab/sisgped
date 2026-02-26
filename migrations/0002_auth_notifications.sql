-- ============================================================
-- Migration 0002 - Autenticação e Notificações
-- ============================================================

-- Tabela de Usuários do Sistema
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'INSTRUTOR' CHECK(perfil IN ('INSTRUTOR', 'GESTOR')),
  matricula TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  ultimo_acesso DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Sessões
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'INFO' CHECK(tipo IN ('INFO','SUCESSO','AVISO','ERRO')),
  lida INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  service_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lida ON notifications(user_id, lida);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_matricula ON users(matricula);

-- ============================================================
-- Usuários padrão do sistema
-- Senhas são hasheadas com SHA-256 simples (para demo)
-- gestor@dep.edu.br  → senha: gestor123
-- instrutor@dep.edu.br → senha: instrutor123
-- ============================================================
INSERT OR IGNORE INTO users (nome, email, senha_hash, perfil, matricula) VALUES
  ('Gestor DEP', 'gestor@dep.edu.br', '3f702f6b4e3dd34f5a96e09ad5d8efa46a5e76b8cf1b22a7e8c4e7d3a2b1c0d9', 'GESTOR', NULL),
  ('Ana Paula Silva', 'ana.silva@dep.edu.br', 'a7f9e2d4c8b3a1e6f0d5c2b9a4e7f1d3c8b6a2e5f0d4c1b8a3e6f2d7c0b5a9e4', 'INSTRUTOR', '12345');
