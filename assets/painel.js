/* =====================================================================
   Palácio do Corte — painel da equipe (MODO DEMONSTRAÇÃO)
   Três perfis: barbeiro (só a própria agenda), recepção (agenda da
   unidade, encaixe, atraso, venda e caixa) e gestão (tudo).
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const E = PC.esc;
  const PX = 1.8;   // pixels por minuto na grade
  const OFF = 10;   // respiro no topo da grade

  const SKEY = 'palacio_sessao';
  let sess = (() => { try { return JSON.parse(sessionStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } })();
  const gravarSess = () => { try { sessionStorage.setItem(SKEY, JSON.stringify(sess)); } catch (e) { /* ok */ } };

  const ABAS = {
    recepcao: [['agenda', 'Agenda do dia'], ['vender', 'Vender'], ['clientes', 'Clientes'], ['caixa', 'Caixa']],
    barbeiro: [['minha', 'Minha agenda']],
    gestor: [['geral', 'Visão geral'], ['agenda', 'Agenda'], ['caixa', 'Caixa e vendas'], ['clientes', 'Clientes'], ['importar', 'Importar do Barbecode'], ['regras', 'Regras e acessos']]
  };
  const STATUS = { agendado: 'Agendado', chegou: 'Chegou', atendimento: 'Em atendimento', finalizado: 'Aguardando pagamento', pago: 'Pago', faltou: 'Não veio', cancelado: 'Cancelado' };
  const FORMAS = ['Pix', 'Cartão', 'Dinheiro'];

  const nomeB = (id) => (PC.barbeiro(id) || { nome: '?' }).nome;
  const inicial = (n) => String(n || '?').trim().charAt(0).toUpperCase();
  const primeiro = (n) => String(n || '').split(' ')[0];
  const perfilNome = () => sess.perfil === 'barbeiro' ? nomeB(sess.barbeiro) : sess.perfil === 'recepcao' ? 'Recepção' : 'Gestão';
  const achaAg = (id) => PC.db().agendamentos.find((a) => a.id === id);
  const dia = () => sess.dia || PC.hoje();

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  function salvarRender(msg) { PC.salvar(); render(); if (msg) toast(msg); }

  /* ---------------- modal ---------------- */
  function modal(html, aoMontar) {
    fecharModal();
    const v = document.createElement('div'); v.className = 'veu'; v.id = 'veu';
    v.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="fechar" aria-label="Fechar">×</button>${html}</div>`;
    $('#modais').appendChild(v);
    v.addEventListener('click', (e) => { if (e.target === v || e.target.classList.contains('fechar')) fecharModal(); });
    if (aoMontar) aoMontar($('.modal', v));
    const f = $('input,select,button.escolha', $('.modal', v)); if (f && f.tagName !== 'BUTTON') f.focus();
    return $('.modal', v);
  }
  function fecharModal() { const v = $('#veu'); if (v) v.remove(); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModal(); });

  /* ================= ENTRADA ================= */
  function renderEntrada() {
    $('#app').innerHTML = `
    <div class="entrada"><div class="entrada-caixa">
      <div class="entrada-topo">
        <img src="fotos/brasao.png" width="240" alt="Palácio do Corte Barbershop" style="width:min(240px,60vw);height:auto;margin:0 auto">
        <h1>Painel da equipe</h1>
        <p>Escolha como entrar.</p>
      </div>
      <div class="perfis">
        <div class="perfil">
          <span class="ic">✂</span><h2>Barbeiro</h2>
          <p>Vê só a própria agenda. Inicia e finaliza o atendimento, bloqueia horário e acompanha a comissão do dia.</p>
          <select id="e-barb" aria-label="Qual barbeiro">${PC.unidades.map((u) => `<optgroup label="${E(u.nome)}">${PC.barbeirosDa(u.id).map((b) => `<option value="${b.id}">${E(b.nome)}</option>`).join('')}</optgroup>`).join('')}</select>
          <button class="btn btn-azul" data-entrar="barbeiro">Entrar como barbeiro</button>
        </div>
        <div class="perfil">
          <span class="ic">🛎</span><h2>Recepção</h2>
          <p>Agenda de todos os barbeiros da unidade, encaixe, cliente atrasado, venda de produtos e planos e o caixa do dia.</p>
          <div class="duas">${PC.unidades.map((u) => `<button class="btn btn-azul" data-entrar="recepcao" data-u="${u.id}">Recepção ${E(u.nome)}</button>`).join('')}</div>
        </div>
        <div class="perfil">
          <span class="ic">👑</span><h2>Gestão</h2>
          <p>As duas unidades juntas: faturamento, comissão por barbeiro, planos, estoque, importação de clientes e regras.</p>
          <button class="btn btn-ouro" data-entrar="gestor">Entrar como gestão</button>
        </div>
      </div>
      <p class="entrada-nota">Na versão final, cada pessoa entra com e-mail e senha e só vê o que o perfil dela permite. · <a href="index.html" style="color:#F4DE9C">Ver o site do cliente</a></p>
    </div></div>`;
    $$('[data-entrar]').forEach((b) => b.onclick = () => {
      const p = b.dataset.entrar;
      sess = { perfil: p, aba: ABAS[p][0][0] };
      if (p === 'barbeiro') { sess.barbeiro = $('#e-barb').value; sess.unidade = PC.barbeiro(sess.barbeiro).unidade; }
      if (p === 'recepcao') sess.unidade = b.dataset.u;
      if (p === 'gestor') { sess.unidVer = 'todas'; sess.unidAgenda = 'cb'; }
      gravarSess(); render();
    });
  }

  /* ================= MOLDURA ================= */
  function unidadeDaAgenda() { return sess.perfil === 'gestor' ? (sess.unidAgenda || 'cb') : sess.unidade; }
  function contarAtrasados() {
    const u = sess.perfil === 'gestor' ? null : sess.unidade;
    return PC.doDia(PC.hoje(), (a) => (!u || a.unidade === u) && PC.estaAtrasado(a)).length;
  }

  function render() {
    if (!sess) { renderEntrada(); return; }
    const abas = ABAS[sess.perfil];
    if (!abas.some((a) => a[0] === sess.aba)) sess.aba = abas[0][0];
    const quem = sess.perfil === 'barbeiro' ? `${nomeB(sess.barbeiro)} · ${PC.unidade(sess.unidade).nome}`
      : sess.perfil === 'recepcao' ? `Recepção · ${PC.unidade(sess.unidade).nome}` : 'Gestão · todas as unidades';
    const rel = PC.db().relogio; const atrasados = contarAtrasados();
    $('#app').innerHTML = `
      <header class="barra">
        <div class="barra-in">
          <span class="marca"><img src="fotos/escudo.png" width="44" alt=""><i style="font-style:italic;letter-spacing:0">Palácio do Corte</i></span>
          <span class="quem"><span class="av">${inicial(perfilNome())}</span>${E(quem)}</span>
          <div class="relogio" title="Na demonstração dá pra fixar o relógio e mostrar a cena do atraso a qualquer hora">
            <span>Relógio da demo</span>
            <input type="time" id="rel-hora" value="${PC.hhmm(PC.agora())}" ${rel.modo === 'demo' ? '' : 'disabled'} aria-label="Hora da demonstração">
            <label><input type="checkbox" id="rel-real" ${rel.modo === 'demo' ? '' : 'checked'}> hora real</label>
          </div>
          <a href="#" class="sair" id="sair">Trocar de perfil</a>
        </div>
        <nav class="abas" role="tablist">${abas.map(([id, n]) => `<button class="aba" role="tab" data-aba="${id}" aria-selected="${sess.aba === id}">${n}${(id === 'agenda' || id === 'minha') && atrasados && sess.perfil !== 'barbeiro' ? `<span class="bolha">${atrasados}</span>` : ''}</button>`).join('')}</nav>
      </header>
      <main id="conteudo"></main>`;
    $('#sair').onclick = (e) => { e.preventDefault(); sess = null; try { sessionStorage.removeItem(SKEY); } catch (er) { /* ok */ } render(); };
    $$('.aba').forEach((b) => b.onclick = () => { sess.aba = b.dataset.aba; gravarSess(); render(); });
    $('#rel-hora').onchange = (e) => { const [h, m] = e.target.value.split(':').map(Number); if (isNaN(h)) return; PC.db().relogio = { modo: 'demo', min: h * 60 + m }; salvarRender(); };
    $('#rel-real').onchange = (e) => { PC.db().relogio = e.target.checked ? { modo: 'real' } : { modo: 'demo', min: PC.agoraReal() }; salvarRender(); };
    TELAS[sess.aba]();
    gravarSess();
  }

  /* ================= AGENDA (recepção e gestão) ================= */
  function cabDia(titulo, extra) {
    return `<div class="cab"><h1>${titulo}<small>${PC.fmtData(dia(), true)}${dia() === PC.hoje() ? ' · hoje' : ''}</small></h1>
      ${extra || ''}
      <div class="navdia"><button class="btn btn-linha btn-peq" data-dia="-1" aria-label="Dia anterior">‹</button><button class="btn btn-linha btn-peq" data-dia="0">Hoje</button><button class="btn btn-linha btn-peq" data-dia="1" aria-label="Próximo dia">›</button></div></div>`;
  }
  function ligarDia(c) {
    $$('[data-dia]', c).forEach((b) => b.onclick = () => { const d = Number(b.dataset.dia); sess.dia = d === 0 ? PC.hoje() : PC.somaDias(dia(), d); render(); });
  }
  function chipsUnidade(chave, comTodas) {
    const atual = sess[chave] || (comTodas ? 'todas' : 'cb');
    const ops = (comTodas ? [['todas', 'Todas']] : []).concat(PC.unidades.map((u) => [u.id, u.nome]));
    return `<div class="chips">${ops.map(([id, n]) => `<button class="chip" data-chip="${chave}" data-v="${id}" aria-pressed="${atual === id}">${E(n)}</button>`).join('')}</div>`;
  }
  function ligarChips(c) { $$('[data-chip]', c).forEach((b) => b.onclick = () => { sess[b.dataset.chip] = b.dataset.v; render(); }); }

  function telaAgenda() {
    const c = $('#conteudo'); const unid = unidadeDaAgenda(); const d = dia();
    const ags = PC.doDia(d, (a) => a.unidade === unid && a.status !== 'cancelado');
    const atrasados = d === PC.hoje() ? ags.filter((a) => PC.estaAtrasado(a)) : [];
    const aPagar = ags.filter((a) => a.status === 'finalizado');
    c.innerHTML = cabDia(`Agenda · ${E(PC.unidade(unid).nome)}`,
      (sess.perfil === 'gestor' ? chipsUnidade('unidAgenda', false) : '') + `<button class="btn btn-azul" data-acao="novo">+ Novo horário / encaixe</button>`) + `
      <div class="alertas">${atrasados.map(alertaAtraso).join('')}${aPagar.map(alertaPagar).join('')}</div>
      ${PC.expedienteDe(d) ? grade(PC.barbeirosDa(unid), ags, d) : '<p class="vazio">Fechado neste dia.</p>'}
      <div class="legenda">
        ${['agendado', 'chegou', 'atendimento', 'finalizado', 'pago', 'faltou'].map((s) => `<span><i style="background:var(--st-${s});border-color:var(--st-${s}-b)"></i>${STATUS[s]}</span>`).join('')}
        <span><i style="background:#FFE9E9;border-color:var(--verm)"></i>Atrasado (passou da tolerância de ${PC.regras().tolerancia} min)</span>
        <span><i style="outline:2px dashed var(--ouro);border-color:transparent"></i>Trocou de barbeiro</span>
      </div>`;
    ligarDia(c); ligarChips(c); ligarAcoes(c);
  }

  function alertaAtraso(a) {
    const b = nomeB(a.barbeiro);
    const msg = `Oi, ${primeiro(a.cliente.nome)}! Aqui é a recepção do Palácio do Corte 👑. Seu horário com o ${b} era às ${PC.hm(a.ini)}. Você ainda vem? Se o ${b} já estiver com o próximo cliente, a gente encaixa você com outro barbeiro livre.`;
    return `<div class="alerta"><p><b>${E(a.cliente.nome)}</b> ainda não chegou · ${E(b)} às ${PC.hm(a.ini)} · <b>${PC.atrasoMin(a)} min de atraso</b></p>
      <div class="acoes"><button class="btn btn-azul btn-peq" data-acao="chegou" data-id="${a.id}">Chegou agora</button>
      <a class="btn btn-zap btn-peq" target="_blank" rel="noopener" href="${PC.zap(a.cliente.tel, msg)}">Avisar no WhatsApp</a>
      <button class="btn btn-verm btn-peq" data-acao="faltou" data-id="${a.id}">Não veio</button></div></div>`;
  }
  function alertaPagar(a) {
    return `<div class="alerta pagar"><p><b>${E(a.cliente.nome)}</b> terminou com o ${E(nomeB(a.barbeiro))} · ${E(PC.nomeServicos(a.servicos))} · ${PC.reais(a.total)}</p>
      <div class="acoes"><button class="btn btn-ouro btn-peq" data-acao="cobrar" data-id="${a.id}">Cobrar</button></div></div>`;
  }

  function grade(barbs, ags, d) {
    const [a0, a1] = PC.expedienteDe(d); const H = (a1 - a0) * PX + OFF * 2;
    let linhas = ''; let horas = '';
    for (let m = a0; m <= a1; m += 30) {
      linhas += `<div class="g-linha ${m % 60 ? 'meia' : ''}" style="top:${OFF + (m - a0) * PX}px"></div>`;
      if (m % 60 === 0) horas += `<div class="g-hora" style="top:${OFF + (m - a0) * PX}px">${PC.hhmm(m)}</div>`;
    }
    const agora = PC.agora();
    const linhaAgora = d === PC.hoje() && agora >= a0 && agora <= a1 ? `<div class="g-agora" data-h="${PC.hhmm(agora)}" style="top:${OFF + (agora - a0) * PX}px"></div>` : '';
    const cols = barbs.map((b) => {
      const meus = ags.filter((a) => a.barbeiro === b.id);
      const blq = PC.db().bloqueios.filter((x) => x.barbeiro === b.id && x.data === d)
        .map((x) => `<div class="bloqueio" style="top:${OFF + (x.ini - a0) * PX}px;height:${(x.fim - x.ini) * PX - 3}px">${E(x.motivo || 'Bloqueado')}</div>`).join('');
      return `<div class="g-col"><div class="g-cab"><span class="av">${inicial(b.nome)}</span><span>${E(b.nome)}<small>${meus.filter(PC.ativo).length} clientes</small></span></div>
        <div class="g-corpo" style="height:${H}px">${linhas}${linhaAgora}${blq}${meus.map((a) => cardAg(a, a0)).join('')}</div></div>`;
    }).join('');
    return `<div class="grade-wrap"><div class="grade" style="--cols:${barbs.length}">
      <div><div class="g-cab"></div><div class="g-corpo" style="height:${H}px">${horas}${linhaAgora}</div></div>${cols}</div></div>`;
  }

  function cardAg(a, a0) {
    const atr = PC.estaAtrasado(a); const h = Math.max(a.dur * PX - 3, 24);
    const st = atr ? `Atrasado ${PC.atrasoMin(a)} min` : STATUS[a.status];
    return `<button class="ag s-${a.status} ${atr ? 'atrasado' : ''} ${a.barbeiroOriginal ? 'troca' : ''}" data-acao="abrir" data-id="${a.id}" style="top:${OFF + (a.ini - a0) * PX}px;height:${h}px" title="${E(a.cliente.nome)} · ${E(PC.nomeServicos(a.servicos))}">
      <b>${PC.hhmm(a.ini)} ${E(a.cliente.nome)}</b>${h > 36 ? `<span>${E(PC.nomeServicos(a.servicos))}</span>` : ''}${h > 52 ? `<span class="st">${st}</span>` : ''}</button>`;
  }

  /* ---------------- ações sobre um horário ---------------- */
  function ligarAcoes(c) {
    $$('[data-acao]', c).forEach((el) => el.onclick = (e) => { e.preventDefault(); acao(el.dataset.acao, el.dataset.id, el); });
  }
  function acao(nome, id, el) {
    const a = id ? achaAg(id) : null;
    switch (nome) {
      case 'abrir': return modalAg(a);
      case 'chegou': return chegada(a);
      case 'faltou': a.status = 'faltou'; PC.registrar(a, 'Marcado como não veio'); fecharModal(); return salvarRender(`${a.cliente.nome} marcado como não veio.`);
      case 'iniciar': a.status = 'atendimento'; PC.registrar(a, `Atendimento iniciado por ${perfilNome()}`); fecharModal(); return salvarRender('Atendimento iniciado.');
      case 'finalizar': a.status = 'finalizado'; PC.registrar(a, `Finalizado por ${perfilNome()}`); fecharModal(); return salvarRender('Finalizado. A recepção faz a cobrança.');
      case 'cobrar': return modalCobrar(a);
      case 'trocar': return modalTrocar(a);
      case 'remarcar': return modalNovo(a);
      case 'cancelar':
        if (!confirm(`Cancelar o horário de ${a.cliente.nome}?`)) return;
        a.status = 'cancelado'; PC.registrar(a, `Cancelado por ${perfilNome()}`); fecharModal(); return salvarRender('Horário cancelado.');
      case 'novo': return modalNovo(null);
      case 'bloquear': return modalBloquear();
    }
  }

  function modalAg(a) {
    const s = PC.assinaturaAtiva(a.cliente.id); const atr = PC.estaAtrasado(a);
    const ehBarbeiro = sess.perfil === 'barbeiro';
    let botoes = '';
    if (ehBarbeiro) {
      if (['agendado', 'chegou'].includes(a.status)) botoes = `<button class="btn btn-azul" data-acao="iniciar" data-id="${a.id}">Iniciar atendimento</button>`;
      if (a.status === 'atendimento') botoes = `<button class="btn btn-ouro" data-acao="finalizar" data-id="${a.id}">Finalizar</button>`;
    } else {
      if (a.status === 'agendado') botoes = `<button class="btn btn-azul" data-acao="chegou" data-id="${a.id}">Chegou</button>
        <button class="btn btn-linha" data-acao="trocar" data-id="${a.id}">Trocar barbeiro</button>
        <button class="btn btn-linha" data-acao="remarcar" data-id="${a.id}">Remarcar</button>
        <button class="btn btn-verm" data-acao="faltou" data-id="${a.id}">Não veio</button>
        <button class="btn btn-verm" data-acao="cancelar" data-id="${a.id}">Cancelar</button>`;
      if (a.status === 'chegou') botoes = `<button class="btn btn-azul" data-acao="iniciar" data-id="${a.id}">Iniciar atendimento</button>
        <button class="btn btn-linha" data-acao="trocar" data-id="${a.id}">Trocar barbeiro</button>
        <button class="btn btn-verm" data-acao="cancelar" data-id="${a.id}">Cancelar</button>`;
      if (a.status === 'atendimento' || a.status === 'finalizado') botoes = `<button class="btn btn-ouro" data-acao="cobrar" data-id="${a.id}">${a.status === 'atendimento' ? 'Finalizar e cobrar' : 'Cobrar'}</button>`;
    }
    const m = modal(`
      <h2>${E(a.cliente.nome)}</h2>
      <p class="sub">${atr ? `<span class="tag verm">Atrasado ${PC.atrasoMin(a)} min</span>` : `<span class="tag">${STATUS[a.status]}</span>`} ${s ? `<span class="tag ouro">${E(PC.plano(s.plano).nome)}</span>` : ''} ${a.barbeiroOriginal ? `<span class="tag ouro">Era do ${E(nomeB(a.barbeiroOriginal))}</span>` : ''}</p>
      <dl class="dl">
        <dt>Quando</dt><dd>${PC.fmtData(a.data, true)}, ${PC.hm(a.ini)} às ${PC.hm(a.ini + a.dur)}</dd>
        <dt>Barbeiro</dt><dd>${E(nomeB(a.barbeiro))} · ${E(PC.unidade(a.unidade).nome)}</dd>
        <dt>Serviços</dt><dd>${E(PC.nomeServicos(a.servicos))} · ${PC.reais(a.total)}</dd>
        ${ehBarbeiro ? '' : `<dt>WhatsApp</dt><dd><a href="${PC.zap(a.cliente.tel, `Oi, ${primeiro(a.cliente.nome)}! Aqui é do Palácio do Corte.`)}" target="_blank" rel="noopener">${E(a.cliente.tel)}</a></dd>`}
        <dt>Marcado por</dt><dd>${E(a.origem)}</dd>
      </dl>
      <div class="acoes-modal">${botoes}</div>
      ${(a.historico || []).length ? `<ul class="hist">${a.historico.map((h) => `<li>${PC.hm(h.hora)} · ${E(h.texto)}</li>`).join('')}</ul>` : ''}`);
    ligarAcoes(m);
  }

  /* ---------------- chegada e troca por atraso ---------------- */
  function chegada(a) {
    const agora = PC.agora(); const tol = PC.regras().tolerancia;
    if (a.data !== PC.hoje() || agora - a.ini <= tol) {
      a.status = 'chegou'; PC.registrar(a, `Chegou às ${PC.hm(agora)}`); fecharModal(); return salvarRender(`${a.cliente.nome} chegou.`);
    }
    const op = PC.opcoesAtraso(a, agora);
    if (op.mantem) {
      a.ini = op.ini; a.status = 'chegou';
      PC.registrar(a, `Chegou ${op.atraso} min atrasado; ainda cabia na agenda do ${nomeB(a.barbeiro)}`);
      fecharModal(); return salvarRender(`${a.cliente.nome} chegou atrasado, mas ainda cabe com o ${nomeB(a.barbeiro)}. Mantido.`);
    }
    const melhor = op.alternativas[0];
    if (PC.regras().modoTroca === 'automatico' && melhor && melhor.espera === 0) {
      const antes = { barbeiro: a.barbeiro, ini: a.ini, hist: (a.historico || []).length, trocas: PC.db().trocas.length };
      PC.trocarBarbeiro(a, melhor.barbeiro, melhor.ini, 'Troca automática por atraso'); a.status = 'chegou';
      PC.salvar(); render();
      const m = modal(`
        <h2>Troca automática feita</h2>
        <div class="explica">${explicaAtraso(a, op, antes.barbeiro)}</div>
        <p>O sistema passou ${E(primeiro(a.cliente.nome))} para o <b>${E(nomeB(melhor.barbeiro))}</b>, que está livre agora e tem menos clientes hoje. A agenda do ${E(nomeB(antes.barbeiro))} segue sem atraso.</p>
        <div class="acoes-modal"><button class="btn btn-azul" id="ok">Ok</button><button class="btn btn-linha" id="desfazer">Desfazer</button></div>`);
      $('#ok', m).onclick = fecharModal;
      $('#desfazer', m).onclick = () => {
        a.barbeiro = antes.barbeiro; a.ini = antes.ini; a.status = 'agendado'; delete a.barbeiroOriginal;
        a.historico.length = antes.hist; PC.db().trocas.length = antes.trocas; fecharModal(); salvarRender('Troca desfeita.');
      };
      return;
    }
    modalAtraso(a, op);
  }

  function explicaAtraso(a, op, barbeiroId) {
    const b = nomeB(barbeiroId || a.barbeiro);
    const prox = PC.doDia(a.data, (x) => x.barbeiro === (barbeiroId || a.barbeiro) && x.id !== a.id && PC.ativo(x) && x.ini >= a.ini)[0];
    return `<b>${E(primeiro(a.cliente.nome))} chegou ${op.atraso} min atrasado</b> (tolerância: ${PC.regras().tolerancia} min).
      ${prox ? `O ${E(b)} tem o próximo cliente às ${PC.hm(prox.ini)} e ${E(PC.nomeServicos(a.servicos).toLowerCase())} leva ${a.dur} min, então não cabe mais sem atrasar quem vem depois.` : `O ${E(b)} não tem mais tempo livre agora.`}`;
  }

  function modalAtraso(a, op) {
    const b = nomeB(a.barbeiro);
    const alts = op.alternativas.map((o, i) => {
      const rec = i === 0 && o.espera === 0;
      return `<button class="escolha ${rec ? 'rec' : ''}" data-op="troca" data-b="${o.barbeiro}" data-ini="${o.ini}">
        <span class="av">${inicial(nomeB(o.barbeiro))}</span>
        <span><b>Trocar para o ${E(nomeB(o.barbeiro))}</b><small>${o.espera ? `Livre às ${PC.hm(o.ini)} · espera de ${o.espera} min` : `Livre agora · ${PC.qtdNoDia(o.barbeiro, a.data)} clientes hoje`}</small></span>
        ${rec ? '<span class="tag verde">Sugerido</span>' : ''}</button>`;
    }).join('');
    const m = modal(`
      <h2>Cliente chegou atrasado</h2>
      <div class="explica">${explicaAtraso(a, op)}</div>
      <p class="sub">${op.alternativas.length ? 'Escolha com um toque:' : 'Nenhum outro barbeiro da unidade está livre agora.'}</p>
      <div class="escolhas">
        ${alts}
        ${op.proximoMesmo != null ? `<button class="escolha" data-op="esperar" data-ini="${op.proximoMesmo}"><span class="av">${inicial(b)}</span><span><b>Esperar o ${E(b)}</b><small>Próximo horário livre dele: ${PC.hm(op.proximoMesmo)}</small></span></button>` : ''}
        <button class="escolha" data-op="remarcar"><span class="av">↻</span><span><b>Remarcar</b><small>Escolher outro dia ou horário</small></span></button>
      </div>
      <p class="ajuda" style="margin-top:1rem">Em Regras, a gestão pode deixar essa troca automática: o sistema escolhe o barbeiro sugerido sozinho.</p>`);
    $$('[data-op]', m).forEach((el) => el.onclick = () => {
      const ini = Number(el.dataset.ini);
      if (el.dataset.op === 'troca') {
        const de = a.barbeiro; PC.trocarBarbeiro(a, el.dataset.b, ini, 'Troca por atraso'); a.status = 'chegou';
        fecharModal(); salvarRender(`${primeiro(a.cliente.nome)} passou do ${nomeB(de)} para o ${nomeB(el.dataset.b)}, às ${PC.hm(ini)}.`);
      } else if (el.dataset.op === 'esperar') {
        a.ini = ini; a.status = 'chegou'; PC.registrar(a, `Chegou ${op.atraso} min atrasado; vai esperar o ${b} às ${PC.hm(ini)}`);
        fecharModal(); salvarRender(`${primeiro(a.cliente.nome)} vai esperar o ${b} às ${PC.hm(ini)}.`);
      } else modalNovo(a);
    });
  }

  function modalTrocar(a) {
    const agora = PC.agora();
    const base = a.data === PC.hoje() && agora > a.ini ? Math.ceil(agora / 5) * 5 : a.ini;
    const outros = PC.barbeirosDa(a.unidade).filter((b) => b.id !== a.barbeiro)
      .map((b) => ({ b, ini: PC.livre(b.id, a.data, base, a.dur, a.id) ? base : PC.proximoLivre(b.id, a.data, base, a.dur, a.id) }))
      .filter((o) => o.ini != null).sort((x, y) => x.ini - y.ini);
    const m = modal(`<h2>Trocar barbeiro</h2><p class="sub">${E(a.cliente.nome)} · ${E(PC.nomeServicos(a.servicos))} · hoje com o ${E(nomeB(a.barbeiro))}</p>
      <div class="escolhas">${outros.length ? outros.map((o) => `<button class="escolha" data-b="${o.b.id}" data-ini="${o.ini}"><span class="av">${inicial(o.b.nome)}</span><span><b>${E(o.b.nome)}</b><small>${o.ini === base ? 'Livre no mesmo horário' : 'Livre às ' + PC.hm(o.ini)}</small></span></button>`).join('') : '<p class="vazio">Ninguém livre nesse dia.</p>'}</div>`);
    $$('[data-b]', m).forEach((el) => el.onclick = () => {
      const de = a.barbeiro; PC.trocarBarbeiro(a, el.dataset.b, Number(el.dataset.ini), 'Troca manual');
      fecharModal(); salvarRender(`Trocado do ${nomeB(de)} para o ${nomeB(el.dataset.b)}.`);
    });
  }

  /* ---------------- cobrança ---------------- */
  function descontoProdutos(clienteId) { const s = clienteId && PC.assinaturaAtiva(clienteId); return s && s.plano === 'p-realeza' ? 0.1 : 0; }

  function modalCobrar(a) {
    const s = PC.assinaturaAtiva(a.cliente.id); const plano = s && PC.plano(s.plano);
    const cobre = !!plano && a.servicos.every((x) => plano.cobre.includes(x));
    const st = { usarPlano: cobre, extras: {}, forma: 'Pix' };
    const desc = descontoProdutos(a.cliente.id);
    const m = modal('<div id="cob"></div>');
    const desenhar = () => {
      const servico = st.usarPlano ? 0 : a.total;
      const prods = Object.entries(st.extras).filter(([, q]) => q > 0).map(([id, q]) => ({ p: PC.produto(id), q }));
      const totalProd = prods.reduce((t, x) => t + x.p.preco * x.q, 0) * (1 - desc);
      const total = servico + totalProd;
      $('#cob', m).innerHTML = `
        <h2>Cobrar · ${E(a.cliente.nome)}</h2>
        <p class="sub">${E(PC.nomeServicos(a.servicos))} com o ${E(nomeB(a.barbeiro))}</p>
        <div class="linha-it"><span>${E(PC.nomeServicos(a.servicos))}</span><b>${st.usarPlano ? `<s style="color:var(--tinta3)">${PC.reais(a.total)}</s> R$ 0,00` : PC.reais(a.total)}</b></div>
        ${cobre ? `<label class="linha-it" style="cursor:pointer"><input type="checkbox" id="usar-plano" ${st.usarPlano ? 'checked' : ''} style="width:20px;height:20px"><span>Usar o <b>${E(plano.nome)}</b> (vence ${PC.fmtData(s.vence)})</span></label>` : ''}
        ${prods.map((x) => `<div class="linha-it"><span>${E(x.p.nome)} × ${x.q}</span><b>${PC.reais(x.p.preco * x.q * (1 - desc))}</b></div>`).join('')}
        <p class="ajuda" style="margin:.8rem 0 .4rem">Levar um produto junto?${desc ? ' (Plano Realeza: 10% de desconto)' : ''}</p>
        <div class="chips">${PC.produtos.map((p) => `<button class="chip" data-p="${p.id}">+ ${E(p.nome)}</button>`).join('')}</div>
        <div class="total"><span>Total</span><span>${PC.reais(total)}</span></div>
        ${total > 0 ? `<div class="formas">${FORMAS.map((f) => `<button class="chip" data-f="${f}" aria-pressed="${st.forma === f}">${f}</button>`).join('')}</div>` : ''}
        <button class="btn btn-ouro" style="width:100%" id="confirma">Confirmar ${total > 0 ? 'pagamento de ' + PC.reais(total) : 'pelo plano'}</button>`;
      const up = $('#usar-plano', m); if (up) up.onchange = () => { st.usarPlano = up.checked; desenhar(); };
      $$('[data-p]', m).forEach((b) => b.onclick = () => { st.extras[b.dataset.p] = (st.extras[b.dataset.p] || 0) + 1; desenhar(); });
      $$('[data-f]', m).forEach((b) => b.onclick = () => { st.forma = b.dataset.f; desenhar(); });
      $('#confirma', m).onclick = () => {
        const itens = [{ tipo: 'servico', id: a.servicos[0], nome: PC.nomeServicos(a.servicos), qtd: 1, preco: servico }]
          .concat(prods.map((x) => ({ tipo: 'produto', id: x.p.id, nome: x.p.nome, qtd: x.q, preco: x.p.preco * (1 - desc) })));
        PC.lancarVenda({ unidade: a.unidade, tipo: 'servico', ag: a.id, barbeiro: a.barbeiro, cliente: a.cliente.id, itens, total, forma: total > 0 ? st.forma : 'Plano', vendedor: perfilNome() });
        a.status = 'pago'; PC.registrar(a, `Pago: ${PC.reais(total)} (${total > 0 ? st.forma : 'plano'})`);
        fecharModal(); salvarRender(`Pagamento registrado: ${PC.reais(total)}.`);
      };
    };
    desenhar();
  }

  /* ---------------- novo horário / encaixe / remarcar ---------------- */
  function modalNovo(edit) {
    const unid = edit ? edit.unidade : unidadeDaAgenda();
    const st = {
      nome: edit ? edit.cliente.nome : '', tel: edit ? edit.cliente.tel : '',
      servicos: edit ? edit.servicos.slice() : ['corte'], barbeiro: edit ? edit.barbeiro : 'livre',
      data: edit ? edit.data : dia(), ini: null
    };
    const m = modal(`
      <h2>${edit ? 'Remarcar horário' : 'Novo horário ou encaixe'}</h2>
      <p class="sub">${E(PC.unidade(unid).nome)}</p>
      <datalist id="dl-cli">${PC.db().clientes.map((c) => `<option value="${E(c.nome)}">`).join('')}</datalist>
      <label class="campo"><span>Cliente</span><input id="n-nome" list="dl-cli" value="${E(st.nome)}" placeholder="Nome (busca na base)" ${edit ? 'readonly' : ''}></label>
      <label class="campo"><span>WhatsApp</span><input id="n-tel" inputmode="tel" value="${E(st.tel)}" placeholder="71 9 0000-0000" ${edit ? 'readonly' : ''}></label>
      <div class="campo"><span>Serviços</span><div class="servs-chk">${PC.servicos.map((s) => `<label><input type="checkbox" value="${s.id}" ${st.servicos.includes(s.id) ? 'checked' : ''}>${E(s.nome)} <small>${s.dur}′</small></label>`).join('')}</div></div>
      <label class="campo"><span>Barbeiro</span><select id="n-barb"><option value="livre">Primeiro livre (menos clientes no dia)</option>${PC.barbeirosDa(unid).map((b) => `<option value="${b.id}" ${st.barbeiro === b.id ? 'selected' : ''}>${E(b.nome)}</option>`).join('')}</select></label>
      <label class="campo"><span>Dia</span><input type="date" id="n-data" value="${st.data}" min="${PC.hoje()}"></label>
      <label class="campo"><span>Horário</span><select id="n-hora"></select><p class="ajuda" id="n-ajuda"></p></label>
      <button class="btn btn-azul" style="width:100%" id="n-salvar">${edit ? 'Salvar novo horário' : 'Marcar'}</button>`);
    const dur = () => PC.durDe(st.servicos);
    const horarios = () => {
      const exp = PC.expedienteDe(st.data); if (!exp || !st.servicos.length) return [];
      const min = st.data === PC.hoje() ? Math.ceil(PC.agora() / 5) * 5 : 0;
      const barbs = st.barbeiro === 'livre' ? PC.barbeirosDa(unid).map((b) => b.id) : [st.barbeiro];
      const lista = [];
      const marcos = new Set([min]); for (let x = exp[0]; x < exp[1]; x += 15) marcos.add(x);
      [...marcos].sort((p, q) => p - q).forEach((x) => {
        if (x < min || x < exp[0] || x + dur() > exp[1]) return;
        if (barbs.some((b) => PC.livre(b, st.data, x, dur(), edit && edit.id))) lista.push(x);
      });
      return lista;
    };
    const desenharHoras = () => {
      const hs = horarios(); const sel = $('#n-hora', m);
      sel.innerHTML = hs.length ? hs.map((x, i) => `<option value="${x}">${PC.hhmm(x)}${i === 0 && st.data === PC.hoje() && x === Math.ceil(PC.agora() / 5) * 5 ? ' · agora (encaixe)' : ''}</option>`).join('') : '<option value="">Sem horário livre</option>';
      $('#n-ajuda', m).textContent = st.servicos.length ? `Duração: ${dur()} min · ${PC.reais(PC.precoDe(st.servicos))}` : 'Escolha pelo menos um serviço.';
      $('#n-salvar', m).disabled = !hs.length;
    };
    $('#n-nome', m).oninput = (e) => { const c = PC.db().clientes.find((x) => x.nome === e.target.value); if (c) $('#n-tel', m).value = c.tel; };
    $$('.servs-chk input', m).forEach((cb) => cb.onchange = () => { st.servicos = $$('.servs-chk input:checked', m).map((x) => x.value); desenharHoras(); });
    $('#n-barb', m).onchange = (e) => { st.barbeiro = e.target.value; desenharHoras(); };
    $('#n-data', m).onchange = (e) => { st.data = e.target.value || PC.hoje(); desenharHoras(); };
    desenharHoras();
    $('#n-salvar', m).onclick = () => {
      const nome = $('#n-nome', m).value.trim(); const tel = $('#n-tel', m).value;
      const ini = Number($('#n-hora', m).value);
      if (nome.length < 2) { alert('Coloque o nome do cliente.'); return; }
      let barb = st.barbeiro;
      if (barb === 'livre') barb = PC.barbeirosDa(unid).filter((b) => PC.livre(b.id, st.data, ini, dur(), edit && edit.id))
        .sort((x, y) => PC.qtdNoDia(x.id, st.data) - PC.qtdNoDia(y.id, st.data))[0].id;
      if (edit) {
        edit.data = st.data; edit.ini = ini; edit.barbeiro = barb; edit.servicos = st.servicos.slice(); edit.dur = dur(); edit.total = PC.precoDe(st.servicos); edit.status = 'agendado';
        PC.registrar(edit, `Remarcado para ${PC.fmtData(st.data)} ${PC.hm(ini)} com ${nomeB(barb)}`);
        fecharModal(); return salvarRender('Horário remarcado.');
      }
      const c = PC.acharOuCriarCliente(nome, tel, 'Balcão');
      const a = { id: PC.id(), unidade: unid, barbeiro: barb, data: st.data, ini, servicos: st.servicos.slice(), dur: dur(), total: PC.precoDe(st.servicos),
        cliente: { id: c.id, nome: c.nome, tel: c.tel }, status: 'agendado', origem: 'Recepção', historico: [] };
      PC.registrar(a, `Marcado pela ${perfilNome()}`);
      PC.db().agendamentos.push(a); fecharModal(); salvarRender(`Marcado: ${c.nome} com ${nomeB(barb)} às ${PC.hm(ini)}.`);
    };
  }

  /* ================= BARBEIRO ================= */
  function telaMinha() {
    const c = $('#conteudo'); const d = dia(); const eu = sess.barbeiro;
    const meus = PC.doDia(d, (a) => a.barbeiro === eu && a.status !== 'cancelado');
    const ativos = meus.filter(PC.ativo);
    const feitos = meus.filter((a) => a.status === 'pago');
    const fat = PC.db().vendas.filter((v) => v.data === d && v.barbeiro === eu).reduce((t, v) => t + v.itens.filter((i) => i.tipo === 'servico').reduce((s, i) => s + i.preco, 0), 0);
    const prox = meus.find((a) => ['agendado', 'chegou'].includes(a.status) && (d !== PC.hoje() || a.ini + a.dur > PC.agora()));
    const blq = PC.db().bloqueios.filter((x) => x.barbeiro === eu && x.data === d);
    c.innerHTML = cabDia('Minha agenda', `<button class="btn btn-linha" data-acao="bloquear">Bloquear horário</button>`) + `
      <div class="kpis">
        <div class="kpi"><span>Clientes no dia</span><b>${ativos.length}</b></div>
        <div class="kpi"><span>Atendidos</span><b>${feitos.length}</b></div>
        <div class="kpi"><span>Minha comissão (${PC.regras().comissao}%)</span><b>${PC.reais(fat * PC.regras().comissao / 100)}</b><small>sobre ${PC.reais(fat)} em serviços</small></div>
        <div class="kpi"><span>Próximo</span><b>${prox ? PC.hm(prox.ini) : '—'}</b><small>${prox ? E(prox.cliente.nome) : 'livre'}</small></div>
      </div>
      ${blq.length ? `<p class="ajuda" style="margin-bottom:.6rem">Bloqueado: ${blq.map((x) => `${PC.hm(x.ini)}–${PC.hm(x.fim)} (${E(x.motivo)})`).join(', ')}</p>` : ''}
      <div class="lista">${meus.length ? meus.map((a) => {
        const atr = PC.estaAtrasado(a);
        const cor = atr ? 'var(--verm)' : `var(--st-${a.status}-b)`;
        let bt = '';
        if (['agendado', 'chegou'].includes(a.status)) bt = `<button class="btn btn-azul btn-peq" data-acao="iniciar" data-id="${a.id}">Iniciar</button>`;
        if (a.status === 'atendimento') bt = `<button class="btn btn-ouro btn-peq" data-acao="finalizar" data-id="${a.id}">Finalizar</button>`;
        if (a.status === 'finalizado') bt = '<span class="ajuda">A recepção está cobrando</span>';
        return `<div class="item" style="border-left-color:${cor}">
          <span class="h">${PC.hhmm(a.ini)}</span>
          <span class="info"><b>${E(a.cliente.nome)}</b><small>${E(PC.nomeServicos(a.servicos))} · ${a.dur} min</small></span>
          ${a.barbeiroOriginal && a.barbeiroOriginal !== eu ? `<span class="tag ouro">Veio do ${E(nomeB(a.barbeiroOriginal))}</span>` : ''}
          <span class="pill" style="color:${cor};border-color:${cor}">${atr ? 'Atrasado ' + PC.atrasoMin(a) + ' min' : STATUS[a.status]}</span>
          ${bt}</div>`;
      }).join('') : '<p class="vazio">Nenhum cliente neste dia.</p>'}</div>
      <p class="ajuda" style="margin-top:1rem">No perfil de barbeiro você vê só os seus clientes. A agenda dos colegas, o caixa e os telefones ficam com a recepção.</p>`;
    ligarDia(c); ligarAcoes(c);
  }

  function modalBloquear() {
    const d = dia(); const exp = PC.expedienteDe(d) || [540, 1200]; const ops = [];
    for (let x = exp[0]; x <= exp[1]; x += 15) ops.push(x);
    const m = modal(`<h2>Bloquear horário</h2><p class="sub">${PC.fmtData(d, true)}. Ninguém consegue marcar nesse intervalo.</p>
      <label class="campo"><span>Das</span><select id="b-ini">${ops.map((x) => `<option value="${x}" ${x === 720 ? 'selected' : ''}>${PC.hhmm(x)}</option>`).join('')}</select></label>
      <label class="campo"><span>Até</span><select id="b-fim">${ops.map((x) => `<option value="${x}" ${x === 780 ? 'selected' : ''}>${PC.hhmm(x)}</option>`).join('')}</select></label>
      <label class="campo"><span>Motivo</span><input id="b-mot" value="Almoço"></label>
      <button class="btn btn-azul" style="width:100%" id="b-ok">Bloquear</button>`);
    $('#b-ok', m).onclick = () => {
      const ini = Number($('#b-ini', m).value); const fim = Number($('#b-fim', m).value);
      if (fim <= ini) { alert('O fim tem que ser depois do início.'); return; }
      const choque = PC.doDia(d, (a) => a.barbeiro === sess.barbeiro && PC.ativo(a) && a.ini < fim && ini < a.ini + a.dur);
      if (choque.length) { alert(`Tem cliente nesse intervalo (${choque.map((a) => PC.hm(a.ini)).join(', ')}). Fale com a recepção para remarcar.`); return; }
      PC.db().bloqueios.push({ id: PC.id(), barbeiro: sess.barbeiro, data: d, ini, fim, motivo: $('#b-mot', m).value || 'Bloqueado' });
      fecharModal(); salvarRender('Horário bloqueado.');
    };
  }

  /* ================= VENDER (recepção) ================= */
  let venda = null;
  const novaVenda = () => ({ itens: {}, nome: '', tel: '', forma: 'Pix', cat: 'produtos' });

  function telaVender() {
    if (!venda) venda = novaVenda();
    const c = $('#conteudo'); const u = sess.unidade; const est = PC.db().estoque[u];
    const cli = venda.tel && PC.db().clientes.find((x) => x.tel === venda.tel.replace(/\D/g, ''));
    const desc = descontoProdutos(cli && cli.id);
    const linhas = Object.entries(venda.itens).filter(([, q]) => q > 0).map(([k, q]) => {
      const [tipo, id] = k.split(':'); const ref = tipo === 'produto' ? PC.produto(id) : PC.plano(id);
      const preco = tipo === 'produto' ? ref.preco * (1 - desc) : ref.preco;
      return { k, tipo, id, nome: ref.nome, q, preco };
    });
    const total = linhas.reduce((t, l) => t + l.preco * l.q, 0);
    const temPlano = linhas.some((l) => l.tipo === 'plano');
    const precisaCliente = temPlano && (venda.nome.trim().length < 2 || venda.tel.replace(/\D/g, '').length < 10);
    const vendasHoje = PC.db().vendas.filter((v) => v.data === PC.hoje() && v.unidade === u && v.tipo === 'balcao').sort((a, b) => b.hora - a.hora);

    c.innerHTML = `
      <div class="cab"><h1>Vender na recepção<small>${E(PC.unidade(u).nome)} · produtos e planos</small></h1></div>
      <div class="duas-col">
        <div class="card">
          <div class="chips" style="margin-bottom:1rem">
            <button class="chip" data-cat="produtos" aria-pressed="${venda.cat === 'produtos'}">Produtos</button>
            <button class="chip" data-cat="planos" aria-pressed="${venda.cat === 'planos'}">Planos</button>
          </div>
          <div class="catalogo">${venda.cat === 'produtos' ? PC.produtos.map((p) => `
            <button class="prod" data-add="produto:${p.id}" ${est[p.id] ? '' : 'disabled'}>
              <b>${E(p.nome)}</b><span class="p">${PC.reais(p.preco)}</span>
              <small class="${est[p.id] <= 2 ? 'baixo' : ''}">${est[p.id] ? est[p.id] + ' em estoque' : 'Sem estoque'}</small></button>`).join('')
            : PC.planos.map((p) => `
            <button class="prod plano" data-add="plano:${p.id}"><b>${E(p.nome)}</b><span class="p">${PC.reais(p.preco)}/mês</span><small>${E(p.desc)}</small></button>`).join('')}
          </div>
        </div>
        <div class="card carrinho">
          <h2>Venda</h2>
          <datalist id="dl-cli2">${PC.db().clientes.map((x) => `<option value="${E(x.nome)}">`).join('')}</datalist>
          <label class="campo"><span>Cliente ${temPlano ? '(obrigatório no plano)' : '(opcional)'}</span><input id="v-nome" list="dl-cli2" value="${E(venda.nome)}" placeholder="Nome ou deixe em branco"></label>
          <label class="campo"><span>WhatsApp</span><input id="v-tel" inputmode="tel" value="${E(venda.tel)}" placeholder="71 9 0000-0000"></label>
          ${desc ? '<p class="ajuda" style="margin:-.4rem 0 .6rem">Assinante Realeza: 10% de desconto nos produtos.</p>' : ''}
          ${linhas.length ? linhas.map((l) => `<div class="linha-it"><span>${E(l.nome)}${l.tipo === 'plano' ? ' <span class="tag ouro">plano</span>' : ''}</span>
              <span class="qtd"><button data-menos="${l.k}" aria-label="Menos">−</button>${l.q}<button data-mais="${l.k}" aria-label="Mais">+</button></span>
              <b style="min-width:84px;text-align:right">${PC.reais(l.preco * l.q)}</b></div>`).join('') : '<p class="vazio">Toque num produto ou plano para adicionar.</p>'}
          <div class="total"><span>Total</span><span>${PC.reais(total)}</span></div>
          <div class="formas">${FORMAS.map((f) => `<button class="chip" data-forma="${f}" aria-pressed="${venda.forma === f}">${f}</button>`).join('')}</div>
          <button class="btn btn-ouro" style="width:100%" id="v-ok" ${!linhas.length || precisaCliente ? 'disabled' : ''}>Registrar venda</button>
          ${precisaCliente ? '<p class="ajuda">Plano precisa de nome e WhatsApp do cliente.</p>' : ''}
        </div>
      </div>
      <div class="card" style="margin-top:1rem"><h2>Vendas de balcão hoje</h2>
        ${vendasHoje.length ? `<div class="tabela-wrap"><table><thead><tr><th>Hora</th><th>Itens</th><th>Cliente</th><th>Forma</th><th class="num">Valor</th></tr></thead><tbody>
        ${vendasHoje.map((v) => `<tr><td>${PC.hhmm(v.hora)}</td><td>${E(v.itens.map((i) => i.nome + (i.qtd > 1 ? ' ×' + i.qtd : '')).join(', '))}</td><td>${E((PC.cliente(v.cliente) || { nome: 'Avulso' }).nome)}</td><td>${E(v.forma)}</td><td class="num">${PC.reais(v.total)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="vazio">Nenhuma venda de balcão ainda.</p>'}</div>`;

    $$('[data-cat]', c).forEach((b) => b.onclick = () => { venda.cat = b.dataset.cat; telaVender(); });
    $$('[data-add]', c).forEach((b) => b.onclick = () => {
      const k = b.dataset.add; const [tipo, id] = k.split(':');
      if (tipo === 'produto' && (venda.itens[k] || 0) >= est[id]) { toast('Sem mais unidades em estoque.'); return; }
      venda.itens[k] = (venda.itens[k] || 0) + 1; telaVender();
    });
    $$('[data-mais]', c).forEach((b) => b.onclick = () => { const k = b.dataset.mais; const [t, id] = k.split(':'); if (t === 'produto' && venda.itens[k] >= est[id]) return; venda.itens[k]++; telaVender(); });
    $$('[data-menos]', c).forEach((b) => b.onclick = () => { venda.itens[b.dataset.menos]--; telaVender(); });
    $$('[data-forma]', c).forEach((b) => b.onclick = () => { venda.forma = b.dataset.forma; telaVender(); });
    $('#v-nome', c).onchange = (e) => { venda.nome = e.target.value; const x = PC.db().clientes.find((y) => y.nome === venda.nome); if (x) venda.tel = x.tel; telaVender(); };
    $('#v-tel', c).onchange = (e) => { venda.tel = e.target.value; telaVender(); };
    $('#v-ok', c).onclick = () => {
      let clienteId = null;
      if (venda.nome.trim().length >= 2) clienteId = PC.acharOuCriarCliente(venda.nome, venda.tel, 'Balcão').id;
      PC.lancarVenda({ unidade: u, tipo: 'balcao', cliente: clienteId, itens: linhas.map((l) => ({ tipo: l.tipo, id: l.id, nome: l.nome, qtd: l.q, preco: l.preco })), total, forma: venda.forma, vendedor: 'Recepção' });
      venda = novaVenda(); salvarRender(`Venda registrada: ${PC.reais(total)}${temPlano ? '. Plano ativado.' : '.'}`);
    };
  }

  /* ================= CLIENTES ================= */
  function telaClientes() {
    const c = $('#conteudo'); const filtro = sess.filtroCli || 'todos'; const busca = sess.buscaCli || '';
    c.innerHTML = `
      <div class="cab"><h1>Clientes<small>Base única das duas unidades · ${PC.db().clientes.length} clientes</small></h1>
        <div class="chips">${[['todos', 'Todos'], ['assinantes', 'Assinantes'], ['barbecode', 'Vieram do Barbecode']].map(([id, n]) => `<button class="chip" data-f="${id}" aria-pressed="${filtro === id}">${n}</button>`).join('')}</div></div>
      <label class="campo" style="max-width:420px"><span>Buscar</span><input id="busca" value="${E(busca)}" placeholder="Nome ou telefone"></label>
      <div class="card"><div class="tabela-wrap" id="tab-cli"></div></div>`;
    const desenhar = () => {
      const q = (sess.buscaCli || '').toLowerCase().trim(); const qd = q.replace(/\D/g, '');
      const pagos = PC.db().agendamentos.filter((a) => a.status === 'pago');
      const lista = PC.db().clientes.filter((x) => {
        if (filtro === 'assinantes' && !PC.assinaturaAtiva(x.id)) return false;
        if (filtro === 'barbecode' && x.origem !== 'Barbecode') return false;
        return !q || x.nome.toLowerCase().includes(q) || (qd && x.tel.includes(qd));
      }).sort((a, b) => a.nome.localeCompare(b.nome));
      $('#tab-cli', c).innerHTML = lista.length ? `<table><thead><tr><th>Nome</th><th>WhatsApp</th><th>Origem</th><th>Plano</th><th class="num">Visitas</th><th>Próximo horário</th><th></th></tr></thead><tbody>
        ${lista.map((x) => {
          const s = PC.assinaturaAtiva(x.id); const vis = pagos.filter((a) => a.cliente.id === x.id).length;
          const prox = PC.db().agendamentos.filter((a) => a.cliente.id === x.id && ['agendado', 'chegou'].includes(a.status) && a.data >= PC.hoje()).sort((a, b) => (a.data + a.ini).localeCompare(b.data + b.ini))[0];
          return `<tr><td><b>${E(x.nome)}</b></td><td><a href="${PC.zap(x.tel, `Oi, ${primeiro(x.nome)}! Aqui é do Palácio do Corte.`)}" target="_blank" rel="noopener">${E(x.tel || '—')}</a></td>
            <td><span class="tag ${x.origem === 'Barbecode' ? '' : 'verde'}">${E(x.origem)}</span></td>
            <td>${s ? `<span class="tag ouro">${E(PC.plano(s.plano).nome)}</span>` : '—'}</td><td class="num">${vis}</td>
            <td>${prox ? `${PC.fmtData(prox.data)} ${PC.hm(prox.ini)} · ${E(nomeB(prox.barbeiro))}` : '—'}</td>
            <td>${sess.perfil === 'recepcao' ? `<button class="btn btn-linha btn-peq" data-agendar="${x.id}">Agendar</button>` : ''}</td></tr>`;
        }).join('')}</tbody></table>` : '<p class="vazio">Nenhum cliente encontrado.</p>';
      $$('[data-agendar]', c).forEach((b) => b.onclick = () => {
        const x = PC.cliente(b.dataset.agendar); modalNovo(null);
        $('#n-nome').value = x.nome; $('#n-tel').value = x.tel;
      });
    };
    $$('[data-f]', c).forEach((b) => b.onclick = () => { sess.filtroCli = b.dataset.f; telaClientes(); });
    $('#busca', c).oninput = (e) => { sess.buscaCli = e.target.value; desenhar(); };
    desenhar();
  }

  /* ================= CAIXA ================= */
  function somaPorTipo(vendas) {
    const r = { servico: 0, produto: 0, plano: 0 };
    vendas.forEach((v) => v.itens.forEach((i) => { r[i.tipo] += i.preco * i.qtd; }));
    return r;
  }
  function telaCaixa() {
    const c = $('#conteudo'); const u = sess.perfil === 'gestor' ? (sess.unidVer || 'todas') : sess.unidade;
    const vendas = PC.db().vendas.filter((v) => v.data === PC.hoje() && (u === 'todas' || v.unidade === u)).sort((a, b) => b.hora - a.hora);
    const t = somaPorTipo(vendas); const total = vendas.reduce((s, v) => s + v.total, 0);
    const formas = {}; vendas.forEach((v) => { formas[v.forma] = (formas[v.forma] || 0) + v.total; });
    const maxF = Math.max(1, ...Object.values(formas));
    c.innerHTML = `
      <div class="cab"><h1>${sess.perfil === 'gestor' ? 'Caixa e vendas' : 'Caixa do dia'}<small>${PC.fmtData(PC.hoje(), true)} · ${u === 'todas' ? 'todas as unidades' : E(PC.unidade(u).nome)}</small></h1>
        ${sess.perfil === 'gestor' ? chipsUnidade('unidVer', true) : ''}</div>
      <div class="kpis">
        <div class="kpi"><span>Total do dia</span><b>${PC.reais(total)}</b><small>${vendas.length} lançamentos</small></div>
        <div class="kpi"><span>Serviços</span><b>${PC.reais(t.servico)}</b></div>
        <div class="kpi"><span>Produtos</span><b>${PC.reais(t.produto)}</b></div>
        <div class="kpi"><span>Planos vendidos</span><b>${PC.reais(t.plano)}</b></div>
      </div>
      <div class="duas-col">
        <div class="card"><h2>Lançamentos</h2>${vendas.length ? `<div class="tabela-wrap"><table><thead><tr><th>Hora</th><th>O quê</th><th>Barbeiro</th><th>Forma</th><th class="num">Valor</th></tr></thead><tbody>
          ${vendas.map((v) => `<tr><td>${PC.hhmm(v.hora)}</td><td>${E(v.itens.map((i) => i.nome + (i.qtd > 1 ? ' ×' + i.qtd : '')).join(', '))}${u === 'todas' ? ` <span class="tag">${E(PC.unidade(v.unidade).nome)}</span>` : ''}</td><td>${v.barbeiro ? E(nomeB(v.barbeiro)) : '<span class="tag">balcão</span>'}</td><td>${E(v.forma)}</td><td class="num">${PC.reais(v.total)}</td></tr>`).join('')}
          </tbody></table></div>` : '<p class="vazio">Nada lançado hoje.</p>'}</div>
        <div class="card"><h2>Por forma de pagamento</h2>
          ${Object.entries(formas).sort((a, b) => b[1] - a[1]).map(([f, v]) => `<div style="margin-bottom:.7rem"><div style="display:flex;justify-content:space-between;font-size:.9rem"><b>${E(f)}</b><span>${PC.reais(v)}</span></div><div class="barra-h"><i style="width:${v / maxF * 100}%"></i></div></div>`).join('') || '<p class="vazio">—</p>'}
          <p class="ajuda">"Plano" é atendimento de assinante: entra como R$ 0 porque o cliente já pagou o mês.</p>
        </div>
      </div>`;
    ligarChips(c);
  }

  /* ================= GESTÃO: VISÃO GERAL ================= */
  function telaGeral() {
    const c = $('#conteudo'); const u = sess.unidVer || 'todas'; const hoje = PC.hoje();
    const naU = (x) => u === 'todas' || x.unidade === u;
    const vendas = PC.db().vendas.filter((v) => v.data === hoje && naU(v));
    const ags = PC.doDia(hoje, naU);
    const pagos = ags.filter((a) => a.status === 'pago');
    const total = vendas.reduce((s, v) => s + v.total, 0);
    const fatServ = somaPorTipo(vendas).servico;
    const restantes = ags.filter((a) => ['agendado', 'chegou', 'atendimento', 'finalizado'].includes(a.status));
    const faltas = ags.filter((a) => a.status === 'faltou');
    const trocas = PC.db().trocas.filter((t) => t.data === hoje && naU(t));
    const assin = PC.db().assinaturas.filter((s) => s.vence >= hoje && naU(s));
    const mrr = assin.reduce((t, s) => t + PC.plano(s.plano).preco, 0);
    const com = PC.regras().comissao / 100;
    const porBarb = PC.barbeirosDa(u).map((b) => {
      const fat = vendas.filter((v) => v.barbeiro === b.id).reduce((s, v) => s + v.itens.filter((i) => i.tipo === 'servico').reduce((x, i) => x + i.preco, 0), 0);
      return { b, at: pagos.filter((a) => a.barbeiro === b.id).length, fat, resta: restantes.filter((a) => a.barbeiro === b.id).length };
    }).sort((x, y) => y.fat - x.fat);
    const maxB = Math.max(1, ...porBarb.map((x) => x.fat));
    const porUnid = PC.unidades.map((un) => ({ un, v: PC.db().vendas.filter((v) => v.data === hoje && v.unidade === un.id).reduce((s, v) => s + v.total, 0) }));
    const maxU = Math.max(1, ...porUnid.map((x) => x.v));
    const baixo = [];
    PC.unidades.forEach((un) => PC.produtos.forEach((p) => { const q = PC.db().estoque[un.id][p.id]; if (q <= 2 && naU({ unidade: un.id })) baixo.push({ un, p, q }); }));

    c.innerHTML = `
      <div class="cab"><h1>Visão geral<small>${PC.fmtData(hoje, true)} · até ${PC.hm(PC.agora())}</small></h1>${chipsUnidade('unidVer', true)}</div>
      <div class="kpis">
        <div class="kpi"><span>Faturamento hoje</span><b>${PC.reais(total)}</b><small>serviços, produtos e planos</small></div>
        <div class="kpi"><span>Atendimentos feitos</span><b>${pagos.length}</b><small>${restantes.length} ainda na agenda</small></div>
        <div class="kpi"><span>Ticket médio</span><b>${PC.reais(pagos.length ? fatServ / pagos.length : 0)}</b><small>por atendimento</small></div>
        <div class="kpi"><span>Faltas</span><b>${faltas.length}</b><small>clientes que não vieram</small></div>
        <div class="kpi"><span>Trocas por atraso</span><b>${trocas.length}</b><small>clientes salvos pelo encaixe</small></div>
        <div class="kpi"><span>Assinantes ativos</span><b>${assin.length}</b><small>${PC.reais(mrr)}/mês garantidos</small></div>
      </div>
      <div class="duas-col">
        <div class="card"><h2>Por barbeiro · hoje</h2><div class="tabela-wrap"><table><thead><tr><th>Barbeiro</th>${u === 'todas' ? '<th>Unidade</th>' : ''}<th class="num">Atendidos</th><th class="num">Faturado</th><th class="num">Comissão (${PC.regras().comissao}%)</th><th class="num">Na agenda</th><th style="width:22%"></th></tr></thead><tbody>
          ${porBarb.map((x) => `<tr><td><b>${E(x.b.nome)}</b></td>${u === 'todas' ? `<td>${E(PC.unidade(x.b.unidade).nome)}</td>` : ''}<td class="num">${x.at}</td><td class="num">${PC.reais(x.fat)}</td><td class="num">${PC.reais(x.fat * com)}</td><td class="num">${x.resta}</td><td><div class="barra-h"><i style="width:${x.fat / maxB * 100}%"></i></div></td></tr>`).join('')}
          </tbody></table></div></div>
        <div style="display:grid;gap:1rem;align-content:start">
          ${u === 'todas' ? `<div class="card"><h2>Unidades lado a lado</h2>${porUnid.map((x) => `<div style="margin-bottom:.7rem"><div style="display:flex;justify-content:space-between;font-size:.9rem"><b>${E(x.un.nome)}</b><span>${PC.reais(x.v)}</span></div><div class="barra-h"><i style="width:${x.v / maxU * 100}%"></i></div></div>`).join('')}</div>` : ''}
          <div class="card"><h2>Trocas por atraso hoje</h2>${trocas.length ? `<ul style="list-style:none;display:grid;gap:.4rem;font-size:.9rem">${trocas.map((t) => `<li>${PC.hm(t.hora)} · <b>${E(t.cliente)}</b> chegou ${t.atraso} min atrasado · ${E(nomeB(t.de))} → ${E(nomeB(t.para))}</li>`).join('')}</ul>` : '<p class="ajuda">Nenhuma ainda.</p>'}</div>
          <div class="card"><h2>Estoque baixo</h2>${baixo.length ? `<ul style="list-style:none;display:grid;gap:.4rem;font-size:.9rem">${baixo.map((x) => `<li><span class="tag verm">${x.q} un.</span> ${E(x.p.nome)} · ${E(x.un.nome)}</li>`).join('')}</ul>` : '<p class="ajuda">Tudo em ordem.</p>'}</div>
        </div>
      </div>`;
    ligarChips(c);
  }

  /* ================= GESTÃO: IMPORTAR ================= */
  const EXEMPLO_CSV = `Nome;Celular;E-mail;Plano
Rafael Menezes;(71) 99812-3344;rafa@email.com;Corte + Barba
Jorge Luiz Santos;71 98877-1020;;
Kelvin Araújo;(71) 99145-7788;kelvin@email.com;
Marcos Vinícius;${PC.db().clientes.find((x) => x.nome === 'Marcos Vinícius').tel};;
Bruno Teixeira;;bruno@email.com;
Matheus Oliveira;71991230099;;Corte`;

  function lerCSV(txt) {
    const linhas = txt.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (linhas.length < 2) return null;
    const sep = (linhas[0].match(/;/g) || []).length >= (linhas[0].match(/,/g) || []).length ? ';' : ',';
    const cab = linhas[0].split(sep).map((h) => h.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
    const col = (re) => cab.findIndex((h) => re.test(h));
    const iN = col(/^(nome|cliente)/); const iT = col(/(tel|cel|whats|fone)/); const iE = col(/mail/); const iP = col(/plano/);
    if (iN < 0) return { erro: 'Não achei a coluna de nome. A primeira linha precisa ter os títulos (ex.: Nome;Celular).' };
    const db = PC.db();
    const rows = linhas.slice(1).map((l) => {
      const c = l.split(sep); const tel = iT >= 0 ? (c[iT] || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '') : '';
      const nome = (c[iN] || '').trim();
      let sit = 'novo';
      if (!nome) sit = 'vazio'; else if (!tel) sit = 'semtel'; else if (db.clientes.some((x) => x.tel === tel)) sit = 'existe';
      return { nome, tel, email: iE >= 0 ? (c[iE] || '').trim() : '', plano: iP >= 0 ? (c[iP] || '').trim() : '', sit };
    }).filter((r) => r.sit !== 'vazio');
    return { rows, colunas: { nome: cab[iN], telefone: iT >= 0 ? cab[iT] : '—', email: iE >= 0 ? cab[iE] : '—', plano: iP >= 0 ? cab[iP] : '—' } };
  }

  function telaImportar() {
    const c = $('#conteudo');
    c.innerHTML = `
      <div class="cab"><h1>Importar clientes do Barbecode<small>Traz a base atual para o sistema novo, sem perder ninguém</small></h1></div>
      <div class="duas-col">
        <div class="card">
          <h2>1. Envie a planilha</h2>
          <p class="ajuda" style="margin-bottom:.8rem">Exporte a lista de clientes do Barbecode (ou de qualquer sistema) em planilha. Basta ter as colunas de nome e telefone. E-mail e plano são opcionais.</p>
          <label class="campo"><span>Arquivo .csv</span><input type="file" id="arq" accept=".csv,.txt,text/csv"></label>
          <label class="campo"><span>Ou cole aqui</span><textarea id="txt" placeholder="Nome;Celular;E-mail"></textarea></label>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn btn-azul" id="ler">Conferir</button><button class="btn btn-linha" id="ex">Usar planilha de exemplo</button></div>
        </div>
        <div class="card"><h2>2. Confira antes de importar</h2><div id="previa"><p class="ajuda">A prévia aparece aqui. Nada entra na base antes de você confirmar.</p></div></div>
      </div>`;
    const mostrar = () => {
      const r = lerCSV($('#txt', c).value); const p = $('#previa', c);
      if (!r) { p.innerHTML = '<p class="vazio">Planilha vazia.</p>'; return; }
      if (r.erro) { p.innerHTML = `<p class="vazio">${E(r.erro)}</p>`; return; }
      const novos = r.rows.filter((x) => x.sit === 'novo');
      const rot = { novo: '<span class="tag verde">entra</span>', existe: '<span class="tag">já existe</span>', semtel: '<span class="tag verm">sem telefone</span>' };
      p.innerHTML = `
        <p class="ajuda" style="margin-bottom:.6rem">Colunas reconhecidas: nome = <b>${E(r.colunas.nome)}</b>, telefone = <b>${E(r.colunas.telefone)}</b>, e-mail = <b>${E(r.colunas.email)}</b>, plano = <b>${E(r.colunas.plano)}</b></p>
        <div class="kpis"><div class="kpi"><span>Novos</span><b>${novos.length}</b></div><div class="kpi"><span>Já na base</span><b>${r.rows.filter((x) => x.sit === 'existe').length}</b><small>não duplica</small></div><div class="kpi"><span>Sem telefone</span><b>${r.rows.filter((x) => x.sit === 'semtel').length}</b><small>ficam de fora</small></div></div>
        <div class="tabela-wrap"><table><thead><tr><th>Nome</th><th>Telefone</th><th>Plano</th><th></th></tr></thead><tbody>
        ${r.rows.slice(0, 12).map((x) => `<tr><td>${E(x.nome)}</td><td>${E(x.tel || '—')}</td><td>${E(x.plano || '—')}</td><td>${rot[x.sit]}</td></tr>`).join('')}</tbody></table></div>
        ${r.rows.length > 12 ? `<p class="ajuda">… e mais ${r.rows.length - 12} linhas.</p>` : ''}
        <button class="btn btn-ouro" style="width:100%;margin-top:1rem" id="imp" ${novos.length ? '' : 'disabled'}>Importar ${novos.length} clientes</button>
        <p class="ajuda">Planos ativos do Barbecode são conferidos com a recepção antes de virar assinatura no sistema novo.</p>`;
      const b = $('#imp', p); if (b) b.onclick = () => {
        novos.forEach((x) => PC.db().clientes.push({ id: PC.id(), nome: x.nome, tel: x.tel, email: x.email, origem: 'Barbecode', desde: PC.hoje() }));
        PC.salvar(); toast(`${novos.length} clientes importados.`); $('#txt', c).value = ''; p.innerHTML = `<p class="vazio">Pronto: ${novos.length} clientes entraram na base. Veja em Clientes → Vieram do Barbecode.</p>`;
      };
    };
    $('#ex', c).onclick = () => { $('#txt', c).value = EXEMPLO_CSV; mostrar(); };
    $('#ler', c).onclick = mostrar;
    $('#arq', c).onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { $('#txt', c).value = rd.result; mostrar(); }; rd.readAsText(f); };
  }

  /* ================= GESTÃO: REGRAS ================= */
  function telaRegras() {
    const c = $('#conteudo'); const r = PC.regras();
    c.innerHTML = `
      <div class="cab"><h1>Regras e acessos</h1></div>
      <div class="duas-col">
        <div style="display:grid;gap:1rem;align-content:start">
          <div class="card"><h2>Cliente atrasado</h2>
            <div class="campo"><span>Tolerância antes de liberar o barbeiro</span><div class="chips">${[5, 10, 15, 20].map((n) => `<button class="chip" data-tol="${n}" aria-pressed="${r.tolerancia === n}">${n} min</button>`).join('')}</div></div>
            <div class="campo"><span>Quando passa da tolerância e o barbeiro não tem mais tempo</span>
              <div class="escolhas">
                <button class="escolha ${r.modoTroca === 'sugerir' ? 'rec' : ''}" data-modo="sugerir"><span class="av">1</span><span><b>Sugerir e a recepção confirma</b><small>O sistema mostra quem está livre e a recepção troca com um toque.</small></span></button>
                <button class="escolha ${r.modoTroca === 'automatico' ? 'rec' : ''}" data-modo="automatico"><span class="av">2</span><span><b>Trocar sozinho</b><small>Ao marcar a chegada, o sistema já passa para o barbeiro livre com menos clientes.</small></span></button>
              </div></div>
          </div>
          <div class="card"><h2>Agenda e comissão</h2>
            <label class="campo"><span>Comissão do barbeiro sobre o serviço (%)</span><input type="number" id="r-com" min="0" max="100" value="${r.comissao}"></label>
            <label class="campo"><span>Dias abertos para agendar no site</span><input type="number" id="r-jan" min="1" max="60" value="${r.janelaDias}"></label>
          </div>
          <button class="btn btn-verm" id="reset">Recomeçar a demonstração do zero</button>
        </div>
        <div class="card"><h2>Quem vê o quê</h2><div class="tabela-wrap"><table><thead><tr><th></th><th>Barbeiro</th><th>Recepção</th><th>Gestão</th></tr></thead><tbody>
          ${[['Própria agenda', 1, 1, 1], ['Agenda dos colegas', 0, 'da unidade', 'todas'], ['Telefone do cliente', 0, 1, 1], ['Marcar, encaixar e remarcar', 0, 1, 1], ['Troca por atraso', 0, 1, 1], ['Vender produto e plano', 0, 1, 1], ['Caixa do dia', 0, 'da unidade', 'todas'], ['Comissão', 'a própria', 0, 'de todos'], ['Bloquear horário', 1, 1, 1], ['Importar clientes', 0, 0, 1], ['Mudar regras', 0, 0, 1]]
            .map(([n, ...v]) => `<tr><td><b>${n}</b></td>${v.map((x) => `<td>${x === 1 ? '<span class="tag verde">sim</span>' : x === 0 ? '<span class="tag">não</span>' : E(x)}</td>`).join('')}</tr>`).join('')}
          </tbody></table></div></div>
      </div>`;
    $$('[data-tol]', c).forEach((b) => b.onclick = () => { r.tolerancia = Number(b.dataset.tol); salvarRender('Tolerância salva.'); });
    $$('[data-modo]', c).forEach((b) => b.onclick = () => { r.modoTroca = b.dataset.modo; salvarRender(r.modoTroca === 'automatico' ? 'Troca automática ligada.' : 'A recepção confirma as trocas.'); });
    $('#r-com', c).onchange = (e) => { r.comissao = Math.min(100, Math.max(0, Number(e.target.value) || 0)); salvarRender('Comissão salva.'); };
    $('#r-jan', c).onchange = (e) => { r.janelaDias = Math.min(60, Math.max(1, Number(e.target.value) || 15)); salvarRender('Salvo.'); };
    $('#reset', c).onclick = () => { if (confirm('Apagar tudo o que foi feito na demonstração e voltar aos dados de exemplo?')) { PC.recomecar(); venda = null; render(); toast('Demonstração recomeçada.'); } };
  }

  const TELAS = { agenda: telaAgenda, minha: telaMinha, vender: telaVender, clientes: telaClientes, caixa: telaCaixa, geral: telaGeral, importar: telaImportar, regras: telaRegras };

  // horário marcado no site (outra aba) aparece aqui na hora
  window.addEventListener('storage', () => { if (!$('#veu') && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) render(); });
  setInterval(() => { if (PC.db().relogio.modo !== 'demo' && !$('#veu')) render(); }, 60000);

  render();
})();
