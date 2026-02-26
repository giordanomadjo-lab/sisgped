// ============================================================
// Módulo de Autenticação
// ============================================================

export type UserProfile = 'INSTRUTOR' | 'GESTOR'

export interface SessionUser {
  id: number
  nome: string
  email: string
  perfil: UserProfile
  matricula: string | null
}

// Hash SHA-256 usando Web Crypto API (disponível no Cloudflare Workers)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'sisgped_salt_2026')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Gerar ID de sessão aleatório
export function generateSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Criar sessão no banco
export async function createSession(db: D1Database, userId: number): Promise<string> {
  const sessionId = generateSessionId()
  // Sessão expira em 8 horas
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
  
  await db.prepare(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)'
  ).bind(sessionId, userId, expiresAt).run()

  return sessionId
}

// Buscar sessão válida
export async function getSession(db: D1Database, sessionId: string): Promise<SessionUser | null> {
  if (!sessionId) return null

  const result = await db.prepare(`
    SELECT u.id, u.nome, u.email, u.perfil, u.matricula
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? 
      AND s.expires_at > datetime('now')
      AND u.ativo = 1
  `).bind(sessionId).first() as SessionUser | null

  return result
}

// Deletar sessão (logout)
export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
}

// Atualizar último acesso
export async function updateLastAccess(db: D1Database, userId: number): Promise<void> {
  await db.prepare(
    "UPDATE users SET ultimo_acesso = datetime('now') WHERE id = ?"
  ).bind(userId).run()
}

// Parsear cookie de sessão
export function getSessionIdFromCookie(cookieHeader: string | null): string {
  if (!cookieHeader) return ''
  const match = cookieHeader.match(/session_id=([^;]+)/)
  return match ? match[1] : ''
}
