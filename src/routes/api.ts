import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
}

const api = new Hono<{ Bindings: Bindings }>()

// ============================================================
// SERVICE TYPES
// ============================================================
api.get('/service-types', async (c) => {
  const { DB } = c.env
  const { categoria } = c.req.query()

  let query = 'SELECT * FROM service_types WHERE ativo = 1'
  const params: string[] = []

  if (categoria) {
    query += ' AND categoria = ?'
    params.push(categoria)
  }

  query += ' ORDER BY categoria, nome'

  const result = await DB.prepare(query).bind(...params).all()
  return c.json({ success: true, data: result.results })
})

// ============================================================
// INSTRUCTORS
// ============================================================
api.get('/instructors', async (c) => {
  const { DB } = c.env
  const result = await DB.prepare(
    'SELECT id, matricula, nome, email, valor_hora_aula, ativo, created_at FROM instructors WHERE ativo = 1 ORDER BY nome'
  ).all()
  return c.json({ success: true, data: result.results })
})

api.get('/instructors/by-matricula/:matricula', async (c) => {
  const { DB } = c.env
  const matricula = c.req.param('matricula')

  const result = await DB.prepare(
    'SELECT id, matricula, nome, email, valor_hora_aula FROM instructors WHERE matricula = ? AND ativo = 1'
  ).bind(matricula).first()

  if (!result) {
    return c.json({ success: false, message: 'Instrutor não encontrado' }, 404)
  }
  return c.json({ success: true, data: result })
})

api.post('/instructors', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { matricula, nome, email, valor_hora_aula } = body

  if (!matricula || !nome) {
    return c.json({ success: false, message: 'Matrícula e nome são obrigatórios' }, 400)
  }

  // Check if exists
  const existing = await DB.prepare(
    'SELECT id FROM instructors WHERE matricula = ?'
  ).bind(matricula).first()

  if (existing) {
    return c.json({ success: false, message: 'Matrícula já cadastrada' }, 409)
  }

  const result = await DB.prepare(
    'INSERT INTO instructors (matricula, nome, email, valor_hora_aula) VALUES (?, ?, ?, ?)'
  ).bind(matricula, nome, email || null, valor_hora_aula || 0).run()

  return c.json({ success: true, data: { id: result.meta.last_row_id, matricula, nome } }, 201)
})

api.put('/instructors/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  const { nome, email, valor_hora_aula } = body

  await DB.prepare(
    'UPDATE instructors SET nome = ?, email = ?, valor_hora_aula = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(nome, email || null, valor_hora_aula || 0, id).run()

  return c.json({ success: true, message: 'Instrutor atualizado com sucesso' })
})

// ============================================================
// SERVICES - CORE
// ============================================================

// Helper: calcular duração em horas
function calcDuracao(horaInicio: string, horaFim: string): number {
  const [h1, m1] = horaInicio.split(':').map(Number)
  const [h2, m2] = horaFim.split(':').map(Number)
  const minutos = (h2 * 60 + m2) - (h1 * 60 + m1)
  return Math.max(0, minutos / 60)
}

// Helper: calcular valor
function calcValor(duracao: number, valorHoraAula: number, tipo: string): number {
  if (tipo === 'CONSULTORIA') {
    return duracao * valorHoraAula * 1.30
  }
  return 0 // DEP não tem pagamento adicional
}

// Listar serviços com filtros
api.get('/services', async (c) => {
  const { DB } = c.env
  const { 
    status, tipo_demanda, matricula, 
    data_inicio, data_fim, 
    page = '1', limit = '20' 
  } = c.req.query()

  const pageNum = parseInt(page)
  const limitNum = Math.min(parseInt(limit), 100)
  const offset = (pageNum - 1) * limitNum

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (status) {
    whereClause += ' AND s.status = ?'
    params.push(status)
  }
  if (tipo_demanda) {
    whereClause += ' AND s.tipo_demanda = ?'
    params.push(tipo_demanda)
  }
  if (matricula) {
    whereClause += ' AND s.matricula_instrutor LIKE ?'
    params.push(`%${matricula}%`)
  }
  if (data_inicio) {
    whereClause += ' AND s.data_servico >= ?'
    params.push(data_inicio)
  }
  if (data_fim) {
    whereClause += ' AND s.data_servico <= ?'
    params.push(data_fim)
  }

  const countResult = await DB.prepare(
    `SELECT COUNT(*) as total FROM services s ${whereClause}`
  ).bind(...params).first() as { total: number }

  const result = await DB.prepare(`
    SELECT 
      s.*,
      st.nome as tipo_servico_nome,
      st.categoria as tipo_servico_categoria
    FROM services s
    LEFT JOIN service_types st ON s.service_type_id = st.id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limitNum, offset).all()

  return c.json({
    success: true,
    data: result.results,
    pagination: {
      total: countResult?.total || 0,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil((countResult?.total || 0) / limitNum)
    }
  })
})

// Buscar serviço por ID
api.get('/services/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  const result = await DB.prepare(`
    SELECT 
      s.*,
      st.nome as tipo_servico_nome,
      st.categoria as tipo_servico_categoria
    FROM services s
    LEFT JOIN service_types st ON s.service_type_id = st.id
    WHERE s.id = ?
  `).bind(id).first()

  if (!result) {
    return c.json({ success: false, message: 'Serviço não encontrado' }, 404)
  }
  return c.json({ success: true, data: result })
})

// Criar novo serviço
api.post('/services', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()

  const {
    matricula_instrutor,
    nome_instrutor,
    data_servico,
    hora_inicio,
    hora_fim,
    descricao_atividade,
    tipo_demanda,
    service_type_id,
    valor_hora_aula,
    observacoes
  } = body

  // Validações
  if (!matricula_instrutor || !data_servico || !hora_inicio || !hora_fim || !descricao_atividade || !tipo_demanda) {
    return c.json({ 
      success: false, 
      message: 'Campos obrigatórios: matrícula, data, hora início, hora fim, descrição, tipo de demanda' 
    }, 400)
  }

  if (!['CONSULTORIA', 'DEP'].includes(tipo_demanda)) {
    return c.json({ success: false, message: 'Tipo de demanda inválido. Use CONSULTORIA ou DEP' }, 400)
  }

  if (hora_fim <= hora_inicio) {
    return c.json({ success: false, message: 'Hora fim deve ser maior que hora início' }, 400)
  }

  // Calcular duração e valor
  const duracao = calcDuracao(hora_inicio, hora_fim)
  const vha = valor_hora_aula || 0
  const adicional = tipo_demanda === 'CONSULTORIA' ? 30.0 : 0.0
  const valor = calcValor(duracao, vha, tipo_demanda)

  const result = await DB.prepare(`
    INSERT INTO services (
      matricula_instrutor, nome_instrutor, data_servico, 
      hora_inicio, hora_fim, duracao_horas,
      descricao_atividade, tipo_demanda, service_type_id,
      valor_hora_aula, valor_adicional_percentual, valor_calculado,
      status, observacoes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?)
  `).bind(
    matricula_instrutor, 
    nome_instrutor || null,
    data_servico,
    hora_inicio,
    hora_fim,
    duracao,
    descricao_atividade,
    tipo_demanda,
    service_type_id || null,
    vha,
    adicional,
    valor,
    observacoes || null
  ).run()

  return c.json({ 
    success: true, 
    message: 'Serviço registrado com sucesso!',
    data: { 
      id: result.meta.last_row_id,
      duracao_horas: duracao,
      valor_calculado: valor
    }
  }, 201)
})

// Atualizar status de serviço (gestor)
api.patch('/services/:id/status', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  const { status, observacoes_gestor } = body

  const validStatus = ['PENDENTE', 'APROVADO', 'REJEITADO', 'PAGO']
  if (!validStatus.includes(status)) {
    return c.json({ success: false, message: 'Status inválido' }, 400)
  }

  await DB.prepare(`
    UPDATE services 
    SET status = ?, observacoes_gestor = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).bind(status, observacoes_gestor || null, id).run()

  return c.json({ success: true, message: `Status atualizado para ${status}` })
})

// Atualizar serviço completo (somente PENDENTE)
api.put('/services/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()

  // Verificar se pode editar
  const existing = await DB.prepare('SELECT status FROM services WHERE id = ?').bind(id).first() as { status: string }
  if (!existing) return c.json({ success: false, message: 'Serviço não encontrado' }, 404)
  if (existing.status !== 'PENDENTE') {
    return c.json({ success: false, message: 'Apenas serviços com status PENDENTE podem ser editados' }, 400)
  }

  const {
    data_servico, hora_inicio, hora_fim,
    descricao_atividade, tipo_demanda, service_type_id,
    valor_hora_aula, observacoes, nome_instrutor
  } = body

  const duracao = calcDuracao(hora_inicio, hora_fim)
  const adicional = tipo_demanda === 'CONSULTORIA' ? 30.0 : 0.0
  const valor = calcValor(duracao, valor_hora_aula || 0, tipo_demanda)

  await DB.prepare(`
    UPDATE services SET
      nome_instrutor = ?, data_servico = ?, hora_inicio = ?, hora_fim = ?,
      duracao_horas = ?, descricao_atividade = ?, tipo_demanda = ?,
      service_type_id = ?, valor_hora_aula = ?, valor_adicional_percentual = ?,
      valor_calculado = ?, observacoes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    nome_instrutor || null, data_servico, hora_inicio, hora_fim,
    duracao, descricao_atividade, tipo_demanda,
    service_type_id || null, valor_hora_aula || 0, adicional,
    valor, observacoes || null, id
  ).run()

  return c.json({ 
    success: true, 
    message: 'Serviço atualizado!',
    data: { duracao_horas: duracao, valor_calculado: valor }
  })
})

// Excluir serviço (somente PENDENTE)
api.delete('/services/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')

  const existing = await DB.prepare('SELECT status FROM services WHERE id = ?').bind(id).first() as { status: string }
  if (!existing) return c.json({ success: false, message: 'Serviço não encontrado' }, 404)
  if (existing.status !== 'PENDENTE') {
    return c.json({ success: false, message: 'Apenas serviços PENDENTES podem ser excluídos' }, 400)
  }

  await DB.prepare('DELETE FROM services WHERE id = ?').bind(id).run()
  return c.json({ success: true, message: 'Serviço excluído com sucesso' })
})

// ============================================================
// DASHBOARD / RELATÓRIOS
// ============================================================
api.get('/dashboard/stats', async (c) => {
  const { DB } = c.env
  const { mes, ano } = c.req.query()

  let whereClause = 'WHERE 1=1'
  const params: (string | number)[] = []

  if (ano) {
    whereClause += ` AND strftime('%Y', data_servico) = ?`
    params.push(ano)
  }
  if (mes) {
    whereClause += ` AND strftime('%m', data_servico) = ?`
    params.push(mes.padStart(2, '0'))
  }

  // Stats gerais
  const stats = await DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
      SUM(CASE WHEN status = 'APROVADO' THEN 1 ELSE 0 END) as aprovados,
      SUM(CASE WHEN status = 'REJEITADO' THEN 1 ELSE 0 END) as rejeitados,
      SUM(CASE WHEN status = 'PAGO' THEN 1 ELSE 0 END) as pagos,
      SUM(CASE WHEN tipo_demanda = 'CONSULTORIA' THEN 1 ELSE 0 END) as consultorias,
      SUM(CASE WHEN tipo_demanda = 'DEP' THEN 1 ELSE 0 END) as demandas_dep,
      ROUND(SUM(duracao_horas), 2) as total_horas,
      ROUND(SUM(CASE WHEN tipo_demanda = 'CONSULTORIA' THEN valor_calculado ELSE 0 END), 2) as total_valor_consultoria
    FROM services ${whereClause}
  `).bind(...params).first()

  // Por instrutor
  const porInstrutor = await DB.prepare(`
    SELECT 
      matricula_instrutor,
      nome_instrutor,
      COUNT(*) as total_servicos,
      ROUND(SUM(duracao_horas), 2) as total_horas,
      ROUND(SUM(valor_calculado), 2) as total_valor
    FROM services ${whereClause}
    GROUP BY matricula_instrutor, nome_instrutor
    ORDER BY total_servicos DESC
    LIMIT 10
  `).bind(...params).all()

  // Por tipo de demanda
  const porTipo = await DB.prepare(`
    SELECT 
      tipo_demanda,
      COUNT(*) as total,
      ROUND(SUM(duracao_horas), 2) as total_horas
    FROM services ${whereClause}
    GROUP BY tipo_demanda
  `).bind(...params).all()

  // Últimos serviços
  const recentes = await DB.prepare(`
    SELECT s.*, st.nome as tipo_servico_nome
    FROM services s
    LEFT JOIN service_types st ON s.service_type_id = st.id
    ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT 5
  `).bind(...params).all()

  return c.json({
    success: true,
    data: {
      stats,
      por_instrutor: porInstrutor.results,
      por_tipo: porTipo.results,
      recentes: recentes.results
    }
  })
})

export default api
