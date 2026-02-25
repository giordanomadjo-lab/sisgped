# SisGPed — Sistema de Gestão de Serviços Pedagógicos

## Visão Geral
Sistema web para registro, acompanhamento e gestão de serviços pedagógicos prestados por instrutores da Divisão de Educação Profissional (DEP).

## Funcionalidades Implementadas

### 👨‍🏫 Para Instrutores
- ✅ Registro de serviços pedagógicos com matrícula, data, horário, descrição e tipo
- ✅ Busca automática de dados do instrutor por matrícula
- ✅ Cálculo automático de duração (hora início → hora fim)
- ✅ Seleção do tipo de demanda: **Consultoria** ou **Demanda DEP**
- ✅ Cálculo automático de valor para consultorias (+30% sobre valor hora-aula)
- ✅ Consulta e acompanhamento do status dos próprios registros

### 🏢 Para Gestores (DEP)
- ✅ Painel de gestão com visualização por status (Pendente / Aprovado / Pago / Rejeitado)
- ✅ Aprovação, rejeição e marcação como pago dos serviços
- ✅ Campo para observações do gestor em cada decisão

### 📊 Dashboard
- ✅ Indicadores: total de serviços, pendentes, aprovados, horas, valor consultorias
- ✅ Gráfico de distribuição por tipo (Consultoria vs DEP)
- ✅ Ranking de instrutores por volume de serviços
- ✅ Filtros por mês e ano
- ✅ Registros recentes

## URLs e Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Dashboard principal |
| `/novo-servico` | Formulário de registro de serviço |
| `/servicos` | Listagem com filtros e detalhes |
| `/gestao` | Painel de gestão (aprovação/rejeição) |
| `/instrutores` | Cadastro de instrutores |

### API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/service-types` | Listar tipos de serviço |
| GET | `/api/instructors` | Listar instrutores |
| GET | `/api/instructors/by-matricula/:matricula` | Buscar instrutor |
| POST | `/api/instructors` | Cadastrar instrutor |
| GET | `/api/services` | Listar serviços (com filtros e paginação) |
| POST | `/api/services` | Registrar novo serviço |
| GET | `/api/services/:id` | Detalhes do serviço |
| PUT | `/api/services/:id` | Editar serviço (somente PENDENTE) |
| PATCH | `/api/services/:id/status` | Atualizar status (gestor) |
| DELETE | `/api/services/:id` | Excluir serviço (somente PENDENTE) |
| GET | `/api/dashboard/stats` | Estatísticas do dashboard |

## Regras de Negócio

### Tipos de Demanda
- **CONSULTORIA**: Valor = horas × valor_hora_aula × **1,30** (30% adicional)
- **DEP** (Divisão de Educação Profissional): Sem pagamento adicional (valor = N/A)

### Fluxo de Status
```
PENDENTE → APROVADO → PAGO
PENDENTE → REJEITADO
APROVADO / REJEITADO → PENDENTE (reabertura pelo gestor)
```

### Edição/Exclusão
- Somente serviços com status **PENDENTE** podem ser editados ou excluídos

## Modelo de Dados

### `instructors`
- `matricula` — Identificador único do instrutor
- `nome`, `email` — Dados pessoais
- `valor_hora_aula` — Valor base para cálculo de consultorias

### `services`
- `matricula_instrutor`, `nome_instrutor` — Vínculo com instrutor
- `data_servico`, `hora_inicio`, `hora_fim` — Dados temporais
- `duracao_horas` — Calculada automaticamente
- `descricao_atividade` — Descrição obrigatória
- `tipo_demanda` — `CONSULTORIA` ou `DEP`
- `valor_calculado` — Valor final (apenas para consultorias)
- `status` — `PENDENTE` | `APROVADO` | `REJEITADO` | `PAGO`

### `service_types`
- 12 tipos pré-cadastrados (DEP e Consultoria)

## Stack Tecnológica

- **Backend**: Hono (TypeScript) — Cloudflare Pages/Workers
- **Banco de dados**: Cloudflare D1 (SQLite)
- **Frontend**: HTML/JS (vanilla) com Tailwind CSS (CDN) + Chart.js
- **Build**: Vite + @hono/vite-build

## Deployment

- **Plataforma**: Cloudflare Pages
- **Status**: 🟢 Em desenvolvimento local
- **Última atualização**: 25/02/2026

## Próximos Passos Sugeridos

- [ ] Autenticação de usuários (instrutor vs gestor)
- [ ] Filtro por instrutor na visão do gestor
- [ ] Exportação de relatórios em PDF/Excel
- [ ] Notificações por e-mail ao mudar status
- [ ] Período de competência (mês/ano de referência)
- [ ] Upload de comprovante/evidência do serviço
- [ ] Histórico de alterações de status (auditoria)
- [ ] Relatório mensal por instrutor
