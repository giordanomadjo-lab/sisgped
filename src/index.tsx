import { Hono } from 'hono'
import { cors } from 'hono/cors'
import api from './routes/api'

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// Mount API routes
app.route('/api', api)

// ============================================================
// FRONTEND PAGES
// ============================================================

// Layout helper
function layout(title: string, content: string, activeNav: string = '') {
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
    .nav-active { background-color: rgba(255,255,255,0.15) !important; }
    .status-PENDENTE { background:#fef3c7;color:#92400e;border:1px solid #fde68a; }
    .status-APROVADO { background:#d1fae5;color:#065f46;border:1px solid #a7f3d0; }
    .status-REJEITADO { background:#fee2e2;color:#991b1b;border:1px solid #fca5a5; }
    .status-PAGO { background:#dbeafe;color:#1e40af;border:1px solid #93c5fd; }
    .fade-in { animation: fadeIn 0.3s ease-in; }
    @keyframes fadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
    .card-hover { transition: transform 0.2s, box-shadow 0.2s; }
    .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); }
    body { font-family: 'Segoe UI', system-ui, sans-serif; }
    .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; animation: spin 0.8s linear infinite; display: inline-block; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">

  <!-- Sidebar -->
  <div class="flex min-h-screen">
    <aside class="w-64 bg-gradient-to-b from-blue-800 to-blue-900 text-white flex flex-col shadow-xl fixed h-full z-10">
      <div class="p-5 border-b border-blue-700">
        <div class="flex items-center gap-3">
          <div class="bg-white/20 rounded-xl p-2.5">
            <i class="fas fa-chalkboard-teacher text-xl"></i>
          </div>
          <div>
            <h1 class="text-lg font-bold leading-tight">SisGPed</h1>
            <p class="text-blue-300 text-xs">Serviços Pedagógicos</p>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
        <a href="/" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav === 'dashboard' ? 'nav-active' : ''}">
          <i class="fas fa-chart-pie w-5 text-center text-blue-300"></i>
          <span class="text-sm font-medium">Dashboard</span>
        </a>
        <a href="/novo-servico" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav === 'novo' ? 'nav-active' : ''}">
          <i class="fas fa-plus-circle w-5 text-center text-blue-300"></i>
          <span class="text-sm font-medium">Registrar Serviço</span>
        </a>
        <a href="/servicos" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav === 'servicos' ? 'nav-active' : ''}">
          <i class="fas fa-list-alt w-5 text-center text-blue-300"></i>
          <span class="text-sm font-medium">Meus Serviços</span>
        </a>
        <a href="/gestao" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav === 'gestao' ? 'nav-active' : ''}">
          <i class="fas fa-tasks w-5 text-center text-blue-300"></i>
          <span class="text-sm font-medium">Gestão (DEP)</span>
        </a>
        <div class="pt-3 pb-1 px-4">
          <p class="text-xs text-blue-400 uppercase tracking-wider font-semibold">Configurações</p>
        </div>
        <a href="/instrutores" class="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors ${activeNav === 'instrutores' ? 'nav-active' : ''}">
          <i class="fas fa-users w-5 text-center text-blue-300"></i>
          <span class="text-sm font-medium">Instrutores</span>
        </a>
      </nav>
      <div class="p-4 border-t border-blue-700">
        <p class="text-xs text-blue-400 text-center">Divisão de Educação Profissional</p>
      </div>
    </aside>

    <!-- Main content -->
    <main class="ml-64 flex-1 p-8">
      ${content}
    </main>
  </div>

</body>
</html>`
}

// ============================================================
// DASHBOARD PAGE
// ============================================================
app.get('/', (c) => {
  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p class="text-gray-500 mt-1">Visão geral dos serviços pedagógicos</p>
      </div>
      <div class="flex gap-3">
        <select id="filtroMes" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todos os meses</option>
          ${Array.from({length: 12}, (_, i) => {
            const m = String(i + 1).padStart(2, '0')
            const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
            return `<option value="${m}">${names[i]}</option>`
          }).join('')}
        </select>
        <select id="filtroAno" class="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <option value="">Todos os anos</option>
          ${[2024, 2025, 2026].map(y => `<option value="${y}" ${y === new Date().getFullYear() ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
        <button onclick="loadDashboard()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          <i class="fas fa-sync-alt mr-2"></i>Atualizar
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div id="statsCards" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between">
          <div><p class="text-gray-500 text-sm">Total de Serviços</p><p id="statTotal" class="text-3xl font-bold text-gray-800 mt-1">—</p></div>
          <div class="bg-blue-100 rounded-xl p-3"><i class="fas fa-file-alt text-blue-600 text-xl"></i></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between">
          <div><p class="text-gray-500 text-sm">Pendentes</p><p id="statPendentes" class="text-3xl font-bold text-amber-500 mt-1">—</p></div>
          <div class="bg-amber-100 rounded-xl p-3"><i class="fas fa-clock text-amber-500 text-xl"></i></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between">
          <div><p class="text-gray-500 text-sm">Total de Horas</p><p id="statHoras" class="text-3xl font-bold text-green-600 mt-1">—</p></div>
          <div class="bg-green-100 rounded-xl p-3"><i class="fas fa-hourglass-half text-green-600 text-xl"></i></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between">
          <div><p class="text-gray-500 text-sm">Valor Consultorias</p><p id="statValor" class="text-2xl font-bold text-purple-600 mt-1">—</p></div>
          <div class="bg-purple-100 rounded-xl p-3"><i class="fas fa-dollar-sign text-purple-600 text-xl"></i></div>
        </div>
      </div>
    </div>

    <!-- Second row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between">
          <div><p class="text-gray-500 text-sm">Aprovados</p><p id="statAprovados" class="text-3xl font-bold text-green-600 mt-1">—</p></div>
          <div class="bg-green-100 rounded-xl p-3"><i class="fas fa-check-circle text-green-600 text-xl"></i></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between">
          <div><p class="text-gray-500 text-sm">Pagos</p><p id="statPagos" class="text-3xl font-bold text-blue-600 mt-1">—</p></div>
          <div class="bg-blue-100 rounded-xl p-3"><i class="fas fa-money-check-alt text-blue-600 text-xl"></i></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between">
          <div><p class="text-gray-500 text-sm">Consultorias</p><p id="statConsultorias" class="text-3xl font-bold text-indigo-600 mt-1">—</p></div>
          <div class="bg-indigo-100 rounded-xl p-3"><i class="fas fa-briefcase text-indigo-600 text-xl"></i></div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover">
        <div class="flex items-center justify-between">
          <div><p class="text-gray-500 text-sm">Demandas DEP</p><p id="statDEP" class="text-3xl font-bold text-teal-600 mt-1">—</p></div>
          <div class="bg-teal-100 rounded-xl p-3"><i class="fas fa-school text-teal-600 text-xl"></i></div>
        </div>
      </div>
    </div>

    <!-- Charts + Tables -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <!-- Chart -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 class="text-base font-semibold text-gray-700 mb-4"><i class="fas fa-chart-doughnut text-blue-500 mr-2"></i>Distribuição por Tipo</h3>
        <div class="flex items-center justify-center" style="height:200px">
          <canvas id="chartTipo"></canvas>
        </div>
      </div>

      <!-- Por Instrutor -->
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 class="text-base font-semibold text-gray-700 mb-4"><i class="fas fa-user-tie text-blue-500 mr-2"></i>Top Instrutores</h3>
        <div id="topInstrutores" class="space-y-2">
          <div class="text-center py-8 text-gray-400"><div class="spinner mx-auto mb-2"></div><p class="text-sm">Carregando...</p></div>
        </div>
      </div>
    </div>

    <!-- Recentes -->
    <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-semibold text-gray-700"><i class="fas fa-history text-blue-500 mr-2"></i>Registros Recentes</h3>
        <a href="/servicos" class="text-blue-600 text-sm hover:underline">Ver todos <i class="fas fa-arrow-right ml-1"></i></a>
      </div>
      <div id="recentes" class="space-y-3">
        <div class="text-center py-8 text-gray-400"><div class="spinner mx-auto mb-2"></div><p class="text-sm">Carregando...</p></div>
      </div>
    </div>
  </div>

  <script>
  let chartTipoInstance = null

  function formatCurrency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  }

  function formatDate(d) {
    if (!d) return '—'
    const [y,m,day] = d.split('-')
    return day + '/' + m + '/' + y
  }

  function statusBadge(s) {
    const labels = { PENDENTE:'Pendente', APROVADO:'Aprovado', REJEITADO:'Rejeitado', PAGO:'Pago' }
    return '<span class="status-' + s + ' text-xs px-2.5 py-1 rounded-full font-medium">' + (labels[s] || s) + '</span>'
  }

  async function loadDashboard() {
    const mes = document.getElementById('filtroMes').value
    const ano = document.getElementById('filtroAno').value
    const params = new URLSearchParams()
    if (mes) params.set('mes', mes)
    if (ano) params.set('ano', ano)

    try {
      const res = await axios.get('/api/dashboard/stats?' + params.toString())
      const { stats, por_instrutor, por_tipo, recentes } = res.data.data

      document.getElementById('statTotal').textContent = stats.total || 0
      document.getElementById('statPendentes').textContent = stats.pendentes || 0
      document.getElementById('statHoras').textContent = (stats.total_horas || 0).toFixed(1) + 'h'
      document.getElementById('statValor').textContent = formatCurrency(stats.total_valor_consultoria)
      document.getElementById('statAprovados').textContent = stats.aprovados || 0
      document.getElementById('statPagos').textContent = stats.pagos || 0
      document.getElementById('statConsultorias').textContent = stats.consultorias || 0
      document.getElementById('statDEP').textContent = stats.demandas_dep || 0

      // Chart
      if (chartTipoInstance) chartTipoInstance.destroy()
      const ctx = document.getElementById('chartTipo').getContext('2d')
      chartTipoInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Consultorias', 'Demandas DEP'],
          datasets: [{
            data: [stats.consultorias || 0, stats.demandas_dep || 0],
            backgroundColor: ['#6366f1', '#14b8a6'],
            borderWidth: 0
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      })

      // Top instrutores
      const ti = document.getElementById('topInstrutores')
      if (!por_instrutor.length) {
        ti.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Nenhum dado encontrado</p>'
      } else {
        ti.innerHTML = por_instrutor.map(i => \`
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p class="font-medium text-gray-800 text-sm">\${i.nome_instrutor || 'Instrutor'}</p>
              <p class="text-gray-500 text-xs">Matrícula: \${i.matricula_instrutor}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-semibold text-gray-700">\${i.total_servicos} serviços</p>
              <p class="text-xs text-gray-400">\${i.total_horas}h</p>
            </div>
          </div>
        \`).join('')
      }

      // Recentes
      const re = document.getElementById('recentes')
      if (!recentes.length) {
        re.innerHTML = '<p class="text-center text-gray-400 text-sm py-4">Nenhum registro recente</p>'
      } else {
        re.innerHTML = \`<div class="overflow-x-auto"><table class="w-full text-sm"><thead><tr class="text-left text-gray-500 border-b border-gray-100"><th class="pb-3 font-medium">Instrutor</th><th class="pb-3 font-medium">Data</th><th class="pb-3 font-medium">Tipo</th><th class="pb-3 font-medium">Status</th><th class="pb-3 font-medium">Horas</th></tr></thead><tbody class="divide-y divide-gray-50">\${recentes.map(r => \`<tr><td class="py-3 font-medium text-gray-800">\${r.nome_instrutor || r.matricula_instrutor}</td><td class="py-3 text-gray-500">\${formatDate(r.data_servico)}</td><td class="py-3"><span class="px-2 py-1 rounded-md text-xs font-medium \${r.tipo_demanda === 'CONSULTORIA' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span></td><td class="py-3">\${statusBadge(r.status)}</td><td class="py-3 text-gray-500">\${r.duracao_horas}h</td></tr>\`).join('')}</tbody></table></div>\`
      }
    } catch (err) {
      console.error(err)
    }
  }

  document.getElementById('filtroMes').addEventListener('change', loadDashboard)
  document.getElementById('filtroAno').addEventListener('change', loadDashboard)
  loadDashboard()
  </script>
  `
  return c.html(layout('Dashboard', content, 'dashboard'))
})

// ============================================================
// NOVO SERVIÇO PAGE
// ============================================================
app.get('/novo-servico', (c) => {
  const content = `
  <div class="fade-in max-w-3xl">
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-gray-800">Registrar Serviço Pedagógico</h2>
      <p class="text-gray-500 mt-1">Preencha os dados do serviço prestado</p>
    </div>

    <!-- Alert área -->
    <div id="alertArea"></div>

    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Cabeçalho do form -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h3 class="text-white font-semibold"><i class="fas fa-plus-circle mr-2"></i>Novo Registro</h3>
      </div>

      <form id="formServico" class="p-6 space-y-6">
        
        <!-- Seção: Dados do Instrutor -->
        <div>
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <i class="fas fa-user text-blue-500"></i> Dados do Instrutor
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Matrícula <span class="text-red-500">*</span></label>
              <div class="relative">
                <input type="text" id="matricula" name="matricula" required
                  placeholder="Ex: 12345"
                  class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  oninput="buscarInstrutor(this.value)">
                <div id="loadingMatricula" class="absolute right-3 top-1/2 -translate-y-1/2 hidden">
                  <div class="spinner" style="width:16px;height:16px;border-width:2px"></div>
                </div>
              </div>
              <p id="infoInstrutor" class="text-xs mt-1.5"></p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Nome do Instrutor</label>
              <input type="text" id="nome_instrutor" name="nome_instrutor"
                placeholder="Será preenchido automaticamente"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50">
            </div>
          </div>
        </div>

        <hr class="border-gray-100">

        <!-- Seção: Dados do Serviço -->
        <div>
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <i class="fas fa-calendar-alt text-blue-500"></i> Dados do Serviço
          </h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Data do Serviço <span class="text-red-500">*</span></label>
              <input type="date" id="data_servico" name="data_servico" required
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Hora Início <span class="text-red-500">*</span></label>
              <input type="time" id="hora_inicio" name="hora_inicio" required
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                onchange="calcularDuracao()">
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Hora Fim <span class="text-red-500">*</span></label>
              <input type="time" id="hora_fim" name="hora_fim" required
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                onchange="calcularDuracao()">
            </div>
          </div>

          <!-- Preview de duração -->
          <div id="duracaoPreview" class="hidden mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p class="text-blue-700 text-sm font-medium"><i class="fas fa-clock mr-2"></i><span id="duracaoTexto"></span></p>
          </div>
        </div>

        <hr class="border-gray-100">

        <!-- Seção: Tipo de Demanda -->
        <div>
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <i class="fas fa-tag text-blue-500"></i> Tipo de Demanda
          </h4>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <!-- Consultoria -->
            <label class="cursor-pointer">
              <input type="radio" name="tipo_demanda" value="CONSULTORIA" class="sr-only peer" onchange="onTipoChange()">
              <div class="p-4 rounded-xl border-2 border-gray-200 peer-checked:border-indigo-500 peer-checked:bg-indigo-50 transition-all hover:border-gray-300">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                    <i class="fas fa-briefcase text-indigo-600"></i>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800">Consultoria</p>
                    <p class="text-xs text-gray-500 mt-0.5">Remunerado com +30% adicional sobre valor hora-aula</p>
                  </div>
                </div>
              </div>
            </label>

            <!-- DEP -->
            <label class="cursor-pointer">
              <input type="radio" name="tipo_demanda" value="DEP" class="sr-only peer" onchange="onTipoChange()">
              <div class="p-4 rounded-xl border-2 border-gray-200 peer-checked:border-teal-500 peer-checked:bg-teal-50 transition-all hover:border-gray-300">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
                    <i class="fas fa-school text-teal-600"></i>
                  </div>
                  <div>
                    <p class="font-semibold text-gray-800">Demanda DEP</p>
                    <p class="text-xs text-gray-500 mt-0.5">Divisão de Educação Profissional — sem adicional</p>
                  </div>
                </div>
              </div>
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Serviço Específico</label>
              <select id="service_type_id" name="service_type_id"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white">
                <option value="">— Selecione o tipo —</option>
              </select>
            </div>
            
            <!-- Valor hora-aula (só para consultoria) -->
            <div id="campoValorHora" class="hidden">
              <label class="block text-sm font-medium text-gray-700 mb-1.5">Valor Hora-Aula (R$) <span class="text-red-500">*</span></label>
              <input type="number" id="valor_hora_aula" name="valor_hora_aula" step="0.01" min="0"
                placeholder="Ex: 45.00"
                class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                oninput="calcularDuracao()">
            </div>
          </div>

          <!-- Preview de valor -->
          <div id="valorPreview" class="hidden mt-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-indigo-700"><span id="valorHoras"></span> × R$ <span id="valorHora"></span>/h × 1.30 (30% adicional)</p>
              </div>
              <div class="text-right">
                <p class="text-xs text-indigo-500">Valor estimado</p>
                <p class="text-xl font-bold text-indigo-700">R$ <span id="valorTotal"></span></p>
              </div>
            </div>
          </div>
        </div>

        <hr class="border-gray-100">

        <!-- Descrição -->
        <div>
          <h4 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <i class="fas fa-align-left text-blue-500"></i> Descrição da Atividade
          </h4>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Descreva a atividade realizada <span class="text-red-500">*</span></label>
            <textarea id="descricao_atividade" name="descricao_atividade" required rows="4"
              placeholder="Descreva detalhadamente a atividade pedagógica realizada..."
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"></textarea>
          </div>
          <div class="mt-3">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Observações adicionais</label>
            <textarea id="observacoes" name="observacoes" rows="2"
              placeholder="Informações complementares (opcional)..."
              class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"></textarea>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex gap-3 pt-2">
          <button type="submit" id="btnSubmit"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2">
            <i class="fas fa-save"></i>
            Registrar Serviço
          </button>
          <button type="reset" onclick="resetForm()"
            class="px-6 py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors">
            <i class="fas fa-times mr-2"></i>Limpar
          </button>
        </div>
      </form>
    </div>
  </div>

  <script>
  let tipoAtual = null
  let timerMatricula = null
  const serviceTypes = { CONSULTORIA: [], DEP: [] }

  // Carregar tipos de serviço
  async function loadServiceTypes() {
    const res = await axios.get('/api/service-types')
    const types = res.data.data
    types.forEach(t => {
      if (serviceTypes[t.categoria]) serviceTypes[t.categoria].push(t)
    })
  }

  // Busca o instrutor pela matrícula
  async function buscarInstrutor(v) {
    clearTimeout(timerMatricula)
    const info = document.getElementById('infoInstrutor')
    if (v.length < 3) { info.textContent = ''; return }
    timerMatricula = setTimeout(async () => {
      document.getElementById('loadingMatricula').classList.remove('hidden')
      try {
        const res = await axios.get('/api/instructors/by-matricula/' + v)
        const i = res.data.data
        document.getElementById('nome_instrutor').value = i.nome
        document.getElementById('valor_hora_aula').value = i.valor_hora_aula
        info.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>' + i.nome + '</span>'
        calcularDuracao()
      } catch {
        document.getElementById('nome_instrutor').value = ''
        info.innerHTML = '<span class="text-gray-400"><i class="fas fa-info-circle mr-1"></i>Instrutor não encontrado no cadastro</span>'
      } finally {
        document.getElementById('loadingMatricula').classList.add('hidden')
      }
    }, 600)
  }

  // Trocar tipo demanda
  function onTipoChange() {
    tipoAtual = document.querySelector('input[name="tipo_demanda"]:checked')?.value
    const campoValor = document.getElementById('campoValorHora')
    const select = document.getElementById('service_type_id')

    // Filtrar tipos de serviço
    select.innerHTML = '<option value="">— Selecione o tipo —</option>'
    if (tipoAtual && serviceTypes[tipoAtual]) {
      serviceTypes[tipoAtual].forEach(t => {
        select.innerHTML += '<option value="' + t.id + '">' + t.nome + '</option>'
      })
    }

    if (tipoAtual === 'CONSULTORIA') {
      campoValor.classList.remove('hidden')
    } else {
      campoValor.classList.add('hidden')
      document.getElementById('valorPreview').classList.add('hidden')
    }
    calcularDuracao()
  }

  // Calcular duração e valor
  function calcularDuracao() {
    const hi = document.getElementById('hora_inicio').value
    const hf = document.getElementById('hora_fim').value
    const vha = parseFloat(document.getElementById('valor_hora_aula').value) || 0

    if (!hi || !hf) return

    const [h1, m1] = hi.split(':').map(Number)
    const [h2, m2] = hf.split(':').map(Number)
    const minutos = (h2 * 60 + m2) - (h1 * 60 + m1)

    if (minutos <= 0) {
      document.getElementById('duracaoPreview').classList.add('hidden')
      return
    }

    const horas = minutos / 60
    const horasF = horas.toFixed(2)
    const h = Math.floor(horas)
    const m = Math.round((horas - h) * 60)
    const textoHora = h > 0 ? h + 'h' + (m > 0 ? m + 'min' : '') : m + 'min'

    document.getElementById('duracaoPreview').classList.remove('hidden')
    document.getElementById('duracaoTexto').textContent = 'Duração: ' + textoHora + ' (' + horasF + 'h)'

    if (tipoAtual === 'CONSULTORIA' && vha > 0) {
      const total = horas * vha * 1.30
      document.getElementById('valorPreview').classList.remove('hidden')
      document.getElementById('valorHoras').textContent = horasF
      document.getElementById('valorHora').textContent = vha.toFixed(2)
      document.getElementById('valorTotal').textContent = total.toFixed(2)
    } else {
      document.getElementById('valorPreview').classList.add('hidden')
    }
  }

  // Mostrar alert
  function showAlert(msg, type='success') {
    const colors = { success: 'bg-green-50 border-green-200 text-green-800', error: 'bg-red-50 border-red-200 text-red-800' }
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle' }
    document.getElementById('alertArea').innerHTML = \`
      <div class="\${colors[type]} border rounded-xl p-4 mb-6 flex items-start gap-3 fade-in">
        <i class="fas \${icons[type]} mt-0.5 shrink-0"></i>
        <p class="text-sm">\${msg}</p>
      </div>\`
    window.scrollTo({top:0, behavior:'smooth'})
    setTimeout(() => { document.getElementById('alertArea').innerHTML = '' }, 5000)
  }

  // Reset form
  function resetForm() {
    tipoAtual = null
    document.getElementById('infoInstrutor').textContent = ''
    document.getElementById('duracaoPreview').classList.add('hidden')
    document.getElementById('valorPreview').classList.add('hidden')
    document.getElementById('campoValorHora').classList.add('hidden')
    document.getElementById('service_type_id').innerHTML = '<option value="">— Selecione o tipo —</option>'
  }

  // Submit form
  document.getElementById('formServico').addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = document.getElementById('btnSubmit')
    btn.disabled = true
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Registrando...'

    const tipo = document.querySelector('input[name="tipo_demanda"]:checked')?.value
    if (!tipo) { showAlert('Selecione o tipo de demanda', 'error'); btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Registrar Serviço'; return }

    const payload = {
      matricula_instrutor: document.getElementById('matricula').value,
      nome_instrutor: document.getElementById('nome_instrutor').value,
      data_servico: document.getElementById('data_servico').value,
      hora_inicio: document.getElementById('hora_inicio').value,
      hora_fim: document.getElementById('hora_fim').value,
      descricao_atividade: document.getElementById('descricao_atividade').value,
      tipo_demanda: tipo,
      service_type_id: document.getElementById('service_type_id').value || null,
      valor_hora_aula: tipo === 'CONSULTORIA' ? parseFloat(document.getElementById('valor_hora_aula').value) || 0 : 0,
      observacoes: document.getElementById('observacoes').value
    }

    try {
      const res = await axios.post('/api/services', payload)
      showAlert('✅ Serviço registrado com sucesso! ID #' + res.data.data.id)
      document.getElementById('formServico').reset()
      resetForm()
    } catch(err) {
      showAlert(err.response?.data?.message || 'Erro ao registrar serviço', 'error')
    } finally {
      btn.disabled = false
      btn.innerHTML = '<i class="fas fa-save"></i> Registrar Serviço'
    }
  })

  // Definir data padrão como hoje
  document.getElementById('data_servico').value = new Date().toISOString().split('T')[0]

  // Carregar tipos ao iniciar
  loadServiceTypes()
  </script>
  `
  return c.html(layout('Registrar Serviço', content, 'novo'))
})

// ============================================================
// LISTAGEM DE SERVIÇOS
// ============================================================
app.get('/servicos', (c) => {
  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Serviços Registrados</h2>
        <p class="text-gray-500 mt-1">Consulte e acompanhe seus registros</p>
      </div>
      <a href="/novo-servico" class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
        <i class="fas fa-plus"></i>Novo Registro
      </a>
    </div>

    <!-- Filtros -->
    <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Matrícula</label>
          <input id="fMatricula" type="text" placeholder="Filtrar..." class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
          <select id="fTipo" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white">
            <option value="">Todos</option>
            <option value="CONSULTORIA">Consultoria</option>
            <option value="DEP">DEP</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select id="fStatus" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white">
            <option value="">Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="APROVADO">Aprovado</option>
            <option value="REJEITADO">Rejeitado</option>
            <option value="PAGO">Pago</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
          <input id="fDataInicio" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
          <input id="fDataFim" type="date" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
        </div>
        <div class="flex items-end">
          <button onclick="loadServicos(1)" class="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm hover:bg-blue-700 transition-colors">
            <i class="fas fa-search mr-1"></i>Buscar
          </button>
        </div>
      </div>
    </div>

    <!-- Tabela -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div id="loadingServicos" class="text-center py-12 text-gray-400">
        <div class="spinner mx-auto mb-3"></div>
        <p class="text-sm">Carregando registros...</p>
      </div>
      <div id="tabelaServicos" class="hidden"></div>
      <div id="paginacao" class="px-6 py-4 border-t border-gray-100 hidden flex items-center justify-between"></div>
    </div>
  </div>

  <!-- Modal de detalhes -->
  <div id="modalDetalhes" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-screen overflow-y-auto">
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <h3 class="text-lg font-bold text-gray-800">Detalhes do Serviço</h3>
        <button onclick="fecharModal()" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <i class="fas fa-times text-gray-500"></i>
        </button>
      </div>
      <div id="modalConteudo" class="p-6"></div>
    </div>
  </div>

  <script>
  let paginaAtual = 1

  function formatDate(d) {
    if (!d) return '—'
    const [y,m,day] = d.split('-')
    return day + '/' + m + '/' + y
  }

  function statusBadge(s) {
    const labels = { PENDENTE:'Pendente', APROVADO:'Aprovado', REJEITADO:'Rejeitado', PAGO:'Pago' }
    return '<span class="status-' + s + ' text-xs px-2.5 py-1 rounded-full font-medium">' + (labels[s] || s) + '</span>'
  }

  function formatCurrency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  }

  async function loadServicos(page = 1) {
    paginaAtual = page
    document.getElementById('loadingServicos').classList.remove('hidden')
    document.getElementById('tabelaServicos').classList.add('hidden')
    document.getElementById('paginacao').classList.add('hidden')

    const params = new URLSearchParams()
    params.set('page', page)
    const m = document.getElementById('fMatricula').value
    const t = document.getElementById('fTipo').value
    const s = document.getElementById('fStatus').value
    const di = document.getElementById('fDataInicio').value
    const df = document.getElementById('fDataFim').value
    if (m) params.set('matricula', m)
    if (t) params.set('tipo_demanda', t)
    if (s) params.set('status', s)
    if (di) params.set('data_inicio', di)
    if (df) params.set('data_fim', df)

    try {
      const res = await axios.get('/api/services?' + params.toString())
      const { data, pagination } = res.data

      document.getElementById('loadingServicos').classList.add('hidden')
      const tabela = document.getElementById('tabelaServicos')
      tabela.classList.remove('hidden')

      if (!data.length) {
        tabela.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-inbox text-4xl mb-3 block"></i><p>Nenhum registro encontrado</p></div>'
        return
      }

      tabela.innerHTML = \`
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 border-b border-gray-100">
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Instrutor</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Horário</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Horas</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              \${data.map(r => \`
                <tr class="hover:bg-gray-50 transition-colors">
                  <td class="px-6 py-4">
                    <p class="font-medium text-gray-800">\${r.nome_instrutor || '—'}</p>
                    <p class="text-xs text-gray-400">Mat: \${r.matricula_instrutor}</p>
                  </td>
                  <td class="px-6 py-4 text-gray-600">\${formatDate(r.data_servico)}</td>
                  <td class="px-6 py-4 text-gray-600">\${r.hora_inicio} – \${r.hora_fim}</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 rounded-full text-xs font-medium \${r.tipo_demanda === 'CONSULTORIA' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span>
                  </td>
                  <td class="px-6 py-4 text-gray-600">\${r.duracao_horas}h</td>
                  <td class="px-6 py-4 text-gray-600">\${r.tipo_demanda === 'CONSULTORIA' ? formatCurrency(r.valor_calculado) : '—'}</td>
                  <td class="px-6 py-4">\${statusBadge(r.status)}</td>
                  <td class="px-6 py-4">
                    <button onclick="verDetalhes(\${r.id})" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver detalhes">
                      <i class="fas fa-eye"></i>
                    </button>
                  </td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
        <div class="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Total: <strong class="text-gray-800">\${pagination.total}</strong> registros</span>
          <div class="flex gap-2">
            \${pagination.page > 1 ? \`<button onclick="loadServicos(\${pagination.page-1})" class="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">← Anterior</button>\` : ''}
            <span class="px-3 py-1.5">Página \${pagination.page} de \${pagination.pages}</span>
            \${pagination.page < pagination.pages ? \`<button onclick="loadServicos(\${pagination.page+1})" class="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Próxima →</button>\` : ''}
          </div>
        </div>
      \`
    } catch (err) {
      console.error(err)
      document.getElementById('loadingServicos').classList.add('hidden')
    }
  }

  async function verDetalhes(id) {
    const res = await axios.get('/api/services/' + id)
    const r = res.data.data
    document.getElementById('modalConteudo').innerHTML = \`
      <div class="space-y-5">
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-xl p-4">
            <p class="text-xs text-gray-500 mb-1">Instrutor</p>
            <p class="font-semibold text-gray-800">\${r.nome_instrutor || '—'}</p>
            <p class="text-sm text-gray-500">Mat: \${r.matricula_instrutor}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-4">
            <p class="text-xs text-gray-500 mb-1">Data e Horário</p>
            <p class="font-semibold text-gray-800">\${formatDate(r.data_servico)}</p>
            <p class="text-sm text-gray-500">\${r.hora_inicio} às \${r.hora_fim} (\${r.duracao_horas}h)</p>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-gray-50 rounded-xl p-4 text-center">
            <p class="text-xs text-gray-500 mb-1">Tipo</p>
            <span class="px-2.5 py-1 rounded-full text-xs font-medium \${r.tipo_demanda === 'CONSULTORIA' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span>
          </div>
          <div class="bg-gray-50 rounded-xl p-4 text-center">
            <p class="text-xs text-gray-500 mb-1">Status</p>
            \${statusBadge(r.status)}
          </div>
          <div class="bg-gray-50 rounded-xl p-4 text-center">
            <p class="text-xs text-gray-500 mb-1">Valor</p>
            <p class="font-bold text-gray-800">\${r.tipo_demanda === 'CONSULTORIA' ? formatCurrency(r.valor_calculado) : 'N/A'}</p>
          </div>
        </div>
        \${r.tipo_servico_nome ? \`<div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-1">Tipo de Serviço</p><p class="font-medium text-gray-800">\${r.tipo_servico_nome}</p></div>\` : ''}
        <div class="bg-gray-50 rounded-xl p-4">
          <p class="text-xs text-gray-500 mb-2">Descrição da Atividade</p>
          <p class="text-gray-800 text-sm leading-relaxed">\${r.descricao_atividade}</p>
        </div>
        \${r.observacoes ? \`<div class="bg-gray-50 rounded-xl p-4"><p class="text-xs text-gray-500 mb-2">Observações</p><p class="text-gray-600 text-sm">\${r.observacoes}</p></div>\` : ''}
        \${r.observacoes_gestor ? \`<div class="bg-blue-50 rounded-xl p-4 border border-blue-100"><p class="text-xs text-blue-500 mb-2"><i class="fas fa-user-tie mr-1"></i>Observações do Gestor</p><p class="text-blue-800 text-sm">\${r.observacoes_gestor}</p></div>\` : ''}
        <p class="text-xs text-gray-400">Registrado em: \${new Date(r.created_at).toLocaleString('pt-BR')}</p>
      </div>
    \`
    document.getElementById('modalDetalhes').classList.remove('hidden')
  }

  function fecharModal() {
    document.getElementById('modalDetalhes').classList.add('hidden')
  }

  document.getElementById('modalDetalhes').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalDetalhes')) fecharModal()
  })

  loadServicos()
  </script>
  `
  return c.html(layout('Serviços', content, 'servicos'))
})

// ============================================================
// GESTÃO (DEP) - Painel do Gestor
// ============================================================
app.get('/gestao', (c) => {
  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Gestão de Serviços</h2>
        <p class="text-gray-500 mt-1">Painel da Divisão de Educação Profissional</p>
      </div>
    </div>

    <!-- Abas de status -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button onclick="setTab('PENDENTE')" id="tab-PENDENTE" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-amber-500 text-white">
        <i class="fas fa-clock mr-2"></i>Pendentes
      </button>
      <button onclick="setTab('APROVADO')" id="tab-APROVADO" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
        <i class="fas fa-check-circle mr-2"></i>Aprovados
      </button>
      <button onclick="setTab('PAGO')" id="tab-PAGO" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
        <i class="fas fa-money-check-alt mr-2"></i>Pagos
      </button>
      <button onclick="setTab('REJEITADO')" id="tab-REJEITADO" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
        <i class="fas fa-times-circle mr-2"></i>Rejeitados
      </button>
      <button onclick="setTab('')" id="tab-TODOS" class="tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">
        <i class="fas fa-list mr-2"></i>Todos
      </button>
    </div>

    <div id="alertGestao"></div>

    <!-- Lista -->
    <div id="listaGestao" class="space-y-4">
      <div class="text-center py-12 text-gray-400">
        <div class="spinner mx-auto mb-3"></div>
        <p class="text-sm">Carregando...</p>
      </div>
    </div>
  </div>

  <!-- Modal Aprovação -->
  <div id="modalAcao" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full">
      <div class="flex items-center justify-between p-6 border-b border-gray-100">
        <h3 id="modalAcaoTitulo" class="text-lg font-bold text-gray-800">Atualizar Status</h3>
        <button onclick="fecharModalAcao()" class="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <i class="fas fa-times text-gray-500"></i>
        </button>
      </div>
      <div class="p-6">
        <input type="hidden" id="acaoId">
        <input type="hidden" id="acaoStatus">
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Observações do Gestor</label>
          <textarea id="acaoObs" rows="3" placeholder="Comentários (opcional)..."
            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"></textarea>
        </div>
        <div class="flex gap-3">
          <button onclick="confirmarAcao()" id="btnConfirmarAcao"
            class="flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors bg-blue-600 hover:bg-blue-700">
            Confirmar
          </button>
          <button onclick="fecharModalAcao()" class="px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
  let tabAtual = 'PENDENTE'

  function formatDate(d) {
    if (!d) return '—'
    const [y,m,day] = d.split('-')
    return day + '/' + m + '/' + y
  }

  function statusBadge(s) {
    const labels = { PENDENTE:'Pendente', APROVADO:'Aprovado', REJEITADO:'Rejeitado', PAGO:'Pago' }
    return '<span class="status-' + s + ' text-xs px-2.5 py-1 rounded-full font-medium">' + (labels[s] || s) + '</span>'
  }

  function formatCurrency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  }

  function setTab(status) {
    tabAtual = status
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.className = 'tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
    })
    const colors = { PENDENTE: 'bg-amber-500 text-white', APROVADO: 'bg-green-600 text-white', PAGO: 'bg-blue-600 text-white', REJEITADO: 'bg-red-500 text-white', '': 'bg-gray-700 text-white' }
    const activeId = 'tab-' + (status || 'TODOS')
    const el = document.getElementById(activeId)
    if (el) el.className = 'tab-btn px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ' + (colors[status] || 'bg-gray-700 text-white')
    loadGestao()
  }

  async function loadGestao() {
    const lista = document.getElementById('listaGestao')
    lista.innerHTML = '<div class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div><p class="text-sm">Carregando...</p></div>'

    const params = new URLSearchParams({ limit: '50' })
    if (tabAtual) params.set('status', tabAtual)

    const res = await axios.get('/api/services?' + params.toString())
    const { data } = res.data

    if (!data.length) {
      lista.innerHTML = '<div class="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100 shadow-sm"><i class="fas fa-inbox text-4xl mb-3 block"></i><p>Nenhum registro neste status</p></div>'
      return
    }

    lista.innerHTML = data.map(r => \`
      <div class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 card-hover fade-in">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <i class="fas fa-user text-blue-600"></i>
              </div>
              <div>
                <p class="font-semibold text-gray-800">\${r.nome_instrutor || 'Instrutor'}</p>
                <p class="text-xs text-gray-400">Mat: \${r.matricula_instrutor} · #\${r.id}</p>
              </div>
              <div class="ml-auto flex items-center gap-2">
                <span class="px-2.5 py-1 rounded-full text-xs font-medium \${r.tipo_demanda === 'CONSULTORIA' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}">\${r.tipo_demanda}</span>
                \${statusBadge(r.status)}
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-3 text-sm">
              <div class="bg-gray-50 rounded-xl p-3">
                <p class="text-xs text-gray-400 mb-0.5">Data</p>
                <p class="font-medium text-gray-700">\${formatDate(r.data_servico)}</p>
              </div>
              <div class="bg-gray-50 rounded-xl p-3">
                <p class="text-xs text-gray-400 mb-0.5">Horário</p>
                <p class="font-medium text-gray-700">\${r.hora_inicio} – \${r.hora_fim} (\${r.duracao_horas}h)</p>
              </div>
              <div class="bg-gray-50 rounded-xl p-3">
                <p class="text-xs text-gray-400 mb-0.5">Valor</p>
                <p class="font-medium text-gray-700">\${r.tipo_demanda === 'CONSULTORIA' ? formatCurrency(r.valor_calculado) : 'N/A (DEP)'}</p>
              </div>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 mb-3">
              <p class="text-xs text-gray-400 mb-1">Atividade</p>
              <p class="text-sm text-gray-700 line-clamp-2">\${r.descricao_atividade}</p>
            </div>
            \${r.observacoes_gestor ? \`<div class="bg-blue-50 rounded-xl p-3 border border-blue-100"><p class="text-xs text-blue-500 mb-1"><i class="fas fa-comment mr-1"></i>Observação do gestor</p><p class="text-sm text-blue-800">\${r.observacoes_gestor}</p></div>\` : ''}
          </div>
        </div>
        
        <!-- Ações -->
        <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100">
          \${r.status === 'PENDENTE' ? \`
            <button onclick="abrirAcao(\${r.id}, 'APROVADO')" class="px-4 py-2 bg-green-600 text-white text-xs font-medium rounded-xl hover:bg-green-700 transition-colors">
              <i class="fas fa-check mr-1"></i>Aprovar
            </button>
            <button onclick="abrirAcao(\${r.id}, 'REJEITADO')" class="px-4 py-2 bg-red-500 text-white text-xs font-medium rounded-xl hover:bg-red-600 transition-colors">
              <i class="fas fa-times mr-1"></i>Rejeitar
            </button>
          \` : ''}
          \${r.status === 'APROVADO' ? \`
            <button onclick="abrirAcao(\${r.id}, 'PAGO')" class="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-colors">
              <i class="fas fa-money-check-alt mr-1"></i>Marcar como Pago
            </button>
            <button onclick="abrirAcao(\${r.id}, 'PENDENTE')" class="px-4 py-2 bg-gray-200 text-gray-600 text-xs font-medium rounded-xl hover:bg-gray-300 transition-colors">
              <i class="fas fa-undo mr-1"></i>Reabrir
            </button>
          \` : ''}
          \${r.status === 'REJEITADO' ? \`
            <button onclick="abrirAcao(\${r.id}, 'PENDENTE')" class="px-4 py-2 bg-amber-500 text-white text-xs font-medium rounded-xl hover:bg-amber-600 transition-colors">
              <i class="fas fa-undo mr-1"></i>Reabrir
            </button>
          \` : ''}
        </div>
      </div>
    \`).join('')
  }

  function abrirAcao(id, status) {
    document.getElementById('acaoId').value = id
    document.getElementById('acaoStatus').value = status
    document.getElementById('acaoObs').value = ''
    const labels = { APROVADO:'Aprovar Serviço', REJEITADO:'Rejeitar Serviço', PAGO:'Marcar como Pago', PENDENTE:'Reabrir Serviço' }
    const colors = { APROVADO:'bg-green-600 hover:bg-green-700', REJEITADO:'bg-red-500 hover:bg-red-600', PAGO:'bg-blue-600 hover:bg-blue-700', PENDENTE:'bg-amber-500 hover:bg-amber-600' }
    document.getElementById('modalAcaoTitulo').textContent = labels[status] || 'Atualizar Status'
    const btn = document.getElementById('btnConfirmarAcao')
    btn.className = 'flex-1 py-2.5 rounded-xl text-white font-semibold text-sm transition-colors ' + (colors[status] || 'bg-blue-600 hover:bg-blue-700')
    document.getElementById('modalAcao').classList.remove('hidden')
  }

  function fecharModalAcao() { document.getElementById('modalAcao').classList.add('hidden') }

  async function confirmarAcao() {
    const id = document.getElementById('acaoId').value
    const status = document.getElementById('acaoStatus').value
    const obs = document.getElementById('acaoObs').value

    try {
      await axios.patch('/api/services/' + id + '/status', { status, observacoes_gestor: obs })
      fecharModalAcao()
      loadGestao()
      const alertEl = document.getElementById('alertGestao')
      alertEl.innerHTML = '<div class="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-4 text-sm fade-in"><i class="fas fa-check-circle mr-2"></i>Status atualizado com sucesso!</div>'
      setTimeout(() => { alertEl.innerHTML = '' }, 3000)
    } catch(err) {
      alert('Erro: ' + (err.response?.data?.message || 'Falha ao atualizar'))
    }
  }

  document.getElementById('modalAcao').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalAcao')) fecharModalAcao()
  })

  loadGestao()
  </script>
  `
  return c.html(layout('Gestão DEP', content, 'gestao'))
})

// ============================================================
// INSTRUTORES PAGE
// ============================================================
app.get('/instrutores', (c) => {
  const content = `
  <div class="fade-in">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold text-gray-800">Instrutores</h2>
        <p class="text-gray-500 mt-1">Cadastro e gestão de instrutores</p>
      </div>
      <button onclick="document.getElementById('formAddInstrutor').classList.toggle('hidden')" 
        class="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
        <i class="fas fa-plus"></i>Novo Instrutor
      </button>
    </div>

    <div id="alertInstrutores"></div>

    <!-- Form adicionar -->
    <div id="formAddInstrutor" class="hidden bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
      <h3 class="text-base font-semibold text-gray-700 mb-4"><i class="fas fa-user-plus text-blue-500 mr-2"></i>Cadastrar Instrutor</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Matrícula *</label>
          <input id="iMatricula" type="text" placeholder="Ex: 12345" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Nome Completo *</label>
          <input id="iNome" type="text" placeholder="Nome do instrutor" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
          <input id="iEmail" type="email" placeholder="email@exemplo.com" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-500 mb-1">Valor Hora-Aula (R$) *</label>
          <input id="iValor" type="number" step="0.01" min="0" placeholder="Ex: 45.00" class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
        </div>
      </div>
      <div class="flex gap-3 mt-4">
        <button onclick="salvarInstrutor()" class="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <i class="fas fa-save mr-2"></i>Salvar
        </button>
        <button onclick="document.getElementById('formAddInstrutor').classList.add('hidden')" class="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
      </div>
    </div>

    <!-- Lista -->
    <div id="listaInstrutores" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="text-center py-12 text-gray-400"><div class="spinner mx-auto mb-3"></div><p class="text-sm">Carregando...</p></div>
    </div>
  </div>

  <script>
  function formatCurrency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
  }

  function showAlert(msg, type='success') {
    const colors = { success: 'bg-green-50 border-green-200 text-green-800', error: 'bg-red-50 border-red-200 text-red-800' }
    document.getElementById('alertInstrutores').innerHTML = \`<div class="\${colors[type]} border rounded-xl p-4 mb-4 text-sm fade-in">\${msg}</div>\`
    setTimeout(() => { document.getElementById('alertInstrutores').innerHTML = '' }, 4000)
  }

  async function loadInstrutores() {
    const lista = document.getElementById('listaInstrutores')
    const res = await axios.get('/api/instructors')
    const data = res.data.data

    if (!data.length) {
      lista.innerHTML = '<div class="text-center py-12 text-gray-400"><i class="fas fa-users text-4xl mb-3 block"></i><p>Nenhum instrutor cadastrado</p></div>'
      return
    }

    lista.innerHTML = \`
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 border-b border-gray-100">
            <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Instrutor</th>
            <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Matrícula</th>
            <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail</th>
            <th class="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor Hora-Aula</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          \${data.map(i => \`
            <tr class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">\${(i.nome||'?')[0].toUpperCase()}</div>
                  <span class="font-medium text-gray-800">\${i.nome}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-gray-500 font-mono">\${i.matricula}</td>
              <td class="px-6 py-4 text-gray-500">\${i.email || '—'}</td>
              <td class="px-6 py-4 font-semibold text-gray-700">\${formatCurrency(i.valor_hora_aula)}</td>
            </tr>
          \`).join('')}
        </tbody>
      </table>
    \`
  }

  async function salvarInstrutor() {
    const payload = {
      matricula: document.getElementById('iMatricula').value,
      nome: document.getElementById('iNome').value,
      email: document.getElementById('iEmail').value,
      valor_hora_aula: parseFloat(document.getElementById('iValor').value) || 0
    }
    if (!payload.matricula || !payload.nome) { showAlert('<i class="fas fa-exclamation-circle mr-2"></i>Matrícula e nome são obrigatórios', 'error'); return }

    try {
      await axios.post('/api/instructors', payload)
      showAlert('<i class="fas fa-check-circle mr-2"></i>Instrutor cadastrado com sucesso!')
      document.getElementById('iMatricula').value = ''
      document.getElementById('iNome').value = ''
      document.getElementById('iEmail').value = ''
      document.getElementById('iValor').value = ''
      document.getElementById('formAddInstrutor').classList.add('hidden')
      loadInstrutores()
    } catch(err) {
      showAlert('<i class="fas fa-times-circle mr-2"></i>' + (err.response?.data?.message || 'Erro ao salvar'), 'error')
    }
  }

  loadInstrutores()
  </script>
  `
  return c.html(layout('Instrutores', content, 'instrutores'))
})

export default app
