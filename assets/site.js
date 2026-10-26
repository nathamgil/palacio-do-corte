/* Palácio do Corte — site público: vitrine + agendamento em 5 passos. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const E = PC.esc;
  const ini = (n) => n.trim().charAt(0).toUpperCase();

  // ---------- vitrine ----------
  $('#n-barbeiros').textContent = PC.barbeiros.length;
  $('#zap').href = PC.zap(PC.whatsapp, 'Olá! Vim pelo site do Palácio do Corte.');

  $('#lista-unidades').innerHTML = PC.unidades.map((u) => `
    <article class="unid">
      <span class="tag">${E(u.selo)}</span>
      <h3>${E(u.nome)}</h3>
      <p>${E(u.endereco)}<br>${E(u.cidade)}</p>
      <div class="equipe-mini">${PC.barbeirosDa(u.id).map((b) => `<span class="chip-nome"><span class="avatar">${ini(b.nome)}</span>${E(b.nome)}</span>`).join('')}</div>
      <div class="acoes">
        <a class="btn btn-ouro" href="#agendar" data-unid="${u.id}">Agendar aqui</a>
        <a class="btn btn-linha" href="${u.mapa}" target="_blank" rel="noopener">Como chegar</a>
      </div>
    </article>`).join('');
  document.querySelectorAll('[data-unid]').forEach((a) => a.addEventListener('click', () => { estado = novoEstado(); estado.unidade = a.dataset.unid; estado.passo = 1; render(); }));

  $('#lista-servicos').innerHTML = PC.servicos.map((s) => `
    <div class="serv"><span><b>${E(s.nome)}</b><small>${s.dur} min</small></span><b class="preco">${PC.reais(s.preco)}</b></div>`).join('');

  $('#lista-planos').innerHTML = PC.planos.map((p) => `
    <article class="plano ${p.destaque ? 'destaque' : ''}">
      ${p.destaque ? '<span class="selo" style="margin:0;align-self:flex-start">Mais completo</span>' : ''}
      <h3>${E(p.nome)}</h3>
      <div class="preco">${PC.reais(p.preco).replace(',00', '')}<small>/mês</small></div>
      <p>${E(p.desc)}</p>
      <a class="btn ${p.destaque ? 'btn-ouro' : 'btn-linha'}" target="_blank" rel="noopener" href="${PC.zap(PC.whatsapp, 'Quero assinar o ' + p.nome + '.')}">Quero assinar</a>
    </article>`).join('');

  // ---------- agendamento ----------
  const PASSOS = ['Unidade', 'Barbeiro', 'Serviços', 'Dia e hora', 'Seus dados'];
  const novoEstado = () => ({ passo: 0, unidade: null, barbeiro: null, servicos: [], data: null, ini: null, nome: '', tel: '', feito: null });
  let estado = novoEstado();
  const dur = () => PC.durDe(estado.servicos);

  function horarios(data) {
    if (estado.barbeiro !== 'qualquer') return PC.horariosLivres(estado.barbeiro, data, dur());
    const set = new Set();
    PC.barbeirosDa(estado.unidade).forEach((b) => PC.horariosLivres(b.id, data, dur()).forEach((m) => set.add(m)));
    return [...set].sort((a, b) => a - b);
  }

  function podeAvancar() {
    switch (estado.passo) {
      case 0: return !!estado.unidade;
      case 1: return !!estado.barbeiro;
      case 2: return estado.servicos.length > 0;
      case 3: return estado.data && estado.ini != null;
      case 4: return estado.nome.trim().length >= 2 && estado.tel.replace(/\D/g, '').length >= 10;
    }
  }

  function render() {
    $('#passos').innerHTML = estado.feito ? '' : PASSOS.map((p, i) =>
      `<div class="passo ${i < estado.passo ? 'feito' : i === estado.passo ? 'atual' : ''}">${i + 1} · ${p}</div>`).join('');
    const et = $('#etapa'); const nav = $('#navega');

    if (estado.feito) {
      const a = estado.feito; const b = PC.barbeiro(a.barbeiro); const u = PC.unidade(a.unidade);
      et.innerHTML = `
        <div style="text-align:center">
          <div class="ok-check"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></div>
          <h3>Horário confirmado, ${E(a.cliente.nome.split(' ')[0])}!</h3>
          <p class="sub" style="margin:0 auto 1.2rem">A recepção já está vendo seu horário. Chegue 5 minutos antes.</p>
        </div>
        ${resumoHTML(a.unidade, a.barbeiro, a.servicos, a.data, a.ini)}
        <p class="nota">Se atrasar mais de ${PC.regras().tolerancia} minutos e o ${E(b.nome)} já estiver com o próximo cliente, a recepção encaixa você com outro barbeiro livre da ${E(u.nome)}.</p>`;
      nav.innerHTML = `<button class="btn btn-linha" id="de-novo">Marcar outro</button>
        <a class="btn btn-zap" target="_blank" rel="noopener" href="${PC.zap(PC.whatsapp, `Olá! Acabei de agendar pelo site: ${PC.nomeServicos(a.servicos)} com ${b.nome}, ${PC.fmtData(a.data, true)} às ${PC.hm(a.ini)} (${u.nome}).`)}">Avisar no WhatsApp</a>`;
      $('#de-novo').onclick = () => { estado = novoEstado(); render(); };
      return;
    }

    if (estado.passo === 0) {
      et.innerHTML = `<h3>Em qual unidade?</h3><div class="opcoes">${PC.unidades.map((u) => `
        <button class="op" data-v="${u.id}" aria-pressed="${estado.unidade === u.id}"><span><b>${E(u.nome)}</b><small>${E(u.endereco)}</small></span></button>`).join('')}</div>`;
      et.querySelectorAll('.op').forEach((b) => b.onclick = () => {
        if (estado.unidade !== b.dataset.v) { estado.barbeiro = null; estado.data = null; estado.ini = null; }
        estado.unidade = b.dataset.v; estado.passo = 1; render();
      });
    }

    if (estado.passo === 1) {
      et.innerHTML = `<h3>Com quem você quer cortar?</h3><div class="opcoes">
        <button class="op" data-v="qualquer" aria-pressed="${estado.barbeiro === 'qualquer'}"><span class="avatar">👑</span><span><b>Sem preferência</b><small>O primeiro livre no horário</small></span></button>
        ${PC.barbeirosDa(estado.unidade).map((b) => `
        <button class="op" data-v="${b.id}" aria-pressed="${estado.barbeiro === b.id}"><span class="avatar">${ini(b.nome)}</span><span><b>${E(b.nome)}</b><small>${E(b.espec)}</small></span></button>`).join('')}</div>`;
      et.querySelectorAll('.op').forEach((b) => b.onclick = () => { estado.barbeiro = b.dataset.v; estado.ini = null; estado.passo = 2; render(); });
    }

    if (estado.passo === 2) {
      et.innerHTML = `<h3>Quais serviços? <small style="font-weight:500;color:var(--cinza2)">(pode marcar mais de um)</small></h3><div class="opcoes">${PC.servicos.map((s) => `
        <button class="op" data-v="${s.id}" aria-pressed="${estado.servicos.includes(s.id)}"><span><b>${E(s.nome)}</b><small>${s.dur} min</small></span><span class="preco">${PC.reais(s.preco)}</span></button>`).join('')}</div>
        <p class="nota" id="soma"></p>`;
      const soma = () => { $('#soma').textContent = estado.servicos.length ? `Total: ${PC.reais(PC.precoDe(estado.servicos))} · ${dur()} min` : ''; };
      et.querySelectorAll('.op').forEach((b) => b.onclick = () => {
        const v = b.dataset.v; const i = estado.servicos.indexOf(v);
        i >= 0 ? estado.servicos.splice(i, 1) : estado.servicos.push(v);
        b.setAttribute('aria-pressed', i < 0); estado.ini = null; soma(); navRender();
      });
      soma();
    }

    if (estado.passo === 3) {
      const dias = [];
      for (let d = 0; d < PC.regras().janelaDias; d++) dias.push(PC.somaDias(PC.hoje(), d));
      if (!estado.data) estado.data = dias.find((d) => horarios(d).length) || dias[0];
      const hs = horarios(estado.data);
      et.innerHTML = `<h3>Escolha o dia e a hora</h3>
        <div class="dias">${dias.map((d) => {
          const fechado = !PC.expedienteDe(d); const dt = new Date(d + 'T12:00:00');
          return `<button class="dia" data-v="${d}" aria-pressed="${d === estado.data}" ${fechado ? 'disabled' : ''}>
            <small>${d === PC.hoje() ? 'hoje' : dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><b>${dt.getDate()}</b></button>`;
        }).join('')}</div>
        ${hs.length ? `<div class="horas">${hs.map((m) => `<button class="hora" data-v="${m}" aria-pressed="${m === estado.ini}">${PC.hhmm(m)}</button>`).join('')}</div>`
          : `<p class="vazio" style="margin-top:1rem">Sem horário livre nesse dia. Tente outro dia${estado.barbeiro !== 'qualquer' ? ' ou escolha “sem preferência”' : ''}.</p>`}`;
      et.querySelectorAll('.dia').forEach((b) => b.onclick = () => { estado.data = b.dataset.v; estado.ini = null; render(); });
      et.querySelectorAll('.hora').forEach((b) => b.onclick = () => {
        estado.ini = Number(b.dataset.v); et.querySelectorAll('.hora').forEach((x) => x.setAttribute('aria-pressed', x === b)); navRender();
      });
    }

    if (estado.passo === 4) {
      et.innerHTML = `<h3>Seus dados</h3>
        ${resumoHTML(estado.unidade, estado.barbeiro, estado.servicos, estado.data, estado.ini)}
        <label class="campo"><span>Nome</span><input id="f-nome" autocomplete="name" value="${E(estado.nome)}" placeholder="Como te chamamos?"></label>
        <label class="campo"><span>WhatsApp</span><input id="f-tel" inputmode="tel" autocomplete="tel" value="${E(estado.tel)}" placeholder="(71) 9 0000-0000"></label>
        <p class="nota" id="aviso-plano"></p>`;
      const chk = () => {
        estado.nome = $('#f-nome').value; estado.tel = $('#f-tel').value;
        const c = PC.db().clientes.find((x) => x.tel && x.tel === estado.tel.replace(/\D/g, ''));
        const s = c && PC.assinaturaAtiva(c.id);
        $('#aviso-plano').textContent = c ? (s ? `Bem-vindo de volta! Seu ${PC.plano(s.plano).nome} está ativo.` : `Bem-vindo de volta, ${c.nome.split(' ')[0]}!`) : '';
        navRender();
      };
      $('#f-nome').oninput = chk; $('#f-tel').oninput = chk; chk();
    }
    navRender();
  }

  function resumoHTML(u, b, servs, data, m) {
    const nomeB = b === 'qualquer' ? 'Sem preferência' : PC.barbeiro(b).nome;
    return `<div class="resumo">
      <div><span>Unidade</span><b>${E(PC.unidade(u).nome)}</b></div>
      <div><span>Barbeiro</span><b>${E(nomeB)}</b></div>
      <div><span>Serviços</span><b>${E(PC.nomeServicos(servs))}</b></div>
      <div><span>Quando</span><b>${PC.fmtData(data, true)}, ${PC.hm(m)}</b></div>
      <div><span>Total</span><b>${PC.reais(PC.precoDe(servs))}</b></div></div>`;
  }

  function navRender() {
    if (estado.feito) return;
    const nav = $('#navega');
    nav.innerHTML = `${estado.passo > 0 ? '<button class="btn btn-linha" id="voltar">Voltar</button>' : '<span></span>'}
      ${estado.passo >= 2 ? `<button class="btn btn-ouro" id="seguir" ${podeAvancar() ? '' : 'disabled'}>${estado.passo === 4 ? 'Confirmar horário' : 'Continuar'}</button>` : ''}`;
    const v = $('#voltar'); if (v) v.onclick = () => { estado.passo--; render(); };
    const s = $('#seguir'); if (s) s.onclick = () => { if (!podeAvancar()) return; estado.passo === 4 ? confirmar() : (estado.passo++, render()); };
  }

  function confirmar() {
    let barbeiro = estado.barbeiro;
    if (barbeiro === 'qualquer') barbeiro = (PC.semPreferencia(estado.unidade, estado.data, estado.ini, dur()) || {}).id;
    if (!barbeiro || !PC.livre(barbeiro, estado.data, estado.ini, dur())) { alert('Esse horário acabou de ser ocupado. Escolha outro.'); estado.passo = 3; estado.ini = null; render(); return; }
    const c = PC.acharOuCriarCliente(estado.nome, estado.tel, 'Site');
    const a = {
      id: PC.id(), unidade: estado.unidade, barbeiro, data: estado.data, ini: estado.ini, servicos: estado.servicos.slice(), dur: dur(), total: PC.precoDe(estado.servicos),
      cliente: { id: c.id, nome: c.nome, tel: c.tel }, status: 'agendado', origem: 'Site', historico: []
    };
    PC.registrar(a, 'Agendado pelo site' + (estado.barbeiro === 'qualquer' ? ' (sem preferência)' : ''));
    PC.db().agendamentos.push(a); PC.salvar();
    estado.feito = a; render();
    $('#agendar').scrollIntoView({ behavior: 'smooth' });
  }

  render();

  // ---------- instalar como app (PWA) ----------
  let pedido = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedido = e; });
  $('#instalar').onclick = async () => {
    if (pedido) { pedido.prompt(); pedido = null; return; }
    alert(/iphone|ipad/i.test(navigator.userAgent)
      ? 'No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
      : 'No Android: abra o menu ⋮ do navegador e toque em “Instalar app” ou “Adicionar à tela inicial”.');
  };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
