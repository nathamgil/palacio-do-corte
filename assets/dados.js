/* =====================================================================
   Palácio do Corte — dados e motor da agenda (MODO DEMONSTRAÇÃO)
   Tudo fica guardado no navegador (localStorage). O site e o painel
   leem o mesmo "banco", então um horário marcado no site aparece na
   recepção na hora.
   Nomes de barbeiros, serviços, preços, produtos e planos são EXEMPLO.
   ===================================================================== */
(function () {
  'use strict';

  const PC = (window.PC = {
    nome: 'Palácio do Corte',
    slogan: 'Cabelo · Barba · Realeza',
    whatsapp: '5571991884864',
    whatsappVisivel: '(71) 9 9188-4864',
    instagram: 'palaciodocortee',

    unidades: [
      {
        id: 'cb', nome: 'Cidade Baixa', endereco: 'Rua Duarte da Costa, 185',
        cidade: 'Cidade Baixa · Salvador — BA', selo: 'A casa de origem',
        perto: 'Pertinho de quem está no Uruguai, Bonfim, Ribeira e bairros da região.',
        mapa: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Rua Duarte da Costa, 185, Salvador - BA')
      },
      {
        id: 'cs', nome: 'Federação', endereco: 'Av. Cardeal da Silva',
        cidade: 'Federação · Salvador — BA', selo: 'A casa nova',
        perto: 'Ideal para quem está no Horto Florestal, Rio Vermelho, Federação e regiões próximas.',
        mapa: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Avenida Cardeal da Silva, Federação, Salvador - BA')
      }
    ],

    barbeiros: [
      { id: 'christian', nome: 'Christian', unidade: 'cb', espec: 'Degradê e navalhado' },
      { id: 'dany',      nome: 'Dany Show', unidade: 'cb', espec: 'O show começa na cadeira' },
      { id: 'rafael',    nome: 'Rafael',    unidade: 'cb', espec: 'Corte social' },
      { id: 'lucas',     nome: 'Lucas',     unidade: 'cb', espec: 'Freestyle e desenho' },
      { id: 'bruno',     nome: 'Bruno',     unidade: 'cs', espec: 'Degradê e risco' },
      { id: 'matheus',   nome: 'Matheus',   unidade: 'cs', espec: 'Barba desenhada' },
      { id: 'thiago',    nome: 'Thiago',    unidade: 'cs', espec: 'Luzes e nevou' },
      { id: 'vitor',     nome: 'Vitor',     unidade: 'cs', espec: 'Corte infantil' }
    ],

    servicos: [
      { id: 'corte',       nome: 'Corte',            dur: 30, preco: 30 },
      { id: 'degrade',     nome: 'Corte degradê',    dur: 45, preco: 30 },
      { id: 'barba',       nome: 'Barba',            dur: 30, preco: 30 },
      { id: 'combo',       nome: 'Corte + barba',    dur: 60, preco: 55 },
      { id: 'barboterapia', nome: 'Barboterapia',    dur: 45, preco: 50 },
      { id: 'sobrancelha', nome: 'Sobrancelha',      dur: 15, preco: 15 },
      { id: 'pigmentacao', nome: 'Pigmentação',      dur: 30, preco: 35 },
      { id: 'infantil',    nome: 'Corte infantil',   dur: 30, preco: 35 },
      { id: 'luzes',       nome: 'Luzes / nevou',    dur: 90, preco: 120 }
    ],

    // Venda ao público (preço de venda, custo e estoque mínimo por unidade)
    produtos: [
      { id: 'pomada',  nome: 'Pomada modeladora',  preco: 35, custo: 16, min: 4 },
      { id: 'cera',    nome: 'Cera efeito seco',   preco: 35, custo: 15, min: 4 },
      { id: 'oleo',    nome: 'Óleo para barba',    preco: 40, custo: 17, min: 3 },
      { id: 'balm',    nome: 'Balm para barba',    preco: 38, custo: 16, min: 3 },
      { id: 'shampoo', nome: 'Shampoo 3 em 1',     preco: 45, custo: 19, min: 3 },
      { id: 'pente',   nome: 'Pente de madeira',   preco: 20, custo: 6,  min: 5 },
      { id: 'agua',    nome: 'Água mineral',       preco: 4,  custo: 1.5, min: 24 },
      { id: 'refri',   nome: 'Refrigerante lata',  preco: 7,  custo: 3,  min: 24 }
    ],

    // Insumos da casa: o que o barbeiro gasta na cadeira (não vai pra venda)
    insumos: [
      { id: 'lamina',   nome: 'Lâmina descartável (cx 100)', un: 'cx',  custo: 38, min: 3 },
      { id: 'pescoco',  nome: 'Papel pescoceira (rolo)',      un: 'rolo', custo: 12, min: 6 },
      { id: 'toalha',   nome: 'Toalha de rosto',              un: 'un',  custo: 9,  min: 30 },
      { id: 'alcool',   nome: 'Álcool 70% (1 L)',             un: 'L',   custo: 11, min: 4 },
      { id: 'gelbarba', nome: 'Gel de barbear (1 kg)',        un: 'pote', custo: 32, min: 2 },
      { id: 'talco',    nome: 'Talco pós-corte',              un: 'un',  custo: 14, min: 3 },
      { id: 'lavat',    nome: 'Shampoo de lavatório (5 L)',   un: 'galão', custo: 58, min: 1 },
      { id: 'po',       nome: 'Pó descolorante (luzes)',      un: 'pote', custo: 46, min: 2 }
    ],

    planos: [
      { id: 'p-corte',   nome: 'Plano Corte',         preco: 110, desc: '4 cortes por mês', cobre: ['corte', 'degrade'] },
      { id: 'p-combo',   nome: 'Plano Corte + Barba', preco: 180, desc: '4 cortes + 4 barbas por mês', cobre: ['corte', 'degrade', 'barba', 'combo'] },
      { id: 'p-realeza', nome: 'Plano Realeza',       preco: 240, desc: '4 cortes + 4 barbas + 4 sobrancelhas e 10% nos produtos', cobre: ['corte', 'degrade', 'barba', 'combo', 'sobrancelha'], destaque: true }
    ],

    // Expediente do destaque "Horários" do Instagram: seg–qua 8h–19h30, qui–sáb 9h–20h, dom 7h–12h30.
    expediente: { 0: [420, 750], 1: [480, 1170], 2: [480, 1170], 3: [480, 1170], 4: [540, 1200], 5: [540, 1200], 6: [540, 1200] },

    regrasPadrao: { tolerancia: 10, modoTroca: 'sugerir', janelaDias: 15, comissao: 50, gradeSite: 30, antecedencia: 30, cancelarAte: 120, pix: 'opcional', descontoEquipe: 'custo', emissorNF: 'auto' }
  });

  /* ---------------- utilidades ---------------- */
  const pad = (n) => String(n).padStart(2, '0');
  PC.hm = (m) => pad(Math.floor(m / 60)) + 'h' + pad(m % 60);
  PC.hhmm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  PC.dataISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  PC.hoje = () => PC.dataISO(new Date());
  PC.somaDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return PC.dataISO(d); };
  PC.diaSemana = (iso) => new Date(iso + 'T12:00:00').getDay();
  PC.fmtData = (iso, longo) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', longo ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: '2-digit', month: '2-digit' });
  PC.reais = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  PC.id = () => Math.random().toString(36).slice(2, 10);
  PC.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  PC.agoraReal = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  PC.zap = (tel, msg) => 'https://wa.me/' + String(tel).replace(/\D/g, '').replace(/^(?!55)/, '55') + '?text=' + encodeURIComponent(msg);

  PC.unidade = (id) => PC.unidades.find((u) => u.id === id);
  PC.barbeiro = (id) => PC.barbeiros.find((b) => b.id === id);
  PC.servico = (id) => PC.servicos.find((s) => s.id === id);
  PC.produto = (id) => PC.produtos.find((p) => p.id === id) || PC.insumos.find((p) => p.id === id);
  PC.plano = (id) => PC.planos.find((p) => p.id === id);
  PC.barbeirosDa = (u) => PC.barbeiros.filter((b) => !u || u === 'todas' || b.unidade === u);
  PC.nomeServicos = (ids) => ids.map((i) => (PC.servico(i) || {}).nome).join(' + ');
  PC.durDe = (ids) => ids.reduce((t, i) => t + (PC.servico(i) || { dur: 0 }).dur, 0);
  PC.precoDe = (ids) => ids.reduce((t, i) => t + (PC.servico(i) || { preco: 0 }).preco, 0);

  /* ---------------- banco (localStorage) ---------------- */
  const CHAVE = 'palacio_demo_v3';
  let db = null;
  function ler() { try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); } catch (e) { return null; } }
  PC.salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(db)); } catch (e) { /* modo privado: segue só na memória */ } };
  PC.db = () => {
    if (db) return db;
    db = ler();
    if (!db || db.dia !== PC.hoje()) db = semear();
    return db;
  };
  PC.recomecar = () => { db = semear(); PC.salvar(); return db; };
  PC.regras = () => PC.db().regras;
  window.addEventListener('storage', (e) => { if (e.key === CHAVE) db = ler() || db; });

  /* ---------------- relógio ----------------
     No painel, o relógio da demo pode ser fixado (padrão 14h15) para a
     cena do atraso aparecer em qualquer hora da reunião. */
  PC.agora = () => { const r = PC.db().relogio; return r && r.modo === 'demo' ? r.min : PC.agoraReal(); };

  /* ---------------- motor da agenda ---------------- */
  const ATIVOS = ['agendado', 'chegou', 'atendimento', 'finalizado', 'pago'];
  PC.ativo = (a) => ATIVOS.includes(a.status);
  PC.doDia = (data, filtro) => PC.db().agendamentos.filter((a) => a.data === data && (!filtro || filtro(a))).sort((x, y) => x.ini - y.ini);

  PC.expedienteDe = (data) => PC.expediente[PC.diaSemana(data)];

  PC.livre = (barbeiroId, data, ini, dur, ignorarId) => {
    const exp = PC.expedienteDe(data);
    if (!exp || ini < exp[0] || ini + dur > exp[1]) return false;
    if (!PC.trabalha(barbeiroId, data)) return false;
    return !PC.db().agendamentos.some((a) => a.barbeiro === barbeiroId && a.data === data && a.id !== ignorarId && PC.ativo(a) && ini < a.ini + a.dur && a.ini < ini + dur)
      && !PC.db().bloqueios.some((b) => b.barbeiro === barbeiroId && b.data === data && ini < b.fim && b.ini < ini + dur);
  };

  PC.horariosLivres = (barbeiroId, data, dur, passo) => {
    const exp = PC.expedienteDe(data); if (!exp) return [];
    const r = PC.regras(); const lista = [];
    const minimo = data === PC.hoje() ? PC.agoraReal() + r.antecedencia : 0;
    for (let m = exp[0]; m + dur <= exp[1]; m += passo || r.gradeSite) {
      if (m >= minimo && PC.livre(barbeiroId, data, m, dur)) lista.push(m);
    }
    return lista;
  };

  /* ---------------- escala: folga fixa da semana + ausências ---------------- */
  PC.ausencia = (barbeiroId, data) => (PC.db().ausencias || []).find((x) => x.barbeiro === barbeiroId && data >= x.de && data <= x.ate);
  PC.trabalha = (barbeiroId, data) => {
    if (PC.ausencia(barbeiroId, data)) return false;
    const f = (PC.db().escala || {})[barbeiroId];
    return !(f && f.folga === PC.diaSemana(data));
  };
  PC.situacao = (barbeiroId, data) => {
    const a = PC.ausencia(barbeiroId, data); if (a) return a.tipo;
    return PC.trabalha(barbeiroId, data) ? 'trabalha' : 'folga';
  };
  PC.barbeirosNoDia = (u, data) => PC.barbeirosDa(u).filter((b) => PC.trabalha(b.id, data));

  /* ---------------- área do cliente (app de agendamento) ---------------- */
  PC.agsDoCliente = (tel) => { const t = String(tel || '').replace(/\D/g, ''); return t ? PC.db().agendamentos.filter((a) => a.cliente.tel === t) : []; };
  PC.minutosAte = (a) => (new Date(a.data + 'T00:00:00') - new Date(PC.hoje() + 'T00:00:00')) / 6e4 + a.ini - PC.agoraReal();
  PC.podeCancelar = (a) => a.status === 'agendado' && PC.minutosAte(a) >= PC.regras().cancelarAte;
  PC.cancelar = (a, motivo, quem) => {
    a.status = 'cancelado'; a.motivoCancel = motivo || '';
    if (a.pix && a.pix.pago) a.pix.estornado = true;
    PC.registrar(a, `Desmarcado ${quem || 'pelo cliente no app'}${motivo ? ' · ' + motivo : ''}${a.pix && a.pix.estornado ? ' · Pix devolvido' : ''}`);
  };

  PC.qtdNoDia = (barbeiroId, data) => PC.doDia(data, (a) => a.barbeiro === barbeiroId && PC.ativo(a)).length;

  // "Sem preferência": o barbeiro livre da unidade com menos clientes no dia.
  PC.semPreferencia = (unidade, data, ini, dur) => PC.barbeirosDa(unidade)
    .filter((b) => PC.livre(b.id, data, ini, dur))
    .sort((x, y) => PC.qtdNoDia(x.id, data) - PC.qtdNoDia(y.id, data))[0] || null;

  PC.proximoLivre = (barbeiroId, data, desde, dur, ignorarId) => {
    const exp = PC.expedienteDe(data); if (!exp) return null;
    for (let m = Math.ceil(desde / 5) * 5; m + dur <= exp[1]; m += 5) if (PC.livre(barbeiroId, data, m, dur, ignorarId)) return m;
    return null;
  };

  PC.atrasoMin = (a, agora) => Math.max(0, (agora == null ? PC.agora() : agora) - a.ini);
  PC.estaAtrasado = (a, agora) => a.status === 'agendado' && a.data === PC.hoje() && PC.atrasoMin(a, agora) > PC.regras().tolerancia;

  /* Regra da troca por atraso.
     O cliente chegou depois da tolerância: o barbeiro original ainda cabe?
     Se não, quem da mesma unidade está livre AGORA para o mesmo serviço,
     do mais folgado para o mais cheio; depois, quem libera em até 20 min. */
  PC.opcoesAtraso = (a, agora) => {
    agora = agora == null ? PC.agora() : agora;
    const ini = Math.ceil(agora / 5) * 5;
    const mantem = PC.livre(a.barbeiro, a.data, ini, a.dur, a.id);
    const outros = PC.barbeirosDa(a.unidade).filter((b) => b.id !== a.barbeiro);
    const agoraLivres = outros.filter((b) => PC.livre(b.id, a.data, ini, a.dur, a.id))
      .sort((x, y) => PC.qtdNoDia(x.id, a.data) - PC.qtdNoDia(y.id, a.data))
      .map((b) => ({ barbeiro: b.id, ini, espera: 0 }));
    const emBreve = outros.filter((b) => !agoraLivres.some((l) => l.barbeiro === b.id))
      .map((b) => ({ barbeiro: b.id, ini: PC.proximoLivre(b.id, a.data, ini, a.dur, a.id) }))
      .filter((o) => o.ini != null && o.ini - ini <= 20)
      .map((o) => ({ ...o, espera: o.ini - ini }))
      .sort((x, y) => x.espera - y.espera);
    return {
      ini, atraso: agora - a.ini, mantem,
      alternativas: agoraLivres.concat(emBreve),
      proximoMesmo: mantem ? ini : PC.proximoLivre(a.barbeiro, a.data, ini, a.dur, a.id)
    };
  };

  PC.registrar = (a, texto) => { (a.historico = a.historico || []).push({ hora: PC.agora(), texto }); };

  PC.trocarBarbeiro = (a, novo, ini, motivo) => {
    const antigo = a.barbeiro;
    PC.db().trocas.push({ id: PC.id(), data: a.data, hora: PC.agora(), unidade: a.unidade, ag: a.id, cliente: a.cliente.nome, de: antigo, para: novo, atraso: PC.atrasoMin(a), motivo });
    a.barbeiroOriginal = a.barbeiroOriginal || antigo;
    a.barbeiro = novo; a.ini = ini;
    PC.registrar(a, `${motivo}: ${PC.barbeiro(antigo).nome} → ${PC.barbeiro(novo).nome}, às ${PC.hm(ini)}`);
  };

  /* ---------------- clientes, planos, vendas ---------------- */
  PC.cliente = (id) => PC.db().clientes.find((c) => c.id === id);
  PC.assinaturaAtiva = (clienteId) => PC.db().assinaturas.find((s) => s.cliente === clienteId && s.vence >= PC.hoje());
  PC.acharOuCriarCliente = (nome, tel, origem) => {
    const t = String(tel || '').replace(/\D/g, '');
    let c = t && PC.db().clientes.find((x) => x.tel === t);
    if (!c) { c = { id: PC.id(), nome: nome.trim(), tel: t, origem: origem || 'Balcão', desde: PC.hoje() }; PC.db().clientes.push(c); }
    return c;
  };

  PC.lancarVenda = (v) => {
    const venda = Object.assign({ id: PC.id(), data: PC.hoje(), hora: PC.agora(), nf: v.total > 0 ? { status: 'pendente' } : null }, v);
    PC.db().vendas.push(venda);
    (v.itens || []).forEach((it) => {
      if (it.tipo === 'produto') { const e = PC.db().estoque[v.unidade]; e[it.id] = Math.max(0, (e[it.id] || 0) - it.qtd); }
      if (it.tipo === 'plano' && v.cliente) {
        PC.db().assinaturas.push({ id: PC.id(), cliente: v.cliente, plano: it.id, inicio: PC.hoje(), vence: PC.somaDias(PC.hoje(), 30), unidade: v.unidade });
      }
    });
    if (PC.regras().emissorNF === 'auto' && venda.nf) PC.emitirNF(venda);
    return venda;
  };

  /* ---------------- nota fiscal (simulada; na versão real vai pela API do emissor) ----------------
     Serviço → NFS-e (Prefeitura de Salvador). Produto → NFC-e (SEFAZ-BA). */
  PC.tipoNF = (v) => v.itens.some((i) => i.tipo === 'produto') ? (v.itens.some((i) => i.tipo !== 'produto') ? 'NFS-e + NFC-e' : 'NFC-e') : 'NFS-e';
  PC.emitirNF = (v) => {
    const db = PC.db(); db.nfSeq = (db.nfSeq || 1840) + 1;
    v.nf = { status: 'emitida', numero: db.nfSeq, tipo: PC.tipoNF(v), quando: PC.agora(), chave: Array.from({ length: 11 }, () => Math.floor(Math.random() * 1e4).toString().padStart(4, '0')).join(' ') };
    return v.nf;
  };

  /* ---------------- estoque e retiradas da equipe ---------------- */
  PC.qtdEstoque = (u, id) => (PC.db().estoque[u] || {})[id] || 0;
  PC.movEstoque = (u, id, delta, tipo, obs) => {
    const db = PC.db(); db.estoque[u][id] = Math.max(0, PC.qtdEstoque(u, id) + delta);
    (db.movimentos = db.movimentos || []).unshift({ id: PC.id(), data: PC.hoje(), hora: PC.agora(), unidade: u, item: id, delta, tipo, obs: obs || '' });
  };
  // Barbeiro leva produto: sai do estoque e vira desconto no acerto dele
  PC.precoEquipe = (p) => { const m = PC.regras().descontoEquipe; return m === 'custo' ? p.custo : m === '30' ? +(p.preco * 0.7).toFixed(2) : p.preco; };
  PC.retirada = (barbeiro, item, qtd) => {
    const b = PC.barbeiro(barbeiro); const p = PC.produto(item);
    const r = { id: PC.id(), data: PC.hoje(), barbeiro, item, qtd, valor: PC.precoEquipe(p) * qtd };
    PC.db().retiradas.push(r); PC.movEstoque(b.unidade, item, -qtd, 'Retirada da equipe', b.nome);
    return r;
  };

  /* ---------------- dados de exemplo ---------------- */
  function semear() {
    const hoje = PC.hoje();
    let s = Number(hoje.replace(/-/g, '')) % 2147483647;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const pega = (arr) => arr[Math.floor(rnd() * arr.length)];

    const nomes = ['Marcos Vinícius', 'Pedro Henrique', 'Caio Souza', 'João Gabriel', 'Felipe Andrade', 'Gustavo Lima', 'Renan Costa', 'Igor Santana',
      'Davi Oliveira', 'Leonardo Reis', 'Murilo Tavares', 'Ícaro Menezes', 'Wesley Brito', 'Alan Pereira', 'Kaique Nunes', 'Samuel Rocha',
      'Henrique Dias', 'Vinícius Prado', 'Arthur Barreto', 'Enzo Matos', 'Luan Ferreira', 'Otávio Sampaio', 'Ruan Cardoso', 'Daniel Moura',
      'Erick Teles', 'Breno Silva', 'Yuri Conceição', 'Hugo Batista', 'Nicolas Paim', 'Thales Rios', 'Cauã Nascimento', 'Diogo Freitas',
      'Fábio Leal', 'Márcio Pinto', 'Tiago Vaz', 'André Lopes', 'Rodrigo Aragão', 'Saulo Queiroz', 'Juan Carvalho', 'Lázaro Gomes'];
    const pn = ['Adriano', 'Bernardo', 'Carlos', 'Edson', 'Fernando', 'Gabriel', 'Heitor', 'Ivan', 'Jefferson', 'Kevin', 'Lucas', 'Miguel', 'Natan', 'Paulo', 'Robson', 'Sérgio', 'Ulisses', 'Valter', 'William', 'Ygor'];
    const sn = ['Almeida', 'Bastos', 'Cunha', 'Damasceno', 'Esteves', 'Figueiredo', 'Guimarães'];
    pn.forEach((p) => sn.forEach((s) => nomes.push(p + ' ' + s)));
    const clientes = nomes.map((n, i) => ({
      id: 'c' + i, nome: n, tel: '7199' + String(1000000 + Math.floor(rnd() * 8999999)),
      origem: i % 6 === 5 ? 'Site' : i % 6 === 4 ? 'Balcão' : 'Barbecode', desde: PC.somaDias(hoje, -Math.floor(rnd() * 400) - 5)
    }));

    const novo = {
      versao: 1, dia: hoje, relogio: { modo: 'demo', min: 14 * 60 + 15 },
      regras: Object.assign({}, PC.regrasPadrao),
      clientes, agendamentos: [], vendas: [], assinaturas: [], trocas: [], bloqueios: [],
      estoque: { cb: {}, cs: {} }, movimentos: [], retiradas: [], candidatos: [], historico: [], nfSeq: 1840,
      // folga fixa de cada um (0 = domingo … 6 = sábado). Exemplo.
      escala: { christian: { folga: 1 }, dany: { folga: 2 }, rafael: { folga: 3 }, lucas: { folga: 0 }, bruno: { folga: 1 }, matheus: { folga: 2 }, thiago: { folga: 3 }, vitor: { folga: 0 } },
      ausencias: []
    };
    PC.produtos.forEach((p) => { novo.estoque.cb[p.id] = p.min + Math.floor(rnd() * 10); novo.estoque.cs[p.id] = p.min + Math.floor(rnd() * 8); });
    PC.insumos.forEach((p) => { novo.estoque.cb[p.id] = p.min + Math.floor(rnd() * 6); novo.estoque.cs[p.id] = p.min + Math.floor(rnd() * 4); });
    novo.estoque.cs.oleo = 2; novo.estoque.cb.balm = 1; novo.estoque.cs.lamina = 1; novo.estoque.cb.pescoco = 3;
    // a cena do atraso precisa de Christian, Dany, Lucas, Rafael, Thiago, Bruno e Matheus trabalhando hoje
    const dow = PC.diaSemana(hoje);
    Object.keys(novo.escala).forEach((b) => { if (novo.escala[b].folga === dow && b !== 'vitor') novo.escala[b].folga = (dow + 3) % 7; });
    novo.ausencias.push({ id: 'aus1', barbeiro: 'vitor', de: hoje, ate: PC.somaDias(hoje, 1), tipo: 'atestado', obs: 'Atestado de 2 dias' });
    novo.ausencias.push({ id: 'aus2', barbeiro: 'rafael', de: PC.somaDias(hoje, 9), ate: PC.somaDias(hoje, 23), tipo: 'ferias', obs: 'Férias' });
    [['christian', 'pomada', 1], ['dany', 'oleo', 1], ['bruno', 'cera', 2], ['thiago', 'shampoo', 1], ['dany', 'refri', 3]].forEach(([b, it, q], i) => {
      const p = PC.produtos.find((x) => x.id === it); novo.retiradas.push({ id: 'r' + i, data: PC.somaDias(hoje, -i * 3 - 1), barbeiro: b, item: it, qtd: q, valor: p.custo * q });
    });
    // candidatos que vieram pela página "Trabalhe conosco"
    novo.candidatos = [
      { id: 'k1', nome: 'Jonathan Reis', tel: '71991230011', exp: '3 anos', especial: 'Degradê, navalhado', unidade: 'cs', insta: '@jonathan.cuts', etapa: 'teste', data: PC.somaDias(hoje, -4) },
      { id: 'k2', nome: 'Ana Beatriz Lima', tel: '71988772233', exp: '1 ano', especial: 'Corte curto, infantil', unidade: 'cb', insta: '@biabarber', etapa: 'nova', data: PC.somaDias(hoje, -1) },
      { id: 'k3', nome: 'Kauan Matos', tel: '71999881122', exp: 'Começando agora', especial: 'Quer aprender do zero', unidade: 'cb', insta: '', etapa: 'formacao', data: PC.somaDias(hoje, -20) }
    ];
    // faturamento dos últimos 28 dias (para os gráficos)
    for (let d = 28; d >= 1; d--) {
      const data = PC.somaDias(hoje, -d); const ds = PC.diaSemana(data); const peso = ds === 6 ? 1.45 : ds === 5 ? 1.25 : ds === 0 ? 0.55 : 1;
      novo.historico.push({ data, cb: Math.round((1700 + rnd() * 700) * peso), cs: Math.round((900 + rnd() * 600 + (28 - d) * 22) * peso) });
    }

    // assinantes de exemplo
    ['c2', 'c5', 'c9', 'c14', 'c21', 'c27'].forEach((cid, i) => novo.assinaturas.push({
      id: PC.id(), cliente: cid, plano: PC.planos[i % 3].id, inicio: PC.somaDias(hoje, -10 - i), vence: PC.somaDias(hoje, 20 - i), unidade: i % 2 ? 'cs' : 'cb'
    }));

    db = novo; // o motor (PC.livre) lê do db atual
    const relogio = novo.relogio.min;
    const cli = (n) => clientes.find((c) => c.nome === n);
    const add = (barbeiro, data, ini, servs, c, extra) => {
      const b = PC.barbeiro(barbeiro);
      const a = Object.assign({
        id: PC.id(), unidade: b.unidade, barbeiro, data, ini, servicos: servs, dur: PC.durDe(servs), total: PC.precoDe(servs),
        cliente: { id: c.id, nome: c.nome, tel: c.tel }, status: 'agendado', origem: rnd() < 0.55 ? 'Site' : 'Recepção', historico: []
      }, extra || {});
      novo.agendamentos.push(a); return a;
    };

    // ---- A cena do áudio: Christian às 14h, cliente chega 14h15 ----
    add('christian', hoje, 14 * 60, ['corte'], cli('Marcos Vinícius'), { origem: 'Site' });
    add('christian', hoje, 14 * 60 + 30, ['combo'], cli('Pedro Henrique'));
    add('christian', hoje, 15 * 60 + 30, ['degrade'], cli('João Gabriel'));
    add('rafael', hoje, 13 * 60 + 30, ['combo'], cli('Felipe Andrade'), { status: 'atendimento' });
    add('lucas', hoje, 15 * 60, ['corte'], cli('Gustavo Lima'));
    add('dany', hoje, 15 * 60, ['barba'], cli('Renan Costa'));
    // outro atrasado, na Cardeal, ainda sem chegar
    add('thiago', hoje, 14 * 60, ['corte', 'sobrancelha'], cli('Caio Souza'), { origem: 'Site' });
    add('thiago', hoje, 14 * 60 + 45, ['luzes'], cli('Igor Santana'));
    add('bruno', hoje, 14 * 60 + 15, ['degrade'], cli('Davi Oliveira'), { status: 'chegou' });

    const reservados = { dany: [[14 * 60, 15 * 60]], lucas: [[14 * 60, 15 * 60]], matheus: [[14 * 60, 15 * 60]] };
    const servPeso = ['corte', 'corte', 'degrade', 'degrade', 'combo', 'combo', 'barba', 'sobrancelha', 'pigmentacao', 'infantil'];
    const pool = clientes.filter((c) => !['Marcos Vinícius', 'Caio Souza'].includes(c.nome));

    for (let d = 0; d < 7; d++) {
      const data = PC.somaDias(hoje, d); const exp = PC.expedienteDe(data); if (!exp) continue;
      PC.barbeiros.forEach((b) => {
        for (let m = exp[0]; m < exp[1]; m += 30) {
          const chance = d === 0 ? 0.62 : Math.max(0.15, 0.55 - d * 0.07);
          if (rnd() > chance) continue;
          const servs = [pega(servPeso)]; const dur = PC.durDe(servs);
          if (d === 0 && (reservados[b.id] || []).some(([i, f]) => m < f && i < m + dur)) continue;
          if (!PC.livre(b.id, data, m, dur)) continue;
          const extra = {};
          if (d === 0) {
            if (m + dur <= relogio) extra.status = rnd() < 0.08 ? 'faltou' : 'pago';
            else if (m < relogio) extra.status = 'atendimento';
          }
          const usados = novo.agendamentos.filter((a) => a.data === data).map((a) => a.cliente.id);
          const livres = pool.filter((c) => !usados.includes(c.id));
          if (!livres.length) continue;
          add(b.id, data, m, servs, pega(livres), extra);
        }
      });
    }

    // vendas dos atendimentos já feitos hoje + algumas de balcão
    const formas = ['Pix', 'Pix', 'Cartão', 'Cartão', 'Dinheiro'];
    novo.agendamentos.filter((a) => a.data === hoje && a.status === 'pago').forEach((a) => {
      const plano = PC.assinaturaAtiva(a.cliente.id);
      novo.vendas.push({ id: PC.id(), data: hoje, hora: a.ini + a.dur, unidade: a.unidade, tipo: 'servico', ag: a.id, barbeiro: a.barbeiro, cliente: a.cliente.id,
        itens: [{ tipo: 'servico', id: a.servicos[0], nome: PC.nomeServicos(a.servicos), qtd: 1, preco: plano ? 0 : a.total }],
        total: plano ? 0 : a.total, forma: plano ? 'Plano' : pega(formas), vendedor: 'Recepção', nf: plano ? null : { status: 'pendente' } });
    });
    [[10 * 60 + 20, 'cb', 'pomada', 1], [11 * 60 + 5, 'cs', 'oleo', 1], [12 * 60 + 40, 'cb', 'shampoo', 1], [13 * 60 + 10, 'cs', 'cera', 2]].forEach(([h, u, p, q]) => {
      novo.vendas.push({ id: PC.id(), data: hoje, hora: h, unidade: u, tipo: 'balcao', cliente: pega(clientes).id,
        itens: [{ tipo: 'produto', id: p, nome: PC.produto(p).nome, qtd: q, preco: PC.produto(p).preco }], total: PC.produto(p).preco * q, forma: pega(formas), vendedor: 'Recepção', nf: { status: 'pendente' } });
    });
    novo.vendas.push({ id: PC.id(), data: hoje, hora: 11 * 60 + 30, unidade: 'cb', tipo: 'balcao', cliente: 'c33',
      itens: [{ tipo: 'plano', id: 'p-combo', nome: 'Plano Corte + Barba', qtd: 1, preco: 180 }], total: 180, forma: 'Pix', vendedor: 'Recepção', nf: { status: 'pendente' } });
    novo.assinaturas.push({ id: PC.id(), cliente: 'c33', plano: 'p-combo', inicio: hoje, vence: PC.somaDias(hoje, 30), unidade: 'cb' });

    // quase todas as notas da manhã já saíram sozinhas; as últimas ficam na fila
    const comNF = novo.vendas.filter((v) => v.nf).sort((a, b) => a.hora - b.hora);
    comNF.slice(0, Math.max(0, comNF.length - 4)).forEach((v) => PC.emitirNF(v));
    // parte dos horários marcados pelo site já veio paga no Pix
    novo.agendamentos.filter((a) => a.origem === 'Site' && a.status === 'agendado').forEach((a, i) => { if (i % 3 === 0) a.pix = { valor: a.total, pago: true }; });

    // uma troca por atraso que já aconteceu de manhã (pro gestor ver o histórico)
    novo.trocas.push({ id: PC.id(), data: hoje, hora: 10 * 60 + 18, unidade: 'cs', cliente: 'Breno Silva', de: 'bruno', para: 'vitor', atraso: 18, motivo: 'Troca por atraso' });

    return novo;
  }
})();
