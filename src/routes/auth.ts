import { Hono } from 'hono'
import { hashPassword, createSession, deleteSession, getSessionIdFromCookie } from '../auth'

type Bindings = { DB: D1Database }

const authApi = new Hono<{ Bindings: Bindings }>()

// POST /api/auth/login
authApi.post('/login', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { email, senha } = body

  if (!email || !senha) {
    return c.json({ success: false, message: 'Email e senha são obrigatórios' }, 400)
  }

  const senhaHash = await hashPassword(senha)

  const user = await DB.prepare(`
    SELECT id, nome, email, perfil, matricula, ativo
    FROM users WHERE email = ? AND senha_hash = ?
  `).bind(email.toLowerCase().trim(), senhaHash).first() as any

  if (!user) {
    return c.json({ success: false, message: 'Email ou senha incorretos' }, 401)
  }

  if (!user.ativo) {
    return c.json({ success: false, message: 'Usuário inativo. Contate o gestor.' }, 403)
  }

  const sessionId = await createSession(DB, user.id)

  // Atualizar último acesso
  await DB.prepare("UPDATE users SET ultimo_acesso = datetime('now') WHERE id = ?").bind(user.id).run()

  const cookieOptions = [
    `session_id=${sessionId}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=28800' // 8 horas
  ].join('; ')

  return new Response(JSON.stringify({
    success: true,
    message: 'Login realizado com sucesso!',
    user: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil, matricula: user.matricula }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieOptions
    }
  })
})

// POST /api/auth/logout
authApi.post('/logout', async (c) => {
  const { DB } = c.env
  const cookieHeader = c.req.header('Cookie') || ''
  const sessionId = getSessionIdFromCookie(cookieHeader)

  if (sessionId) {
    await deleteSession(DB, sessionId)
  }

  return new Response(JSON.stringify({ success: true, message: 'Logout realizado' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session_id=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
    }
  })
})

// GET /api/auth/me
authApi.get('/me', async (c) => {
  const { DB } = c.env
  const cookieHeader = c.req.header('Cookie') || ''
  const sessionId = getSessionIdFromCookie(cookieHeader)

  if (!sessionId) {
    return c.json({ success: false, message: 'Não autenticado' }, 401)
  }

  const user = await DB.prepare(`
    SELECT u.id, u.nome, u.email, u.perfil, u.matricula, u.ultimo_acesso
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now') AND u.ativo = 1
  `).bind(sessionId).first()

  if (!user) {
    return c.json({ success: false, message: 'Sessão expirada' }, 401)
  }

  return c.json({ success: true, data: user })
})

// ============================================================
// GERENCIAMENTO DE USUÁRIOS (Gestor)
// ============================================================

// Listar usuários
authApi.get('/users', async (c) => {
  const { DB } = c.env
  const result = await DB.prepare(`
    SELECT id, nome, email, perfil, matricula, ativo, ultimo_acesso, created_at
    FROM users ORDER BY perfil, nome
  `).all()
  return c.json({ success: true, data: result.results })
})

// Criar usuário
authApi.post('/users', async (c) => {
  const { DB } = c.env
  const body = await c.req.json()
  const { nome, email, senha, perfil, matricula } = body

  if (!nome || !email || !senha || !perfil) {
    return c.json({ success: false, message: 'Nome, email, senha e perfil são obrigatórios' }, 400)
  }

  const existing = await DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
  if (existing) {
    return c.json({ success: false, message: 'Email já cadastrado' }, 409)
  }

  const senhaHash = await hashPassword(senha)

  const result = await DB.prepare(`
    INSERT INTO users (nome, email, senha_hash, perfil, matricula)
    VALUES (?, ?, ?, ?, ?)
  `).bind(nome, email.toLowerCase(), senhaHash, perfil, matricula || null).run()

  return c.json({ success: true, data: { id: result.meta.last_row_id, nome, email, perfil } }, 201)
})

// Atualizar usuário
authApi.put('/users/:id', async (c) => {
  const { DB } = c.env
  const id = c.req.param('id')
  const body = await c.req.json()
  const { nome, email, perfil, matricula, ativo, senha } = body

  if (senha) {
    const senhaHash = await hashPassword(senha)
    await DB.prepare(`
      UPDATE users SET nome=?, email=?, perfil=?, matricula=?, ativo=?, senha_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(nome, email.toLowerCase(), perfil, matricula || null, ativo ?? 1, senhaHash, id).run()
  } else {
    await DB.prepare(`
      UPDATE users SET nome=?, email=?, perfil=?, matricula=?, ativo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
    `).bind(nome, email.toLowerCase(), perfil, matricula || null, ativo ?? 1, id).run()
  }

  return c.json({ success: true, message: 'Usuário atualizado com sucesso' })
})

export default authApi
