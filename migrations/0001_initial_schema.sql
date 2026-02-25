-- ============================================================
-- Sistema de Gestão de Serviços Pedagógicos
-- Migration 0001 - Schema inicial
-- ============================================================

-- Tabela de Instrutores
CREATE TABLE IF NOT EXISTS instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  valor_hora_aula REAL NOT NULL DEFAULT 0.0,
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Tipos de Serviço
CREATE TABLE IF NOT EXISTS service_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL CHECK(categoria IN ('CONSULTORIA', 'DEP')),
  ativo INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Serviços Pedagógicos
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matricula_instrutor TEXT NOT NULL,
  nome_instrutor TEXT,
  data_servico DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  duracao_horas REAL,
  descricao_atividade TEXT NOT NULL,
  tipo_demanda TEXT NOT NULL CHECK(tipo_demanda IN ('CONSULTORIA', 'DEP')),
  service_type_id INTEGER,
  valor_hora_aula REAL DEFAULT 0.0,
  valor_adicional_percentual REAL DEFAULT 0.0,
  valor_calculado REAL DEFAULT 0.0,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE', 'APROVADO', 'REJEITADO', 'PAGO')),
  observacoes TEXT,
  observacoes_gestor TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (service_type_id) REFERENCES service_types(id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_services_matricula ON services(matricula_instrutor);
CREATE INDEX IF NOT EXISTS idx_services_data ON services(data_servico);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_tipo ON services(tipo_demanda);
CREATE INDEX IF NOT EXISTS idx_instructors_matricula ON instructors(matricula);

-- ============================================================
-- Dados iniciais - Tipos de serviço
-- ============================================================
INSERT OR IGNORE INTO service_types (nome, descricao, categoria) VALUES
  ('Desenvolvimento de Plano de Curso', 'Elaboração e estruturação do plano de curso', 'DEP'),
  ('Desenvolvimento de Plano de Trabalho', 'Elaboração do plano de trabalho docente', 'DEP'),
  ('Acompanhamento de Execução de Turmas', 'Supervisão e acompanhamento de turmas em andamento', 'DEP'),
  ('Elaboração de Material Didático', 'Criação e adaptação de materiais pedagógicos', 'DEP'),
  ('Avaliação de Aprendizagem', 'Desenvolvimento de instrumentos avaliativos', 'DEP'),
  ('Capacitação de Instrutores', 'Treinamento e capacitação de equipe docente', 'DEP'),
  ('Consultoria Técnica Especializada', 'Consultoria em área técnica específica', 'CONSULTORIA'),
  ('Consultoria Pedagógica', 'Assessoria pedagógica para terceiros', 'CONSULTORIA'),
  ('Consultoria em Desenvolvimento Curricular', 'Apoio externo na estruturação curricular', 'CONSULTORIA'),
  ('Consultoria em Avaliação Institucional', 'Assessoria em processos de avaliação institucional', 'CONSULTORIA'),
  ('Outro (DEP)', 'Outro tipo de serviço demandado pela DEP', 'DEP'),
  ('Outro (Consultoria)', 'Outro tipo de consultoria externa', 'CONSULTORIA');
