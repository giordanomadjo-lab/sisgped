import { Hono } from 'hono'
import { getSession, getSessionIdFromCookie } from '../auth'

type Bindings = { DB: D1Database }

const notificationsApi = new Hono<{ Bindings: Bindings }>()

// Listar notificações do usuário logado
notificationsApi.get('/', async (c) => {
  const { DB } = c.env
  const cookieHeader = c.req.header('Cookie') || ''
  const sessionId = getSessionIdFromCookie(cookieHeader)
  const user = await getSession(DB, sessionId)

  if (!user) return c.json({ success: false, message: 'Não autenticado' }, 401)

  const { lida, limit = '20' } = c.req.query()
  let query = 'SELECT * FROM notifications WHERE user_id = ?'
  const params: (string | number)[] = [user.id]

  if (lida !== undefined) {
    query += ' AND lida = ?'
    params.push(lida === 'true' ? 1 : 0)
  }

  query += ' ORDER BY created_at DESC LIMIT ?'
  params.push(parseInt(limit))

  const result = await DB.prepare(query).bind(...params).all()

  // Contar não lidas
  const unread = await DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND lida = 0'
  ).bind(user.id).first() as { count: number }

  return c.json({
    success: true,
    data: result.results,
    unread_count: unread?.count || 0
  })
})

// Marcar como lida
notificationsApi.patch('/:id/read', async (c) => {
  const { DB } = c.env
  const cookieHeader = c.req.header('Cookie') || ''
  const sessionId = getSessionIdFromCookie(cookieHeader)
  const user = await getSession(DB, sessionId)

  if (!user) return c.json({ success: false, message: 'Não autenticado' }, 401)

  const id = c.req.param('id')
  await DB.prepare(
    'UPDATE notifications SET lida = 1 WHERE id = ? AND user_id = ?'
  ).bind(id, user.id).run()

  return c.json({ success: true })
})

// Marcar todas como lidas
notificationsApi.post('/read-all', async (c) => {
  const { DB } = c.env
  const cookieHeader = c.req.header('Cookie') || ''
  const sessionId = getSessionIdFromCookie(cookieHeader)
  const user = await getSession(DB, sessionId)

  if (!user) return c.json({ success: false, message: 'Não autenticado' }, 401)

  await DB.prepare(
    'UPDATE notifications SET lida = 1 WHERE user_id = ?'
  ).bind(user.id).run()

  return c.json({ success: true, message: 'Todas as notificações foram marcadas como lidas' })
})

// Contar não lidas (endpoint leve para polling)
notificationsApi.get('/unread-count', async (c) => {
  const { DB } = c.env
  const cookieHeader = c.req.header('Cookie') || ''
  const sessionId = getSessionIdFromCookie(cookieHeader)
  const user = await getSession(DB, sessionId)

  if (!user) return c.json({ count: 0 })

  const result = await DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND lida = 0'
  ).bind(user.id).first() as { count: number }

  return c.json({ count: result?.count || 0 })
})

// Helper: criar notificação (uso interno)
export async function createNotification(
  db: D1Database,
  userId: number,
  titulo: string,
  mensagem: string,
  tipo: 'INFO' | 'SUCESSO' | 'AVISO' | 'ERRO' = 'INFO',
  link?: string,
  serviceId?: number
) {
  await db.prepare(`
    INSERT INTO notifications (user_id, titulo, mensagem, tipo, link, service_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(userId, titulo, mensagem, tipo, link || null, serviceId || null).run()
}

export default notificationsApi
