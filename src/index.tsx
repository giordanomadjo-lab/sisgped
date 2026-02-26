import { Hono } from 'hono'
import { cors } from 'hono/cors'
import api from './routes/api'
import authApi from './routes/auth'
import notificationsApi from './routes/notifications'
import { getSession, getSessionIdFromCookie } from './auth'
import type { SessionUser } from './auth'

type Bindings = { DB: D1Database }
type Variables = { user: SessionUser | null }

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

app.use('/api/*', cors())

// ── Middleware global: injeta usuário na variável ──
app.use('*', async (c, next) => {
  const cookieHeader = c.req.header('Cookie') || ''
  const sessionId = getSessionIdFromCookie(cookieHeader)
  if (sessionId) {
    const user = await getSession((c.env as any).DB, sessionId)
    c.set('user', user)
  } else {
    c.set('user', null)
  }
  await next()
})

// ── Guards ──
const requireAuth = async (c: any, next: any) => {
  if (!c.get('user')) return c.redirect('/login')
  await next()
}
const requireGestor = async (c: any, next: any) => {
  const user = c.get('user')
  if (!user) return c.redirect('/login')
  if (user.perfil !== 'GESTOR') return c.html(errPage('Acesso negado. Área exclusiva de Gestores DEP.'), 403)
  await next()
}

// ── API routes ──
app.route('/api', api)
app.route('/api/auth', authApi)
app.route('/api/notifications', notificationsApi)

// ============================================================
// HELPERS: UI
// ============================================================
function errPage(msg: string) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8fafc">
<div style="text-align:center;padding:2rem;max-width:400px">
  <div style="font-size:4rem;margin-bottom:1rem">🔒</div>
  <h2 style="color:#1e293b;margin-bottom:0.5rem">Acesso Restrito</h2>
  <p style="color:#64748b;margin-bottom:1.5rem">${msg}</p>
  <a href="/" style="background:#3b82f6;color:white;padding:0.75rem 1.5rem;border-radius:0.75rem;text-decoration:none;font-weight:600">Voltar ao início</a>
</div></body></html>`
}

function layout(title: string, content: string, activeNav: string, user: SessionUser | null) {
  const isGestor = user?.perfil === 'GESTOR'
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SisGPed</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    .nav-active { background-color:rgba(255,255,255,0.18) !important; }
    .status-PENDENTE { background:#fef3c7;color:#92400e;border:1px solid #fde68a; }
    .status-APROVADO { background:#d1fae5;color:#065f46;border:1px solid #a7f3d0; }
    .status-REJEITADO { background:#fee2e2;color:#991b1b;border:1px solid #fca5a5; }
    .status-PAGO { background:#dbeafe;color:#1e40af;border:1px solid #93c5fd; }
    .fade-in { animation:fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    .card-hover { transition:transform .2s,box-shadow .2s; }
    .card-hover:hover { transform:translateY(-2px);box-shadow:0 10px 25px -5px rgba(0,0,0,.15); }
    body { font-family:'Segoe UI',system-ui,sans-serif; }
    .spinner { border:3px solid #f3f3f3;border-top:3px solid #3b82f6;border-radius:50%;width:24px;height:24px;animation:spin .8s linear infinite;display:inline-block; }
    @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    .notif-dot { position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#ef4444;border-radius:50%;border:2px solid #1e40af; }
    #notifPanel { display:none;position:absolute;right:0;top:calc(100% + 8px);width:360px;background:white;border-radius:16px;box-shadow:0 20px 60px -10px rgba(0,0,0,.25);border:1px solid #e2e8f0;z-index:100;max-height:500px;overflow-y:auto; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">
<div class="flex min-h-screen">

  <!-- Sidebar -->
  <aside class="w-64 bg-gradient-to-b from-blue-800 to-blue-900 text-white flex flex-col shadow-xl fixed h-full z-10">
    <div class="p-5 border-b border-blue-700">
      <div class="flex items-center gap-3">
        <div class="bg-white/20 rounded-xl p-2.5"><i class="fas fa-chalkboard-teacher text-xl"></i></div>
        <div>
          <h1 class="text-lg font-bold leading-tight">SisGPed</h1>
          <p class="text-blue-300 text-xs">Serviços Pedagógicos</p>
        </div>
      </div>
    </div>
    <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
      <a href="/" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav==='dashboard'?'nav-active':''}">
        <i class="fas fa-chart-pie w-5 text-center text-blue-300"></i><span class="text-sm font-medium">Dashboard</span>
      </a>
      <a href="/novo-servico" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav==='novo'?'nav-active':''}">
        <i class="fas fa-plus-circle w-5 text-center text-blue-300"></i><span class="text-sm font-medium">Registrar Serviço</span>
      </a>
      <a href="/servicos" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav==='servicos'?'nav-active':''}">
        <i class="fas fa-list-alt w-5 text-center text-blue-300"></i><span class="text-sm font-medium">Meus Serviços</span>
      </a>
      ${isGestor ? `
      <a href="/gestao" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav==='gestao'?'nav-active':''}">
        <i class="fas fa-tasks w-5 text-center text-blue-300"></i><span class="text-sm font-medium">Gestão (DEP)</span>
      </a>
      <a href="/relatorios" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav==='relatorios'?'nav-active':''}">
        <i class="fas fa-file-export w-5 text-center text-blue-300"></i><span class="text-sm font-medium">Relatórios</span>
      </a>` : `
      <a href="/relatorios" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav==='relatorios'?'nav-active':''}">
        <i class="fas fa-file-export w-5 text-center text-blue-300"></i><span class="text-sm font-medium">Relatórios</span>
      </a>`}
      <div class="pt-3 pb-1 px-4"><p class="text-xs text-blue-400 uppercase tracking-wider font-semibold">Config.</p></div>
      ${isGestor ? `
      <a href="/instrutores" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav==='instrutores'?'nav-active':''}">
        <i class="fas fa-users w-5 text-center text-blue-300"></i><span class="text-sm font-medium">Instrutores</span>
      </a>
      <a href="/usuarios" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav==='usuarios'?'nav-active':''}">
        <i class="fas fa-user-cog w-5 text-center text-blue-300"></i><span class="text-sm font-medium">Usuários</span>
      </a>` : ''}
    </nav>
    <div class="p-4 border-t border-blue-700">
      <p class="text-xs text-blue-400 text-center">Divisão de Educação Profissional</p>
    </div>
  </aside>

  <!-- Main -->
  <div class="ml-64 flex-1 flex flex-col">

    <!-- Top bar -->
    <header class="bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-end gap-4 sticky top-0 z-10 shadow-sm">
      <!-- Notificações -->
      <div class="relative">
        <button id="btnNotif" onclick="toggleNotifPanel()" class="relative p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500">
          <i class="fas fa-bell text-lg"></i>
          <span id="notifBadge" class="notif-dot hidden"></span>
        </button>
        <div id="notifPanel">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <h4 class="font-semibold text-gray-800 text-sm">Notificações</h4>
            <button onclick="marcarTodasLidas()" class="text-xs text-blue-600 hover:underline">Marcar todas como lidas</button>
          </div>
          <div id="notifLista" class="divide-y divide-gray-50">
            <div class="text-center py-6 text-gray-400 text-sm">Carregando...</div>
          </div>
        </div>
      </div>

      <!-- Perfil do usuário -->
      <div class="flex items-center gap-3">
        <div class="text-right hidden md:block">
          <p class="text-sm font-medium text-gray-800">${user?.nome || 'Usuário'}</p>
          <p class="text-xs text-gray-400">${user?.perfil === 'GESTOR' ? 'Gestor DEP' : 'Instrutor'}</p>
        </div>
        <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
          ${(user?.nome || 'U')[0].toUpperCase()}
        </div>
        <div class="relative group">
          <button class="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
            <i class="fas fa-chevron-down text-xs"></i>
          </button>
          <div class="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 hidden group-hover:block z-50">
            <a href="/perfil" class="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl">
              <i class="fas fa-user text-gray-400 w-4"></i>Meu Perfil
            </a>
            <button onclick="logout()" class="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-xl">
              <i class="fas fa-sign-out-alt w-4"></i>Sair
            </button>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 p-8">
      ${content}
    </main>
  </div>
</div>

<script>
// ── Notificações ──
let notifOpen = false
function toggleNotifPanel() {
  notifOpen = !notifOpen
  document.getElementById('notifPanel').style.display = notifOpen ? 'block' : 'none'
  if (notifOpen) loadNotifs()
}
document.addEventListener('click', (e) => {
  if (!document.getElementById('btnNotif').contains(e.target) && !document.getElementById('notifPanel').contains(e.target)) {
    notifOpen = false
    document.getElementById('notifPanel').style.display = 'none'
  }
})

async function loadNotifs() {
  const res = await axios.get('/api/notifications?limit=15')
  const { data, unread_count } = res.data
  const badge = document.getElementById('notifBadge')
  badge.classList.toggle('hidden', unread_count === 0)

  const lista = document.getElementById('notifLista')
  if (!data.length) {
    lista.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm"><i class="fas fa-check-circle text-2xl mb-2 block text-green-400"></i>Nenhuma notificação</div>'
    return
  }

  const tipoIcons = { INFO:'fa-info-circle text-blue-500', SUCESSO:'fa-check-circle text-green-500', AVISO:'fa-exclamation-triangle text-amber-500', ERRO:'fa-times-circle text-red-500' }
  lista.innerHTML = data.map(n => \`
    <div class="px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors \${n.lida ? 'opacity-60' : ''}" onclick="lerNotif(\${n.id}, '\${n.link || ''}')">
      <div class="flex items-start gap-3">
        <i class="fas \${tipoIcons[n.tipo] || tipoIcons.INFO} mt-0.5 shrink-0 text-sm"></i>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-medium text-gray-800 truncate">\${n.titulo}</p>
            \${!n.lida ? '<div class="w-2 h-2 bg-blue-500 rounded-full shrink-0"></div>' : ''}
          </div>
          <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">\${n.mensagem}</p>
          <p class="text-xs text-gray-300 mt-1">\${new Date(n.created_at).toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </div>
  \`).join('')
}

async function lerNotif(id, link) {
  await axios.patch('/api/notifications/' + id + '/read')
  loadNotifs()
  pollNotifs()
  if (link) window.location.href = link
}

async function marcarTodasLidas() {
  await axios.post('/api/notifications/read-all')
  loadNotifs()
  pollNotifs()
}

async function pollNotifs() {
  const res = await axios.get('/api/notifications/unread-count')
  const badge = document.getElementById('notifBadge')
  badge.classList.toggle('hidden', res.data.count === 0)
}

// Polling a cada 30s
pollNotifs()
setInterval(pollNotifs, 30000)

// ── Logout ──
async function logout() {
  await axios.post('/api/auth/logout')
  window.location.href = '/login'
}
</script>
</body></html>`
}

// ============================================================
// LOGIN PAGE
// ============================================================
app.get('/login', (c) => {
  const user = c.get('user')
  if (user) return c.redirect('/')

  return c.html(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Login — SisGPed</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <style>
    body { font-family:'Segoe UI',system-ui,sans-serif; }
    .spinner{border:3px solid #f3f3f3;border-top:3px solid #3b82f6;border-radius:50%;width:20px;height:20px;animation:spin .8s linear infinite;display:inline-block}
    @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    .fade-in{animation:fadeIn .4s ease-in}
    @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  </style>
</head>
<body class="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
  <div class="w-full max-w-md fade-in">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-3xl mb-4 backdrop-blur-sm">
        <i class="fas fa-chalkboard-teacher text-white text-4xl"></i>
      </div>
      <h1 class="text-3xl font-bold text-white">SisGPed</h1>
      <p class="text-blue-200 mt-1 text-sm">Sistema de Gestão de Serviços Pedagógicos</p>
    </div>

    <!-- Card de Login -->
    <div class="bg-white rounded-3xl shadow-2xl p-8">
      <h2 class="text-xl font-bold text-gray-800 mb-1">Bem-vindo(a)!</h2>
      <p class="text-gray-500 text-sm mb-6">Faça login para continuar</p>

      <div id="alertLogin"></div>

      <form id="formLogin" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
          <div class="relative">
            <i class="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input type="email" id="loginEmail" placeholder="seu@email.com" required
              class="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
          <div class="relative">
            <i class="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            <input type="password" id="loginSenha" placeholder="••••••••" required
              class="w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
            <button type="button" onclick="toggleSenha()" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              <i id="iconSenha" class="fas fa-eye text-sm"></i>
            </button>
          </div>
        </div>
        <button type="submit" id="btnLogin"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2">
          <i class="fas fa-sign-in-alt"></i> Entrar
        </button>
      </form>

      <!-- Credenciais demo -->
      <div class="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p class="text-xs font-semibold text-blue-700 mb-2"><i class="fas fa-info-circle mr-1"></i>Acesso de demonstração</p>
        <div class="grid grid-cols-2 gap-3 text-xs">
          <button onclick="preencherGestor()" class="p-2.5 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors text-left">
            <p class="font-semibold text-blue-700"><i class="fas fa-user-tie mr-1"></i>Gestor</p>
            <p class="text-gray-500 mt-0.5">gestor@dep.edu.br</p>
          </button>
          <button onclick="preencherInstrutor()" class="p-2.5 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors text-left">
            <p class="font-semibold text-blue-700"><i class="fas fa-chalkboard-teacher mr-1"></i>Instrutor</p>
            <p class="text-gray-500 mt-0.5">ana.silva@dep.edu.br</p>
          </button>
        </div>
      </div>
    </div>
    <p class="text-center text-blue-200 text-xs mt-6">© 2026 Divisão de Educação Profissional</p>
  </div>

  <script>
  function toggleSenha() {
    const input = document.getElementById('loginSenha')
    const icon = document.getElementById('iconSenha')
    if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash text-sm' }
    else { input.type = 'password'; icon.className = 'fas fa-eye text-sm' }
  }
  function preencherGestor() {
    document.getElementById('loginEmail').value = 'gestor@dep.edu.br'
    document.getElementById('loginSenha').value = 'gestor123'
  }
  function preencherInstrutor() {
    document.getElementById('loginEmail').value = 'ana.silva@dep.edu.br'
    document.getElementById('loginSenha').value = 'instrutor123'
  }
  document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('btnLogin')
    btn.disabled = true
    btn.innerHTML = '<div class="spinner"></div> Entrando...'
    try {
      const res = await axios.post('/api/auth/login', {
        email: document.getElementById('loginEmail').value,
        senha: document.getElementById('loginSenha').value
      })
      window.location.href = '/'
    } catch(err) {
      const msg = err.response?.data?.message || 'Erro ao fazer login'
      document.getElementById('alertLogin').innerHTML = '<div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center gap-2"><i class="fas fa-exclamation-circle"></i>' + msg + '</div>'
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar'
    }
  })
  </script>
</body></html>`)
})

// ============================================================
// DASHBOARD PAGE
// ============================================================
app.get('/', requireAuth, (c) => {
  const user = c.get('user')!
  const isGestor = user.perfil === 'GESTOR'

  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p class="text-gray-500 mt-1">Olá, <strong>${user.nome}</strong>! Aqui está o resumo dos serviços.</p>
      </div>
      <div class="flex gap-3">
        <select id="filtroMes" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todos os meses</option>
          ${Array.from({length:12},(_,i)=>{const m=String(i+1).padStart(2,'0');const n=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];return`<option value="${m}">${n[i]}</option>`}).join('')}
        </select>
        <select id="filtroAno" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todos os anos</option>
          ${[2024,2025,2026].map(y=>`<option value="${y}" ${y===new Date().getFullYear()?'selected':''}>${y}</option>`).join('')}
        </select>
        <button onclick="loadDashboard()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"><i class="fas fa-sync-alt mr-2"></i>Atualizar</button>
      </div>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover"><div class="flex items-center justify-between"><div><p class="text-gray-500 text-sm">Total</p><p id="sTotal" class="text-3xl font-bold text-gray-800 mt-1">—</p></div><div class="bg-blue-100 rounded-xl p-3"><i class="fas fa-file-alt text-blue-600 text-xl"></i></div></div></div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover"><div class="flex items-center justify-between"><div><p class="text-gray-500 text-sm">Pendentes</p><p id="sPendentes" class="text-3xl font-bold text-amber-500 mt-1">—</p></div><div class="bg-amber-100 rounded-xl p-3"><i class="fas fa-clock text-amber-500 text-xl"></i></div></div></div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover"><div class="flex items-center justify-between"><div><p class="text-gray-500 text-sm">Total Horas</p><p id="sHoras" class="text-3xl font-bold text-green-600 mt-1">—</p></div><div class="bg-green-100 rounded-xl p-3"><i class="fas fa-hourglass-half text-green-600 text-xl"></i></div></div></div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover"><div class="flex items-center justify-between"><div><p class="text-gray-500 text-sm">Valor Consultorias</p><p id="sValor" class="text-2xl font-bold text-purple-600 mt-1">—</p></div><div class="bg-purple-100 rounded-xl p-3"><i class="fas fa-dollar-sign text-purple-600 text-xl"></i></div></div></div>
    </div>
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover"><div class="flex items-center justify-between"><div><p class="text-gray-500 text-sm">Aprovados</p><p id="sAprovados" class="text-3xl font-bold text-green-600 mt-1">—</p></div><div class="bg-green-100 rounded-xl p-3"><i class="fas fa-check-circle text-green-600 text-xl"></i></div></div></div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover"><div class="flex items-center justify-between"><div><p class="text-gray-500 text-sm">Pagos</p><p id="sPagos" class="text-3xl font-bold text-blue-600 mt-1">—</p></div><div class="bg-blue-100 rounded-xl p-3"><i class="fas fa-money-check-alt text-blue-600 text-xl"></i></div></div></div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover"><div class="flex items-center justify-between"><div><p class="text-gray-500 text-sm">Consultorias</p><p id="sConsultorias" class="text-3xl font-bold text-indigo-600 mt-1">—</p></div><div class="bg-indigo-100 rounded-xl p-3"><i class="fas fa-briefcase text-indigo-600 text-xl"></i></div></div></div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover"><div class="flex items-center justify-between"><div><p class="text-gray-500 text-sm">Demandas DEP</p><p id="sDEP" class="text-3xl font-bold text-teal-600 mt-1">—</p></div><div class="bg-teal-100 rounded-xl p-3"><i class="fas fa-school text-teal-600 text-xl"></i></div></div></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 class="text-base font-semibold text-gray-700 mb-4"><i class="fas fa-chart-doughnut text-blue-500 mr-2"></i>Distribuição por Tipo</h3>
        <div class="flex items-center justify-center" style="height:200px"><canvas id="chartTipo"></canvas></div>
      </div>
      ${isGestor ? `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 class="text-base font-semibold text-gray-700 mb-4"><i class="fas fa-user-tie text-blue-500 mr-2"></i>Top Instrutores</h3>
        <div id="topInstrutores" class="space-y-2"><div class="text-center py-8 text-gray-400"><div class="spinner mx-auto mb-2"></div></div></div>
      </div>` : `
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 class="text-base font-semibold text-gray-700 mb-4"><i class="fas fa-chart-bar text-blue-500 mr-2"></i>Meus Serviços por Status</h3>
        <div class="flex items-center justify-center" style="height:200px"><canvas id="chartStatus"></canvas></div>
      </div>`}
    </div>

    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-gray-700"><i class="fas fa-history text-blue-500 mr-2"></i>Registros Recentes</h3>
        <a href="/servicos" class="text-blue-600 text-sm hover:underline">Ver todos <i class="fas fa-arrow-right ml-1"></i></a>
      </div>
      <div id="recentes"><div class="text-center py-8 text-gray-400"><div class="spinner mx-auto mb-2"></div></div></div>
    </div>
  </div>

  <script>
  let chartTipo = null, chartStatus = null
  const isGestor = ${isGestor}

  function fc(v) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0) }
  function fd(d) { if(!d)return'—';const[y,m,day]=d.split('-');return day+'/'+m+'/'+y }
  function sb(s) { const l={PENDENTE:'Pendente',APROVADO:'Aprovado',REJEITADO:'Rejeitado',PAGO:'Pago'};return '<span class="status-'+s+' text-xs px-2.5 py-1 rounded-full font-medium">'+(l[s]||s)+'</span>' }

  async function loadDashboard() {
    const mes=document.getElementById('filtroMes').value, ano=document.getElementById('filtroAno').value
    const p=new URLSearchParams(); if(mes)p.set('mes',mes); if(ano)p.set('ano',ano)
    const res = await axios.get('/api/dashboard/stats?'+p.toString())
    const { stats, por_instrutor, por_tipo, recentes } = res.data.data

    document.getElementById('sTotal').textContent = stats.total||0
    document.getElementById('sPendentes').textContent = stats.pendentes||0
    document.getElementById('sHoras').textContent = (stats.total_horas||0).toFixed(1)+'h'
    document.getElementById('sValor').textContent = fc(stats.total_valor_consultoria)
    document.getElementById('sAprovados').textContent = stats.aprovados||0
    document.getElementById('sPagos').textContent = stats.pagos||0
    document.getElementById('sConsultorias').textContent = stats.consultorias||0
    document.getElementById('sDEP').textContent = stats.demandas_dep||0

    if(chartTipo) chartTipo.destroy()
    chartTipo = new Chart(document.getElementById('chartTipo').getContext('2d'),{
      type:'doughnut',
      data:{labels:['Consultorias','Demandas DEP'],datasets:[{data:[stats.consultorias||0,stats.demandas_dep||0],backgroundColor:['#6366f1','#14b8a6'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}}}
    })

    if(isGestor) {
      const ti = document.getElementById('topInstrutores')
      ti.innerHTML = por_instrutor.length ? por_instrutor.map(i=>\`
        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div><p class="font-medium text-gray-800 text-sm">\${i.nome_instrutor||'Instrutor'}</p><p class="text-gray-500 text-xs">Mat: \${i.matricula_instrutor}</p></div>
          <div class="text-right"><p class="text-sm font-semibold text-gray-700">\${i.total_servicos} serviços</p><p class="text-xs text-gray-400">\${i.total_horas}h</p></div>
        </div>\`).join('') : '<p class="text-center text-gray-400 text-sm py-4">Nenhum dado</p>'
    } else {
      if(chartStatus) chartStatus.destroy()
      chartStatus = new Chart(document.getElementById('chartStatus').getContext('2d'),{
        type:'bar',
        data:{
          labels:['Pendentes','Aprovados','Pagos','Rejeitados'],
          datasets:[{data:[stats.pendentes||0,stats.aprovados||0,stats.pagos||0,stats.rejeitados||0],backgroundColor:['#fbbf24','#10b981','#3b82f6','#ef4444'],borderRadius:8,borderWidth:0}]
        },
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}
      })
    }

    const re = document.getElementById('recentes')
    re.innerHTML = recentes.length ? \`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-gray-500 border-b border-gray-100"><th class="pb-3 font-medium">Instrutor</th><th class="pb-3 font-medium">Data</th><th class="pb-3 font-medium">Tipo</th><th class="pb-3 font-medium">Status</th><th class="pb-3 font-medium">Horas</th></tr></thead><tbody class="divide-y divide-gray-50">\${recentes.map(r=>\`<tr><td class="py-3 font-medium text-gray-800">\${r.nome_instrutor||r.matricula_instrutor}</td><td class="py-3 text-gray-500">\${fd(r.data_servico)}</td><td class="py-3"><span class="px-2 py-1 rounded-md text-xs font-medium \${r.tipo_demanda==='CONSULTORIA'?'bg-indigo-100 text-indigo-700':'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span></td><td class="py-3">\${sb(r.status)}</td><td class="py-3 text-gray-500">\${r.duracao_horas}h</td></tr>\`).join('')}</tbody></table></div>\` : '<p class="text-center text-gray-400 text-sm py-4">Nenhum registro recente</p>'
  }

  document.getElementById('filtroMes').addEventListener('change',loadDashboard)
  document.getElementById('filtroAno').addEventListener('change',loadDashboard)
  loadDashboard()
  </script>`

  return c.html(layout('Dashboard', content, 'dashboard', user))
})

// ============================================================
// NOVO SERVIÇO
// ============================================================
app.get('/novo-servico', requireAuth, (c) => {
  const user = c.get('user')!
  const content = `
  <div class="fade-in max-w-3xl">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-800">Registrar Serviço Pedagógico</h2>
      <p class="text-gray-500 mt-1">Preencha os dados do serviço prestado</p>
    </div>
    <div id="alertArea"></div>
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 class="text-white font-semibold"><i class="fas fa-plus-circle mr-2"></i>Novo Registro</h3>
      </div>
      <form id="formServico" class="p-6 space-y-6">
        <div>
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><i class="fas fa-user text-blue-500"></i>Dados do Instrutor</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Matrícula <span class="text-red-500">*</span></label>
              <div class="relative">
                <input type="text" id="matricula" name="matricula" required placeholder="Ex: 12345"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  oninput="buscarInstrutor(this.value)" value="${user.matricula || ''}">
                <div id="loadingMat" class="absolute right-3 top-1/2 -translate-y-1/2 hidden"><div class="spinner" style="width:16px;height:16px;border-width:2px"></div></div>
              </div>
              <p id="infoInstrutor" class="text-xs mt-1.5"></p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Nome do Instrutor</label>
              <input type="text" id="nome_instrutor" name="nome_instrutor" placeholder="Preenchido automaticamente"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50">
            </div>
          </div>
        </div>
        <hr class="border-gray-100">
        <div>
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><i class="fas fa-calendar-alt text-blue-500"></i>Dados do Serviço</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Data do Serviço <span class="text-red-500">*</span></label>
              <input type="date" id="data_servico" name="data_servico" required class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Hora Início <span class="text-red-500">*</span></label>
              <input type="time" id="hora_inicio" name="hora_inicio" required onchange="calcular()"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Hora Fim <span class="text-red-500">*</span></label>
              <input type="time" id="hora_fim" name="hora_fim" required onchange="calcular()"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
            </div>
          </div>
          <div id="duracaoPreview" class="hidden mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p class="text-blue-700 text-sm font-medium"><i class="fas fa-clock mr-2"></i><span id="duracaoTexto"></span></p>
          </div>
        </div>
        <hr class="border-gray-100">
        <div>
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><i class="fas fa-tag text-blue-500"></i>Tipo de Demanda</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label class="cursor-pointer">
              <input type="radio" name="tipo_demanda" value="CONSULTORIA" class="sr-only peer" onchange="onTipo()">
              <div class="p-4 rounded-xl border-2 border-gray-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 transition-all hover:border-gray-300">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0"><i class="fas fa-briefcase text-indigo-600"></i></div>
                  <div><p class="font-semibold text-gray-800">Consultoria</p><p class="text-xs text-gray-500 mt-0.5">+30% adicional sobre valor hora-aula</p></div>
                </div>
              </div>
            </label>
            <label class="cursor-pointer">
              <input type="radio" name="tipo_demanda" value="DEP" class="sr-only peer" onchange="onTipo()">
              <div class="p-4 rounded-xl border-2 border-gray-200 peer-checked:border-teal-500 peer-checked:bg-teal-50 transition-all hover:border-gray-300">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0"><i class="fas fa-school text-teal-600"></i></div>
                  <div><p class="font-semibold text-gray-800">Demanda DEP</p><p class="text-xs text-gray-500 mt-0.5">Sem pagamento adicional</p></div>
                </div>
              </div>
            </label>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Serviço Específico</label>
              <select id="service_type_id" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white">
                <option value="">— Selecione —</option>
              </select>
            </div>
            <div id="campoValor" class="hidden">
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Valor Hora-Aula (R$) <span class="text-red-500">*</span></label>
              <input type="number" id="valor_hora_aula" step="0.01" min="0" placeholder="Ex: 45.00"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" oninput="calcular()">
            </div>
          </div>
          <div id="valorPreview" class="hidden mt-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div class="flex justify-between items-center">
              <p class="text-sm text-indigo-700"><span id="vHoras"></span>h × R$<span id="vHA"></span>/h × 1,30</p>
              <div class="text-right"><p class="text-xs text-indigo-500">Valor estimado</p><p class="text-xl font-bold text-indigo-700">R$ <span id="vTotal"></span></p></div>
            </div>
          </div>
        </div>
        <hr class="border-gray-100">
        <div>
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2"><i class="fas fa-align-left text-blue-500"></i>Descrição</h4>
          <textarea id="descricao_atividade" required rows="4" placeholder="Descreva detalhadamente a atividade pedagógica realizada..."
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"></textarea>
          <textarea id="observacoes" rows="2" placeholder="Observações adicionais (opcional)..." class="w-full mt-3 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"></textarea>
        </div>
        <div class="flex gap-3 pt-2">
          <button type="submit" id="btnSubmit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2">
            <i class="fas fa-save"></i>Registrar Serviço
          </button>
          <button type="reset" onclick="resetForm()" class="px-6 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            <i class="fas fa-times mr-2"></i>Limpar
          </button>
        </div>
      </form>
    </div>
  </div>
  <script>
  let tipoAtual=null, timer=null
  const stypes={CONSULTORIA:[],DEP:[]}

  async function loadTypes() {
    const res = await axios.get('/api/service-types')
    res.data.data.forEach(t=>{ if(stypes[t.categoria]) stypes[t.categoria].push(t) })
  }

  async function buscarInstrutor(v) {
    clearTimeout(timer)
    const info=document.getElementById('infoInstrutor')
    if(v.length<3){info.textContent='';return}
    timer=setTimeout(async()=>{
      document.getElementById('loadingMat').classList.remove('hidden')
      try {
        const res=await axios.get('/api/instructors/by-matricula/'+v)
        const i=res.data.data
        document.getElementById('nome_instrutor').value=i.nome
        document.getElementById('valor_hora_aula').value=i.valor_hora_aula
        info.innerHTML='<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>'+i.nome+'</span>'
        calcular()
      } catch {
        document.getElementById('nome_instrutor').value=''
        info.innerHTML='<span class="text-gray-400"><i class="fas fa-info-circle mr-1"></i>Não encontrado no cadastro</span>'
      } finally { document.getElementById('loadingMat').classList.add('hidden') }
    },600)
  }

  function onTipo() {
    tipoAtual=document.querySelector('input[name="tipo_demanda"]:checked')?.value
    const sel=document.getElementById('service_type_id')
    sel.innerHTML='<option value="">— Selecione —</option>'
    if(tipoAtual&&stypes[tipoAtual]) stypes[tipoAtual].forEach(t=>sel.innerHTML+=\`<option value="\${t.id}">\${t.nome}</option>\`)
    document.getElementById('campoValor').classList.toggle('hidden',tipoAtual!=='CONSULTORIA')
    if(tipoAtual!=='CONSULTORIA') document.getElementById('valorPreview').classList.add('hidden')
    calcular()
  }

  function calcular() {
    const hi=document.getElementById('hora_inicio').value, hf=document.getElementById('hora_fim').value
    const vha=parseFloat(document.getElementById('valor_hora_aula').value)||0
    if(!hi||!hf)return
    const [h1,m1]=hi.split(':').map(Number), [h2,m2]=hf.split(':').map(Number)
    const min=(h2*60+m2)-(h1*60+m1)
    if(min<=0){document.getElementById('duracaoPreview').classList.add('hidden');return}
    const horas=min/60
    const h=Math.floor(horas), m=Math.round((horas-h)*60)
    document.getElementById('duracaoPreview').classList.remove('hidden')
    document.getElementById('duracaoTexto').textContent='Duração: '+(h>0?h+'h':'')+(m>0?m+'min':'')
    if(tipoAtual==='CONSULTORIA'&&vha>0) {
      const total=(horas*vha*1.30)
      document.getElementById('valorPreview').classList.remove('hidden')
      document.getElementById('vHoras').textContent=horas.toFixed(2)
      document.getElementById('vHA').textContent=vha.toFixed(2)
      document.getElementById('vTotal').textContent=total.toFixed(2)
    } else document.getElementById('valorPreview').classList.add('hidden')
  }

  function showAlert(msg,type='success') {
    const c={success:'bg-green-50 border-green-200 text-green-800',error:'bg-red-50 border-red-200 text-red-800'}
    document.getElementById('alertArea').innerHTML=\`<div class="\${c[type]} border rounded-xl p-4 mb-6 text-sm flex items-start gap-3 fade-in"><i class="fas \${type==='success'?'fa-check-circle':'fa-exclamation-circle'} mt-0.5"></i><p>\${msg}</p></div>\`
    window.scrollTo({top:0,behavior:'smooth'})
    setTimeout(()=>document.getElementById('alertArea').innerHTML='',5000)
  }

  function resetForm() { tipoAtual=null; document.getElementById('infoInstrutor').textContent=''; document.getElementById('duracaoPreview').classList.add('hidden'); document.getElementById('valorPreview').classList.add('hidden'); document.getElementById('campoValor').classList.add('hidden'); document.getElementById('service_type_id').innerHTML='<option value="">— Selecione —</option>' }

  document.getElementById('formServico').addEventListener('submit',async(e)=>{
    e.preventDefault()
    const btn=document.getElementById('btnSubmit')
    btn.disabled=true; btn.innerHTML='<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Registrando...'
    const tipo=document.querySelector('input[name="tipo_demanda"]:checked')?.value
    if(!tipo){showAlert('Selecione o tipo de demanda','error');btn.disabled=false;btn.innerHTML='<i class="fas fa-save"></i> Registrar Serviço';return}
    try {
      const res=await axios.post('/api/services',{
        matricula_instrutor:document.getElementById('matricula').value,
        nome_instrutor:document.getElementById('nome_instrutor').value,
        data_servico:document.getElementById('data_servico').value,
        hora_inicio:document.getElementById('hora_inicio').value,
        hora_fim:document.getElementById('hora_fim').value,
        descricao_atividade:document.getElementById('descricao_atividade').value,
        tipo_demanda:tipo,
        service_type_id:document.getElementById('service_type_id').value||null,
        valor_hora_aula:tipo==='CONSULTORIA'?parseFloat(document.getElementById('valor_hora_aula').value)||0:0,
        observacoes:document.getElementById('observacoes').value
      })
      showAlert('✅ Serviço registrado com sucesso! ID #'+res.data.data.id)
      document.getElementById('formServico').reset(); resetForm()
    } catch(err) { showAlert(err.response?.data?.message||'Erro ao registrar','error') }
    finally { btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Registrar Serviço' }
  })

  document.getElementById('data_servico').value=new Date().toISOString().split('T')[0]
  loadTypes()
  ${user.matricula ? `buscarInstrutor('${user.matricula}')` : ''}
  </script>`

  return c.html(layout('Registrar Serviço', content, 'novo', user))
})

// ============================================================
// SERVIÇOS
// ============================================================
app.get('/servicos', requireAuth, (c) => {
  const user = c.get('user')!
  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div><h2 class="text-2xl font-bold text-gray-800">Serviços Registrados</h2><p class="text-gray-500 mt-1">Consulte e acompanhe os registros</p></div>
      <a href="/novo-servico" class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"><i class="fas fa-plus"></i>Novo</a>
    </div>
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Matrícula</label><input id="fMat" type="text" placeholder="Filtrar..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Tipo</label><select id="fTipo" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"><option value="">Todos</option><option value="CONSULTORIA">Consultoria</option><option value="DEP">DEP</option></select></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Status</label><select id="fStatus" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"><option value="">Todos</option><option value="PENDENTE">Pendente</option><option value="APROVADO">Aprovado</option><option value="REJEITADO">Rejeitado</option><option value="PAGO">Pago</option></select></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Data Início</label><input id="fDI" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Data Fim</label><input id="fDF" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div class="flex items-end"><button onclick="load(1)" class="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 transition-colors"><i class="fas fa-search mr-1"></i>Buscar</button></div>
      </div>
    </div>
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div id="loading" class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div><p class="text-sm">Carregando...</p></div>
      <div id="tabela" class="hidden"></div>
    </div>
  </div>

  <div id="modal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
      <div class="flex items-center justify-between p-6 border-b border-gray-100"><h3 class="text-lg font-bold text-gray-800">Detalhes do Serviço</h3><button onclick="document.getElementById('modal').classList.add('hidden')" class="p-2 hover:bg-gray-100 rounded-xl"><i class="fas fa-times text-gray-500"></i></button></div>
      <div id="modalBody" class="p-6"></div>
    </div>
  </div>

  <script>
  function fc(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)}
  function fd(d){if(!d)return'—';const[y,m,day]=d.split('-');return day+'/'+m+'/'+y}
  function sb(s){const l={PENDENTE:'Pendente',APROVADO:'Aprovado',REJEITADO:'Rejeitado',PAGO:'Pago'};return'<span class="status-'+s+' text-xs px-2.5 py-1 rounded-full font-medium">'+(l[s]||s)+'</span>'}

  async function load(page=1) {
    document.getElementById('loading').classList.remove('hidden')
    document.getElementById('tabela').classList.add('hidden')
    const p=new URLSearchParams({page,limit:20})
    const m=document.getElementById('fMat').value, t=document.getElementById('fTipo').value
    const s=document.getElementById('fStatus').value, di=document.getElementById('fDI').value, df=document.getElementById('fDF').value
    if(m)p.set('matricula',m); if(t)p.set('tipo_demanda',t); if(s)p.set('status',s); if(di)p.set('data_inicio',di); if(df)p.set('data_fim',df)
    const res=await axios.get('/api/services?'+p.toString())
    const {data,pagination}=res.data
    document.getElementById('loading').classList.add('hidden')
    const tab=document.getElementById('tabela'); tab.classList.remove('hidden')
    if(!data.length){tab.innerHTML='<div class="text-center py-12 text-gray-400"><i class="fas fa-inbox text-4xl mb-3 block"></i><p>Nenhum registro encontrado</p></div>';return}
    tab.innerHTML=\`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-100"><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Instrutor</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Horário</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Horas</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th><th class="px-6 py-3"></th></tr></thead><tbody class="divide-y divide-gray-50">\${data.map(r=>\`<tr class="hover:bg-gray-50 transition-colors"><td class="px-6 py-4"><p class="font-medium text-gray-800">\${r.nome_instrutor||'—'}</p><p class="text-xs text-gray-400">Mat: \${r.matricula_instrutor}</p></td><td class="px-6 py-4 text-gray-600">\${fd(r.data_servico)}</td><td class="px-6 py-4 text-gray-600">\${r.hora_inicio}–\${r.hora_fim}</td><td class="px-6 py-4"><span class="px-2.5 py-1 rounded-full text-xs font-medium \${r.tipo_demanda==='CONSULTORIA'?'bg-indigo-100 text-indigo-700':'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span></td><td class="px-6 py-4 text-gray-600">\${r.duracao_horas}h</td><td class="px-6 py-4 text-gray-600">\${r.tipo_demanda==='CONSULTORIA'?fc(r.valor_calculado):'—'}</td><td class="px-6 py-4">\${sb(r.status)}</td><td class="px-6 py-4"><button onclick="ver(\${r.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><i class="fas fa-eye"></i></button></td></tr>\`).join('')}</tbody></table></div><div class="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500"><span>Total: <strong>\${pagination.total}</strong></span><div class="flex gap-2">\${pagination.page>1?\`<button onclick="load(\${pagination.page-1})" class="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">← Anterior</button>\`:''}<span>Pág. \${pagination.page}/\${pagination.pages}</span>\${pagination.page<pagination.pages?\`<button onclick="load(\${pagination.page+1})" class="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Próxima →</button>\`:''}</div></div>\`
  }

  async function ver(id) {
    const res=await axios.get('/api/services/'+id)
    const r=res.data.data
    function fd2(d){if(!d)return'—';const[y,m,day]=d.split('-');return day+'/'+m+'/'+y}
    function fc2(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)}
    document.getElementById('modalBody').innerHTML=\`<div class="space-y-4"><div class="grid grid-cols-2 gap-4"><div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-1">Instrutor</p><p class="font-semibold text-gray-800">\${r.nome_instrutor||'—'}</p><p class="text-sm text-gray-500">Mat: \${r.matricula_instrutor}</p></div><div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-1">Data e Horário</p><p class="font-semibold text-gray-800">\${fd2(r.data_servico)}</p><p class="text-sm text-gray-500">\${r.hora_inicio} às \${r.hora_fim} (\${r.duracao_horas}h)</p></div></div><div class="grid grid-cols-3 gap-4 text-center"><div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-1">Tipo</p><span class="px-2.5 py-1 rounded-full text-xs font-medium \${r.tipo_demanda==='CONSULTORIA'?'bg-indigo-100 text-indigo-700':'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span></div><div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-1">Status</p>\${sb(r.status)}</div><div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-1">Valor</p><p class="font-bold text-gray-800">\${r.tipo_demanda==='CONSULTORIA'?fc2(r.valor_calculado):'N/A'}</p></div></div>\${r.tipo_servico_nome?\`<div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-1">Tipo de Serviço</p><p class="font-medium text-gray-800">\${r.tipo_servico_nome}</p></div>\`:''}<div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-2">Descrição da Atividade</p><p class="text-sm text-gray-800 leading-relaxed">\${r.descricao_atividade}</p></div>\${r.observacoes?\`<div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-1">Observações</p><p class="text-sm text-gray-600">\${r.observacoes}</p></div>\`:''}\${r.observacoes_gestor?\`<div class="bg-blue-50 rounded-xl p-4 border border-blue-100"><p class="text-xs text-blue-500 mb-1"><i class="fas fa-user-tie mr-1"></i>Obs. do Gestor</p><p class="text-sm text-blue-800">\${r.observacoes_gestor}</p></div>\`:''}<p class="text-xs text-gray-400">Registrado em: \${new Date(r.created_at).toLocaleString('pt-BR')}</p></div>\`
    document.getElementById('modal').classList.remove('hidden')
  }

  document.getElementById('modal').addEventListener('click',(e)=>{if(e.target===document.getElementById('modal'))document.getElementById('modal').classList.add('hidden')})
  load()
  </script>`

  return c.html(layout('Serviços', content, 'servicos', user))
})

// ============================================================
// GESTÃO (só Gestor)
// ============================================================
app.get('/gestao', requireGestor, (c) => {
  const user = c.get('user')!
  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div><h2 class="text-2xl font-bold text-gray-800">Gestão de Serviços</h2><p class="text-gray-500 mt-1">Painel da Divisão de Educação Profissional</p></div>
    </div>
    <div class="flex gap-2 mb-6 flex-wrap">
      <button onclick="setTab('PENDENTE')" id="tab-PENDENTE" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium bg-amber-500 text-white transition-colors"><i class="fas fa-clock mr-2"></i>Pendentes</button>
      <button onclick="setTab('APROVADO')" id="tab-APROVADO" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"><i class="fas fa-check-circle mr-2"></i>Aprovados</button>
      <button onclick="setTab('PAGO')" id="tab-PAGO" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"><i class="fas fa-money-check-alt mr-2"></i>Pagos</button>
      <button onclick="setTab('REJEITADO')" id="tab-REJEITADO" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"><i class="fas fa-times-circle mr-2"></i>Rejeitados</button>
      <button onclick="setTab('')" id="tab-TODOS" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"><i class="fas fa-list mr-2"></i>Todos</button>
    </div>
    <div id="alert" class="mb-4"></div>
    <div id="lista" class="space-y-4"><div class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div><p class="text-sm">Carregando...</p></div></div>
  </div>

  <div id="modalAcao" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full">
      <div class="flex items-center justify-between p-6 border-b border-gray-100"><h3 id="mTitulo" class="text-lg font-bold text-gray-800">Atualizar Status</h3><button onclick="document.getElementById('modalAcao').classList.add('hidden')" class="p-2 hover:bg-gray-100 rounded-xl"><i class="fas fa-times text-gray-500"></i></button></div>
      <div class="p-6">
        <input type="hidden" id="aId"><input type="hidden" id="aStatus">
        <label class="block text-sm font-medium text-gray-700 mb-2">Observações do Gestor</label>
        <textarea id="aObs" rows="3" placeholder="Comentários (opcional)..." class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none mb-4"></textarea>
        <div class="flex gap-3">
          <button onclick="confirmar()" id="btnConf" class="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-colors">Confirmar</button>
          <button onclick="document.getElementById('modalAcao').classList.add('hidden')" class="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  </div>

  <script>
  let tabAtual='PENDENTE'
  function fc(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)}
  function fd(d){if(!d)return'—';const[y,m,day]=d.split('-');return day+'/'+m+'/'+y}
  function sb(s){const l={PENDENTE:'Pendente',APROVADO:'Aprovado',REJEITADO:'Rejeitado',PAGO:'Pago'};return'<span class="status-'+s+' text-xs px-2.5 py-1 rounded-full font-medium">'+(l[s]||s)+'</span>'}

  function setTab(s) {
    tabAtual=s
    document.querySelectorAll('.tab-btn').forEach(b=>{b.className='tab-btn px-5 py-2.5 rounded-xl text-sm font-medium bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors'})
    const colors={PENDENTE:'bg-amber-500 text-white',APROVADO:'bg-green-600 text-white',PAGO:'bg-blue-600 text-white',REJEITADO:'bg-red-500 text-white','':'bg-gray-700 text-white'}
    const el=document.getElementById('tab-'+(s||'TODOS'))
    if(el) el.className='tab-btn px-5 py-2.5 rounded-xl text-sm font-medium '+(colors[s]||'bg-gray-700 text-white')+' transition-colors'
    carregarLista()
  }

  async function carregarLista() {
    const lista=document.getElementById('lista')
    lista.innerHTML='<div class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div><p class="text-sm">Carregando...</p></div>'
    const p=new URLSearchParams({limit:'50'}); if(tabAtual)p.set('status',tabAtual)
    const res=await axios.get('/api/services?'+p.toString())
    const {data}=res.data
    if(!data.length){lista.innerHTML='<div class="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm"><i class="fas fa-inbox text-4xl mb-3 block"></i><p>Nenhum registro neste status</p></div>';return}
    lista.innerHTML=data.map(r=>\`
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover fade-in">
        <div class="flex items-start gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center"><i class="fas fa-user text-blue-600"></i></div>
              <div class="flex-1">
                <p class="font-semibold text-gray-800">\${r.nome_instrutor||'Instrutor'}</p>
                <p class="text-xs text-gray-400">Mat: \${r.matricula_instrutor} · #\${r.id}</p>
              </div>
              <span class="px-2.5 py-1 rounded-full text-xs font-medium \${r.tipo_demanda==='CONSULTORIA'?'bg-indigo-100 text-indigo-700':'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span>
              \${sb(r.status)}
            </div>
            <div class="grid grid-cols-3 gap-3 mb-3 text-sm">
              <div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-0.5">Data</p><p class="font-medium text-gray-700">\${fd(r.data_servico)}</p></div>
              <div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-0.5">Horário</p><p class="font-medium text-gray-700">\${r.hora_inicio}–\${r.hora_fim} (\${r.duracao_horas}h)</p></div>
              <div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-0.5">Valor</p><p class="font-medium text-gray-700">\${r.tipo_demanda==='CONSULTORIA'?fc(r.valor_calculado):'N/A (DEP)'}</p></div>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 mb-3"><p class="text-xs text-gray-400 mb-1">Atividade</p><p class="text-sm text-gray-700 line-clamp-2">\${r.descricao_atividade}</p></div>
            \${r.observacoes_gestor?\`<div class="bg-blue-50 rounded-xl p-3 border border-blue-100"><p class="text-xs text-blue-500 mb-1"><i class="fas fa-comment mr-1"></i>Obs. gestor</p><p class="text-sm text-blue-800">\${r.observacoes_gestor}</p></div>\`:''}
          </div>
        </div>
        <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          \${r.status==='PENDENTE'?\`<button onclick="abrir(\${r.id},'APROVADO')" class="px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-xl hover:bg-green-700"><i class="fas fa-check mr-1"></i>Aprovar</button><button onclick="abrir(\${r.id},'REJEITADO')" class="px-4 py-2 bg-red-500 text-white text-xs font-medium rounded-xl hover:bg-red-600"><i class="fas fa-times mr-1"></i>Rejeitar</button>\`:''}
          \${r.status==='APROVADO'?\`<button onclick="abrir(\${r.id},'PAGO')" class="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700"><i class="fas fa-money-check-alt mr-1"></i>Marcar como Pago</button><button onclick="abrir(\${r.id},'PENDENTE')" class="px-4 py-2 bg-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-300"><i class="fas fa-undo mr-1"></i>Reabrir</button>\`:''}
          \${r.status==='REJEITADO'?\`<button onclick="abrir(\${r.id},'PENDENTE')" class="px-4 py-2 bg-amber-500 text-white text-xs font-medium rounded-xl hover:bg-amber-600"><i class="fas fa-undo mr-1"></i>Reabrir</button>\`:''}
        </div>
      </div>\`).join('')
  }

  function abrir(id,status) {
    document.getElementById('aId').value=id; document.getElementById('aStatus').value=status; document.getElementById('aObs').value=''
    const labels={APROVADO:'Aprovar Serviço',REJEITADO:'Rejeitar Serviço',PAGO:'Marcar como Pago',PENDENTE:'Reabrir Serviço'}
    const colors={APROVADO:'bg-green-600 hover:bg-green-700',REJEITADO:'bg-red-500 hover:bg-red-600',PAGO:'bg-blue-600 hover:bg-blue-700',PENDENTE:'bg-amber-500 hover:bg-amber-600'}
    document.getElementById('mTitulo').textContent=labels[status]||'Atualizar Status'
    document.getElementById('btnConf').className='flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors '+(colors[status]||'bg-blue-600')
    document.getElementById('modalAcao').classList.remove('hidden')
  }

  async function confirmar() {
    try {
      await axios.patch('/api/services/'+document.getElementById('aId').value+'/status',{status:document.getElementById('aStatus').value,observacoes_gestor:document.getElementById('aObs').value})
      document.getElementById('modalAcao').classList.add('hidden')
      carregarLista()
      document.getElementById('alert').innerHTML='<div class="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-4 text-sm fade-in"><i class="fas fa-check-circle mr-2"></i>Status atualizado!</div>'
      setTimeout(()=>{document.getElementById('alert').innerHTML=''},3000)
    } catch(err) { alert('Erro: '+(err.response?.data?.message||'Falha')) }
  }

  document.getElementById('modalAcao').addEventListener('click',(e)=>{if(e.target===document.getElementById('modalAcao'))document.getElementById('modalAcao').classList.add('hidden')})
  carregarLista()
  </script>`

  return c.html(layout('Gestão DEP', content, 'gestao', user))
})

// ============================================================
// RELATÓRIOS
// ============================================================
app.get('/relatorios', requireAuth, (c) => {
  const user = c.get('user')!
  const isGestor = user.perfil === 'GESTOR'

  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div><h2 class="text-2xl font-bold text-gray-800">Relatórios e Exportação</h2><p class="text-gray-500 mt-1">Extraia e exporte todos os registros com filtros avançados</p></div>
    </div>

    <!-- Filtros avançados -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fas fa-filter text-blue-500"></i>Filtros</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        ${isGestor ? `<div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Matrícula</label>
          <input id="rMat" type="text" placeholder="Filtrar..." class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>` : ''}
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Tipo de Demanda</label>
          <select id="rTipo" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            <option value="">Todos</option><option value="CONSULTORIA">Consultoria</option><option value="DEP">DEP</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select id="rStatus" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
            <option value="">Todos</option><option value="PENDENTE">Pendente</option><option value="APROVADO">Aprovado</option><option value="REJEITADO">Rejeitado</option><option value="PAGO">Pago</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
          <input id="rDI" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
          <input id="rDF" type="date" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
        </div>
      </div>
      <div class="flex gap-3 mt-4 flex-wrap">
        <button onclick="loadRelatorio()" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <i class="fas fa-search"></i>Buscar Registros
        </button>
        <button onclick="exportarCSV()" class="px-6 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2">
          <i class="fas fa-file-csv"></i>Exportar CSV
        </button>
        <button onclick="imprimirPDF()" class="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2">
          <i class="fas fa-file-pdf"></i>Gerar PDF
        </button>
      </div>
    </div>

    <!-- Resumo -->
    <div id="resumo" class="hidden bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 mb-6 text-white">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div><p class="text-blue-200 text-xs mb-1">Total de Registros</p><p id="rTotal" class="text-3xl font-bold">0</p></div>
        <div><p class="text-blue-200 text-xs mb-1">Total de Horas</p><p id="rHoras" class="text-3xl font-bold">0h</p></div>
        <div><p class="text-blue-200 text-xs mb-1">Valor Total (Consultorias)</p><p id="rValor" class="text-2xl font-bold">R$ 0,00</p></div>
        <div><p class="text-blue-200 text-xs mb-1">Instrutores Envolvidos</p><p id="rInstrutores" class="text-3xl font-bold">0</p></div>
      </div>
    </div>

    <!-- Tabela de resultados -->
    <div id="printArea" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div id="rLoading" class="text-center py-12 text-gray-400">
        <i class="fas fa-file-alt text-4xl mb-3 block text-gray-300"></i>
        <p class="text-sm">Use os filtros acima para buscar registros</p>
      </div>
      <div id="rTabela" class="hidden"></div>
    </div>
  </div>

  <style>
  @media print {
    aside, header, .no-print { display:none !important; }
    main { margin:0 !important; padding:0 !important; }
    #printArea { border:none !important; box-shadow:none !important; }
    .print-header { display:block !important; }
  }
  .print-header { display:none; }
  </style>

  <script>
  let dadosRelatorio = []
  function fc(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)}
  function fd(d){if(!d)return'—';const[y,m,day]=d.split('-');return day+'/'+m+'/'+y}
  function sb(s){const l={PENDENTE:'Pendente',APROVADO:'Aprovado',REJEITADO:'Rejeitado',PAGO:'Pago'};return'<span class="status-'+s+' text-xs px-2 py-0.5 rounded-full font-medium">'+(l[s]||s)+'</span>'}

  function getParams() {
    const p=new URLSearchParams({limit:'500'})
    ${isGestor ? `const m=document.getElementById('rMat')?.value; if(m)p.set('matricula',m)` : ''}
    const t=document.getElementById('rTipo').value, s=document.getElementById('rStatus').value
    const di=document.getElementById('rDI').value, df=document.getElementById('rDF').value
    if(t)p.set('tipo_demanda',t); if(s)p.set('status',s); if(di)p.set('data_inicio',di); if(df)p.set('data_fim',df)
    return p
  }

  async function loadRelatorio() {
    document.getElementById('rLoading').innerHTML='<div class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div><p class="text-sm">Buscando registros...</p></div>'
    document.getElementById('rTabela').classList.add('hidden')
    document.getElementById('resumo').classList.add('hidden')

    const res=await axios.get('/api/services?'+getParams().toString())
    const {data}=res.data
    dadosRelatorio=data

    // Resumo
    const total=data.length
    const horas=data.reduce((a,r)=>a+(r.duracao_horas||0),0)
    const valor=data.filter(r=>r.tipo_demanda==='CONSULTORIA').reduce((a,r)=>a+(r.valor_calculado||0),0)
    const instrs=new Set(data.map(r=>r.matricula_instrutor)).size
    document.getElementById('rTotal').textContent=total
    document.getElementById('rHoras').textContent=horas.toFixed(1)+'h'
    document.getElementById('rValor').textContent=fc(valor)
    document.getElementById('rInstrutores').textContent=instrs
    document.getElementById('resumo').classList.remove('hidden')

    if(!data.length) {
      document.getElementById('rLoading').innerHTML='<div class="text-center py-12 text-gray-400"><i class="fas fa-inbox text-4xl mb-3 block"></i><p>Nenhum registro encontrado</p></div>'
      return
    }
    document.getElementById('rLoading').classList.add('hidden')
    const tab=document.getElementById('rTabela'); tab.classList.remove('hidden')
    tab.innerHTML=\`
      <div class="print-header p-6 border-b border-gray-100">
        <h2 class="text-xl font-bold text-gray-800">SisGPed — Relatório de Serviços Pedagógicos</h2>
        <p class="text-sm text-gray-500">Gerado em: \${new Date().toLocaleString('pt-BR')}</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-100">
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">#</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Instrutor</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Horário</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Atividade</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Horas</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
              <th class="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            \${data.map(r=>\`
              <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3 text-gray-400 text-xs">#\${r.id}</td>
                <td class="px-4 py-3"><p class="font-medium text-gray-800 text-sm">\${r.nome_instrutor||'—'}</p><p class="text-xs text-gray-400">\${r.matricula_instrutor}</p></td>
                <td class="px-4 py-3 text-gray-600 text-sm">\${fd(r.data_servico)}</td>
                <td class="px-4 py-3 text-gray-600 text-sm">\${r.hora_inicio}–\${r.hora_fim}</td>
                <td class="px-4 py-3"><span class="px-2 py-1 rounded-full text-xs font-medium \${r.tipo_demanda==='CONSULTORIA'?'bg-indigo-100 text-indigo-700':'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span></td>
                <td class="px-4 py-3 text-gray-600 text-xs max-w-xs"><p class="line-clamp-2">\${r.descricao_atividade}</p></td>
                <td class="px-4 py-3 text-gray-600 text-sm font-medium">\${r.duracao_horas}h</td>
                <td class="px-4 py-3 text-gray-600 text-sm">\${r.tipo_demanda==='CONSULTORIA'?fc(r.valor_calculado):'—'}</td>
                <td class="px-4 py-3">\${sb(r.status)}</td>
              </tr>
            \`).join('')}
          </tbody>
          <tfoot class="bg-gray-50 border-t-2 border-gray-200">
            <tr>
              <td colspan="6" class="px-4 py-3 text-sm font-bold text-gray-700">TOTAIS</td>
              <td class="px-4 py-3 text-sm font-bold text-gray-700">\${horas.toFixed(1)}h</td>
              <td class="px-4 py-3 text-sm font-bold text-gray-700">\${fc(valor)}</td>
              <td class="px-4 py-3 text-sm text-gray-500">\${total} registros</td>
            </tr>
          </tfoot>
        </table>
      </div>
    \`
  }

  function exportarCSV() {
    const p=getParams()
    window.location.href='/api/services/export/csv?'+p.toString()
  }

  function imprimirPDF() {
    if(!dadosRelatorio.length) { alert('Busque os registros primeiro!'); return }
    window.print()
  }

  // Atalho Enter para buscar
  document.querySelectorAll('input,select').forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter')loadRelatorio()}))
  </script>`

  return c.html(layout('Relatórios', content, 'relatorios', user))
})

// ============================================================
// INSTRUTORES
// ============================================================
app.get('/instrutores', requireGestor, (c) => {
  const user = c.get('user')!
  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div><h2 class="text-2xl font-bold text-gray-800">Instrutores</h2><p class="text-gray-500 mt-1">Cadastro e gestão de instrutores</p></div>
      <button onclick="document.getElementById('formAdd').classList.toggle('hidden')" class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"><i class="fas fa-plus"></i>Novo Instrutor</button>
    </div>
    <div id="alertI"></div>
    <div id="formAdd" class="hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
      <h3 class="text-base font-semibold text-gray-700 mb-4"><i class="fas fa-user-plus text-blue-500 mr-2"></i>Cadastrar Instrutor</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Matrícula *</label><input id="iMat" type="text" placeholder="12345" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Nome *</label><input id="iNome" type="text" placeholder="Nome completo" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">E-mail</label><input id="iEmail" type="email" placeholder="email@dep.edu.br" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Valor Hora-Aula (R$)</label><input id="iValor" type="number" step="0.01" min="0" placeholder="45.00" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
      </div>
      <div class="flex gap-3 mt-4">
        <button onclick="salvar()" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"><i class="fas fa-save mr-2"></i>Salvar</button>
        <button onclick="document.getElementById('formAdd').classList.add('hidden')" class="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
      </div>
    </div>
    <div id="lista" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"><div class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div></div></div>
  </div>
  <script>
  function fc(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0)}
  function showAlert(msg,type='success'){const c={success:'bg-green-50 border-green-200 text-green-800',error:'bg-red-50 border-red-200 text-red-800'};document.getElementById('alertI').innerHTML=\`<div class="\${c[type]} border rounded-xl p-4 mb-4 text-sm fade-in">\${msg}</div>\`;setTimeout(()=>{document.getElementById('alertI').innerHTML=''},4000)}
  async function carregarLista() {
    const res=await axios.get('/api/instructors')
    const data=res.data.data
    const lista=document.getElementById('lista')
    if(!data.length){lista.innerHTML='<div class="text-center py-12 text-gray-400"><i class="fas fa-users text-4xl mb-3 block"></i><p>Nenhum instrutor cadastrado</p></div>';return}
    lista.innerHTML=\`<table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-100"><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Instrutor</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Matrícula</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">E-mail</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Valor Hora-Aula</th></tr></thead><tbody class="divide-y divide-gray-50">\${data.map(i=>\`<tr class="hover:bg-gray-50 transition-colors"><td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">\${(i.nome||'?')[0].toUpperCase()}</div><span class="font-medium text-gray-800">\${i.nome}</span></div></td><td class="px-6 py-4 text-gray-500 font-mono">\${i.matricula}</td><td class="px-6 py-4 text-gray-500">\${i.email||'—'}</td><td class="px-6 py-4 font-semibold text-gray-700">\${fc(i.valor_hora_aula)}</td></tr>\`).join('')}</tbody></table>\`
  }
  async function salvar() {
    const payload={matricula:document.getElementById('iMat').value,nome:document.getElementById('iNome').value,email:document.getElementById('iEmail').value,valor_hora_aula:parseFloat(document.getElementById('iValor').value)||0}
    if(!payload.matricula||!payload.nome){showAlert('<i class="fas fa-times-circle mr-2"></i>Matrícula e nome são obrigatórios','error');return}
    try {
      await axios.post('/api/instructors',payload)
      showAlert('<i class="fas fa-check-circle mr-2"></i>Instrutor cadastrado!')
      document.getElementById('iMat').value='';document.getElementById('iNome').value='';document.getElementById('iEmail').value='';document.getElementById('iValor').value=''
      document.getElementById('formAdd').classList.add('hidden')
      carregarLista()
    } catch(err){showAlert('<i class="fas fa-times-circle mr-2"></i>'+(err.response?.data?.message||'Erro'),'error')}
  }
  carregarLista()
  </script>`

  return c.html(layout('Instrutores', content, 'instrutores', user))
})

// ============================================================
// USUÁRIOS (só Gestor)
// ============================================================
app.get('/usuarios', requireGestor, (c) => {
  const user = c.get('user')!
  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div><h2 class="text-2xl font-bold text-gray-800">Usuários do Sistema</h2><p class="text-gray-500 mt-1">Gerenciar contas de acesso</p></div>
      <button onclick="document.getElementById('formAdd').classList.toggle('hidden')" class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"><i class="fas fa-plus"></i>Novo Usuário</button>
    </div>
    <div id="alertU"></div>
    <div id="formAdd" class="hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
      <h3 class="text-base font-semibold text-gray-700 mb-4"><i class="fas fa-user-plus text-blue-500 mr-2"></i>Cadastrar Usuário</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Nome *</label><input id="uNome" type="text" placeholder="Nome completo" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">E-mail *</label><input id="uEmail" type="email" placeholder="email@dep.edu.br" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Senha *</label><input id="uSenha" type="password" placeholder="Mínimo 6 caracteres" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Perfil *</label><select id="uPerfil" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"><option value="INSTRUTOR">Instrutor</option><option value="GESTOR">Gestor</option></select></div>
        <div><label class="block text-xs font-medium text-gray-500 mb-1">Matrícula (Instrutores)</label><input id="uMat" type="text" placeholder="Somente para instrutores" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"></div>
      </div>
      <div class="flex gap-3 mt-4">
        <button onclick="salvarUser()" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"><i class="fas fa-save mr-2"></i>Criar Usuário</button>
        <button onclick="document.getElementById('formAdd').classList.add('hidden')" class="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
      </div>
    </div>
    <div id="listaU" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"><div class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div></div></div>
  </div>
  <script>
  function showAlert(msg,type='success'){const c={success:'bg-green-50 border-green-200 text-green-800',error:'bg-red-50 border-red-200 text-red-800'};document.getElementById('alertU').innerHTML=\`<div class="\${c[type]} border rounded-xl p-4 mb-4 text-sm fade-in">\${msg}</div>\`;setTimeout(()=>{document.getElementById('alertU').innerHTML=''},4000)}
  async function carregarUsers() {
    const res=await axios.get('/api/auth/users')
    const data=res.data.data
    const lista=document.getElementById('listaU')
    if(!data.length){lista.innerHTML='<div class="text-center py-12 text-gray-400">Nenhum usuário cadastrado</div>';return}
    lista.innerHTML=\`<table class="w-full text-sm"><thead><tr class="bg-gray-50 border-b border-gray-100"><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuário</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">E-mail</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Perfil</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Matrícula</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th><th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Último Acesso</th></tr></thead><tbody class="divide-y divide-gray-50">\${data.map(u=>\`<tr class="hover:bg-gray-50"><td class="px-6 py-4"><div class="flex items-center gap-3"><div class="w-9 h-9 \${u.perfil==='GESTOR'?'bg-purple-100 text-purple-600':'bg-blue-100 text-blue-600'} rounded-xl flex items-center justify-center font-bold text-sm">\${(u.nome||'?')[0].toUpperCase()}</div><span class="font-medium text-gray-800">\${u.nome}</span></div></td><td class="px-6 py-4 text-gray-500">\${u.email}</td><td class="px-6 py-4"><span class="px-2.5 py-1 rounded-full text-xs font-medium \${u.perfil==='GESTOR'?'bg-purple-100 text-purple-700':'bg-blue-100 text-blue-700'}">\${u.perfil}</span></td><td class="px-6 py-4 text-gray-500 font-mono">\${u.matricula||'—'}</td><td class="px-6 py-4"><span class="px-2 py-1 rounded-full text-xs font-medium \${u.ativo?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">\${u.ativo?'Ativo':'Inativo'}</span></td><td class="px-6 py-4 text-gray-400 text-xs">\${u.ultimo_acesso?new Date(u.ultimo_acesso).toLocaleString('pt-BR'):'Nunca'}</td></tr>\`).join('')}</tbody></table>\`
  }
  async function salvarUser() {
    const payload={nome:document.getElementById('uNome').value,email:document.getElementById('uEmail').value,senha:document.getElementById('uSenha').value,perfil:document.getElementById('uPerfil').value,matricula:document.getElementById('uMat').value||null}
    if(!payload.nome||!payload.email||!payload.senha){showAlert('Nome, e-mail e senha são obrigatórios','error');return}
    try {
      await axios.post('/api/auth/users',payload)
      showAlert('<i class="fas fa-check-circle mr-2"></i>Usuário criado com sucesso!')
      document.getElementById('uNome').value='';document.getElementById('uEmail').value='';document.getElementById('uSenha').value='';document.getElementById('uMat').value=''
      document.getElementById('formAdd').classList.add('hidden')
      carregarUsers()
    } catch(err){showAlert('<i class="fas fa-times-circle mr-2"></i>'+(err.response?.data?.message||'Erro'),'error')}
  }
  carregarUsers()
  </script>`

  return c.html(layout('Usuários', content, 'usuarios', user))
})

// Perfil redirect para /
app.get('/perfil', requireAuth, (c) => c.redirect('/'))

export default app
