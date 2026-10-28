/* =====================================================================
   Palácio do Corte — app de agendamento (MODO DEMONSTRAÇÃO)
   Marca, remarca e desmarca. Lê e grava no mesmo "banco" do painel,
   então o que o cliente faz aqui aparece na recepção na hora.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const E = PC.esc;
  const app = $('#app'), tela = $('#tela'), acao = $('#acao');
  const FOTO_UNID = { cb: 'fotos/site/039.webp', cs: 'fotos/site/099.webp' };
  const FOTO_BARB = { dany: 'fotos/site/002.webp' };
  const primeiro = (n) => String(n || '').trim().split(' ')[0];

  /* ---------------- quem é o cliente (fica no aparelho) ---------------- */
  const CK = 'pc_cliente';
  let eu = (() => { try { return JSON.parse(localStorage.getItem(CK) || 'null'); } catch (e) { return null; } })();
  const lembrar = (nome, tel) => { eu = { nome, tel: tel.replace(/\D/g, '') }; try { localStorage.setItem(CK, JSON.stringify(eu)); } catch (e) { /* ok */ } };
  const esquecer = () => { eu = null; try { localStorage.removeItem(CK); } catch (e) { /* ok */ } };
  const clienteEu = () => eu && PC.db().clientes.find((c) => c.tel === eu.tel);
  const fmtTel = (v) => { const d = String(v).replace(/\D/g, '').slice(0, 11); if (d.length <= 2) return d; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`; };

  function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3400); }

  /* ---------------- datas ---------------- */
  function quandoCurto(data, ini) {
    const d = (new Date(data + 'T12:00:00') - new Date(PC.hoje() + 'T12:00:00')) / 864e5;
    const dia = d === 0 ? 'Hoje' : d === 1 ? 'Amanhã' : new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' }).replace('.', '');
    return `${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${PC.hm(ini)}`;
  }
  const passou = (a) => a.data < PC.hoje() || (a.data === PC.hoje() && a.ini + a.dur < PC.agoraReal());

  /* ---------------- folhas (bottom sheet) ---------------- */
  function folha(html, montar) {
    fecharFolha();
    const v = document.createElement('div'); v.className = 'veu'; v.id = 'veu';
    v.innerHTML = `<div class="folha" role="dialog" aria-modal="true"><div class="pega"></div>${html}</div>`;
    $('#folhas').appendChild(v); document.body.classList.add('com-folha');
    v.addEventListener('click', (e) => { if (e.target === v || e.target.closest('[data-fechar]')) fecharFolha(); });
    if (montar) montar($('.folha', v));
    return v;
  }
  function fecharFolha() { const v = $('#veu'); if (v) v.remove(); clearTimeout(folha.t); document.body.classList.remove('com-folha'); }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharFolha(); });

  /* ---------------- QR e Pix ---------------- */
  function qrSvg(txt, cel) {
    if (typeof qrcode !== 'function') return '<div style="width:190px;height:190px;display:grid;place-items:center;background:#eee;border-radius:8px">QR</div>';
    const q = qrcode(0, 'M'); q.addData(txt); q.make(); return q.createSvgTag(cel || 4, 0);
  }
  function crc16(s) { let c = 0xFFFF; for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1; } return (c & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'); }
  function pixCopiaCola(valor, txid) {
    const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
    const conta = f('00', 'br.gov.bcb.pix') + f('01', 'pix@palaciodocorte.exemplo');
    let p = f('00', '01') + f('26', conta) + f('52', '0000') + f('53', '986') + f('54', valor.toFixed(2)) + f('58', 'BR') + f('59', 'PALACIO DO CORTE') + f('60', 'SALVADOR') + f('62', f('05', txid)) + '6304';
    return p + crc16(p);
  }
  // Na versão real: cobrança criada no Mercado Pago/Asaas e confirmada por webhook.
  function folhaPix(valor, titulo, aoPagar) {
    const codigo = pixCopiaCola(valor, 'PC' + PC.id().toUpperCase());
    folha(`<h3>${E(titulo)}</h3><p>Abra o app do seu banco, escolha Pix e leia o QR ou cole o código.</p>
      <div class="pix-qr">${qrSvg(codigo, 4)}<small>${PC.reais(valor)} · Palácio do Corte</small></div>
      <div class="copia"><code>${E(codigo)}</code><button id="copiar">Copiar</button></div>
      <div id="st"><div class="esperando"><i></i>Esperando o pagamento…</div></div>
      <button class="btn btn-linha btn-cheio" data-fechar>Cancelar</button>
      <p class="demo">Na demonstração o pagamento é confirmado sozinho em alguns segundos.</p>`, (f) => {
      $('#copiar', f).onclick = () => { try { navigator.clipboard.writeText(codigo); } catch (e) { /* ok */ } $('#copiar', f).textContent = 'Copiado'; };
      folha.t = setTimeout(() => {
        $('#st', f).innerHTML = '<div class="recebido">✓ Pix recebido. Obrigado!</div>';
        folha.t = setTimeout(() => { fecharFolha(); aoPagar(); }, 1100);
      }, 3600);
    });
  }

  /* ---------------- instalar na tela inicial ---------------- */
  let pedido = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedido = e; });
  const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ehCelular = () => /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent) || ehIOS();
  const IC_SHARE = '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  const IC_ADD = '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg>';
  const IC_MENU = '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/></svg>';
  function folhaInstalar(depoisDeMarcar) {
    if (instalado()) return;
    const titulo = depoisDeMarcar ? 'Próximo corte em 2 toques' : 'Coloque o Palácio na sua tela inicial';
    const texto = 'Vira um ícone no celular, igual a um aplicativo. Abre direto no agendamento, não ocupa espaço e não precisa de loja.';
    let corpo;
    if (pedido) corpo = `<button class="btn btn-royal btn-cheio" id="inst">Adicionar à tela inicial</button>`;
    else if (ehIOS()) corpo = `<ol class="passos-ios"><li>${IC_SHARE}<span>Toque em <b>Compartilhar</b> na barra do Safari</span></li><li>${IC_ADD}<span>Escolha <b>Adicionar à Tela de Início</b></span></li><li><span>Toque em <b>Adicionar</b></span></li></ol>`;
    else if (ehCelular()) corpo = `<ol class="passos-ios"><li>${IC_MENU}<span>Toque no menu <b>⋮</b> do navegador</span></li><li>${IC_ADD}<span>Escolha <b>Adicionar à tela inicial</b> ou <b>Instalar app</b></span></li><li><span>Confirme em <b>Adicionar</b></span></li></ol>`;
    else corpo = `<div style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem"><div class="pix-qr" style="margin:0;padding:.6rem">${qrSvg(location.href.split('#')[0], 3)}</div><p style="margin:0">Aponte a câmera do celular para o código. O site abre lá e já pergunta se quer colocar na tela inicial.</p></div>`;
    folha(`<div class="instala"><div class="icone-app"><img src="fotos/escudo.png" alt=""></div><div><h3>${titulo}</h3></div></div>
      <p>${texto}</p>${corpo}<button class="btn btn-linha btn-cheio" style="margin-top:.6rem" data-fechar>Agora não</button>`, (f) => {
      const b = $('#inst', f); if (b) b.onclick = async () => { pedido.prompt(); const r = await pedido.userChoice.catch(() => ({})); pedido = null; fecharFolha(); if (r.outcome === 'accepted') toast('Pronto! O Palácio está na sua tela inicial.'); };
    });
    try { sessionStorage.setItem('pc_inst', '1'); } catch (e) { /* ok */ }
  }

  /* =====================================================================
     FLUXO DE AGENDAMENTO
     ===================================================================== */
  const PASSOS = [
    { id: 'casa', t: 'Escolha a casa' }, { id: 'servicos', t: 'O que vai fazer?' }, { id: 'barbeiro', t: 'Com quem?' },
    { id: 'horario', t: 'Dia e hora' }, { id: 'voce', t: 'Seus dados' }, { id: 'pagamento', t: 'Pagamento' }
  ];
  let F = null;
  const novoFluxo = (base) => Object.assign({ passo: 0, unidade: null, servicos: [], barbeiro: null, data: null, ini: null, pagamento: null, remarcar: null, feito: null }, base || {});
  const dur = () => PC.durDe(F.servicos);
  const planoCobre = () => { const c = clienteEu(); const s = c && PC.assinaturaAtiva(c.id); return s && F.servicos.length && F.servicos.every((x) => PC.plano(s.plano).cobre.includes(x)) ? s : null; };
  const passosAtivos = () => PASSOS.filter((p) => {
    if (p.id === 'voce' && eu && F.remarcar) return false;
    if (p.id === 'pagamento' && (F.remarcar || PC.regras().pix === 'desligado')) return false;
    return true;
  });

  function horarios(data) {
    if (F.barbeiro !== 'qualquer') return PC.horariosLivres(F.barbeiro, data, dur());
    const set = new Set();
    PC.barbeirosDa(F.unidade).forEach((b) => PC.horariosLivres(b.id, data, dur()).forEach((m) => set.add(m)));
    return [...set].sort((a, b) => a - b);
  }
  function proxLivre(bId) {
    for (let d = 0; d < PC.regras().janelaDias; d++) { const data = PC.somaDias(PC.hoje(), d); const h = PC.horariosLivres(bId, data, dur() || 30)[0]; if (h != null) return { data, ini: h }; }
    return null;
  }

  function podeSeguir() {
    switch (passosAtivos()[F.passo].id) {
      case 'casa': return !!F.unidade;
      case 'servicos': return F.servicos.length > 0;
      case 'barbeiro': return !!F.barbeiro;
      case 'horario': return F.data && F.ini != null;
      case 'voce': return eu && eu.nome.trim().length >= 2 && eu.tel.length >= 10;
      case 'pagamento': return !!F.pagamento;
    }
    return false;
  }

  function telaFluxo(dir) {
    const ps = passosAtivos(); if (F.passo >= ps.length) F.passo = ps.length - 1;
    const p = ps[F.passo];
    app.classList.add('fluxo');
    $('#voltar').hidden = false; $('#marca').hidden = true; $('#titulo').hidden = false;
    $('#titulo').textContent = F.remarcar ? 'Remarcar horário' : p.t;
    $('#passo').textContent = `${F.passo + 1} de ${ps.length}`;
    $('#progresso').hidden = false; $('#progresso i').style.width = ((F.passo + 1) / ps.length * 100) + '%';
    animar(dir);
    ({ casa: pCasa, servicos: pServicos, barbeiro: pBarbeiro, horario: pHorario, voce: pVoce, pagamento: pPagamento })[p.id]();
    barraAcao();
  }
  function animar(dir) { tela.classList.remove('entra', 'volta'); void tela.offsetWidth; tela.classList.add(dir === -1 ? 'volta' : 'entra'); tela.scrollTop = 0; window.scrollTo(0, 0); }
  function avancar() { if (!podeSeguir()) return; if (F.passo === passosAtivos().length - 1) return concluir(); F.passo++; telaFluxo(1); }
  function voltar() { if (F.passo === 0 || (F.remarcar && F.passo <= 3)) { location.hash = F.remarcar ? '#meus' : '#inicio'; return; } F.passo--; telaFluxo(-1); }
  $('#voltar').onclick = () => (F && !F.feito && location.hash === '#agendar') ? voltar() : history.back();

  function barraAcao() {
    const p = passosAtivos()[F.passo].id;
    if (p === 'casa' || p === 'barbeiro') { acao.hidden = true; return; }
    const total = planoCobre() ? 0 : PC.precoDe(F.servicos);
    const mini = F.servicos.length ? `<div class="resumo-mini"><b>${planoCobre() ? 'No plano' : PC.reais(total)}</b>${dur()} min${F.ini != null && p !== 'servicos' ? ' · ' + quandoCurto(F.data, F.ini) : ''}</div>` : '<div class="resumo-mini">Escolha pelo menos um</div>';
    const ult = F.passo === passosAtivos().length - 1;
    const rot = !ult ? 'Continuar' : F.remarcar ? 'Remarcar' : F.pagamento === 'pix' ? 'Pagar no Pix' : 'Confirmar';
    acao.hidden = false; acao.innerHTML = `${mini}<button class="btn btn-royal" id="seguir" ${podeSeguir() ? '' : 'disabled'}>${rot}</button>`;
    $('#seguir').onclick = avancar;
  }

  function pCasa() {
    tela.innerHTML = `<div class="lista">${PC.unidades.map((u) => {
      const hoje = PC.barbeirosNoDia(u.id, PC.hoje()).length;
      return `<button class="op op-casa" data-v="${u.id}" aria-pressed="${F.unidade === u.id}"><img src="${FOTO_UNID[u.id]}" alt=""><span class="t"><b>${E(u.nome)}</b><small>${E(u.endereco)}</small><small>${E(u.perto)}</small><span class="pill" style="margin-top:.5rem">${hoje} barbeiros hoje</span></span></button>`;
    }).join('')}</div>`;
    $$('.op', tela).forEach((b) => b.onclick = () => { if (F.unidade !== b.dataset.v) { F.barbeiro = null; F.data = null; F.ini = null; } F.unidade = b.dataset.v; avancar(); });
  }
  function pServicos() {
    const s = (() => { const c = clienteEu(); return c && PC.assinaturaAtiva(c.id); })();
    tela.innerHTML = `${s ? `<div class="ola-volta">Seu ${E(PC.plano(s.plano).nome)} está ativo: o que estiver no plano sai sem custo.</div>` : ''}
      <p class="sub" style="margin-top:0">Pode marcar mais de um.</p>
      <div class="lista">${PC.servicos.map((x) => `<button class="op" data-v="${x.id}" aria-pressed="${F.servicos.includes(x.id)}"><span class="check">✓</span><span class="t"><b>${E(x.nome)}</b><small>${x.dur} min</small></span><span class="preco">${s && PC.plano(s.plano).cobre.includes(x.id) ? '<span class="pill verde">no plano</span>' : PC.reais(x.preco)}</span></button>`).join('')}</div>`;
    $$('.op', tela).forEach((b) => b.onclick = () => {
      const v = b.dataset.v, i = F.servicos.indexOf(v); i >= 0 ? F.servicos.splice(i, 1) : F.servicos.push(v);
      b.setAttribute('aria-pressed', i < 0); F.ini = null; barraAcao();
    });
  }
  function pBarbeiro() {
    const ps = PC.barbeirosDa(F.unidade);
    tela.innerHTML = `<div class="lista">
      <button class="op" data-v="qualquer" aria-pressed="${F.barbeiro === 'qualquer'}"><span class="av">♛</span><span class="t"><b>Sem preferência</b><small>O primeiro livre no horário que você escolher</small></span></button>
      ${ps.map((b) => {
        const folga = !PC.trabalha(b.id, PC.hoje()); const pl = proxLivre(b.id);
        const sit = PC.situacao(b.id, PC.hoje());
        return `<button class="op ${pl ? '' : 'off'}" data-v="${b.id}" aria-pressed="${F.barbeiro === b.id}" ${pl ? '' : 'disabled'}><span class="av">${FOTO_BARB[b.id] ? `<img src="${FOTO_BARB[b.id]}" alt="">` : E(b.nome.charAt(0))}</span>
          <span class="t"><b>${E(b.nome)}</b><small>${E(b.espec)}</small></span>
          ${folga ? `<span class="pill cinza">${sit === 'ferias' ? 'de férias' : sit === 'atestado' ? 'afastado hoje' : 'folga hoje'}</span>` : pl ? `<span class="pill">${quandoCurto(pl.data, pl.ini).replace(', ', ' · ')}</span>` : '<span class="pill cinza">sem vaga</span>'}</button>`;
      }).join('')}</div>
      <p class="nota">O horário em azul é o próximo livre de cada um.</p>`;
    $$('.op', tela).forEach((b) => b.onclick = () => { F.barbeiro = b.dataset.v; F.ini = null; F.data = null; avancar(); });
  }
  function pHorario() {
    const dias = []; for (let d = 0; d < PC.regras().janelaDias; d++) dias.push(PC.somaDias(PC.hoje(), d));
    const qtd = {}; dias.forEach((d) => { qtd[d] = PC.expedienteDe(d) ? horarios(d).length : 0; });
    if (!F.data || !qtd[F.data]) F.data = dias.find((d) => qtd[d]) || dias[0];
    const hs = horarios(F.data);
    const turnos = [['Manhã', (m) => m < 720], ['Tarde', (m) => m >= 720 && m < 1080], ['Noite', (m) => m >= 1080]];
    tela.innerHTML = `<div class="dias">${dias.map((d) => { const dt = new Date(d + 'T12:00:00');
      return `<button class="dia" data-v="${d}" aria-pressed="${d === F.data}" ${qtd[d] ? '' : 'disabled'}><small>${d === PC.hoje() ? 'hoje' : dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</small><b>${dt.getDate()}</b><i>${qtd[d] ? qtd[d] + ' livres' : !PC.expedienteDe(d) ? 'fechado' : F.barbeiro !== 'qualquer' && !PC.trabalha(F.barbeiro, d) ? 'folga' : 'cheio'}</i></button>`; }).join('')}</div>
      ${F.barbeiro !== 'qualquer' ? `<p class="nota" style="margin:0 0 .4rem">Agenda de <b>${E(PC.barbeiro(F.barbeiro).nome)}</b> · <a href="#" class="link" id="qualquer">ver todos os barbeiros</a></p>` : ''}
      ${hs.length ? turnos.map(([n, fx]) => { const l = hs.filter(fx); return l.length ? `<p class="turno">${n}</p><div class="horas">${l.map((m) => `<button class="hora" data-v="${m}" aria-pressed="${m === F.ini}">${PC.hhmm(m)}</button>`).join('')}</div>` : ''; }).join('')
        : '<div class="vazio">Sem horário livre nesse dia.</div>'}`;
    $$('.dia', tela).forEach((b) => b.onclick = () => { F.data = b.dataset.v; F.ini = null; pHorario(); barraAcao(); });
    $$('.hora', tela).forEach((b) => b.onclick = () => { F.ini = Number(b.dataset.v); $$('.hora', tela).forEach((x) => x.setAttribute('aria-pressed', x === b)); barraAcao(); });
    const q = $('#qualquer', tela); if (q) q.onclick = (e) => { e.preventDefault(); F.barbeiro = 'qualquer'; F.ini = null; pHorario(); barraAcao(); };
    const sel = $('.dia[aria-pressed="true"]', tela); if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest' });
  }
  function pVoce() {
    const nome = eu ? eu.nome : '', tel = eu ? fmtTel(eu.tel) : '';
    tela.innerHTML = `<div id="ola"></div>
      <label class="campo"><span>Seu WhatsApp</span><input id="f-tel" inputmode="tel" autocomplete="tel" value="${E(tel)}" placeholder="(71) 9 0000-0000"></label>
      <label class="campo"><span>Seu nome</span><input id="f-nome" autocomplete="name" value="${E(nome)}" placeholder="Como te chamamos?"></label>
      <p class="nota">Usamos o WhatsApp para lembrar do horário e para você desmarcar sem precisar ligar. Fica salvo neste celular.</p>`;
    const chk = () => {
      const t = $('#f-tel').value.replace(/\D/g, ''); const c = t.length >= 10 && PC.db().clientes.find((x) => x.tel === t);
      if (c && !$('#f-nome').value.trim()) $('#f-nome').value = c.nome;
      $('#ola').innerHTML = c ? `<div class="ola-volta">Que bom te ver de novo, ${E(primeiro(c.nome))}!</div>` : '';
      const n = $('#f-nome').value.trim(); eu = n.length >= 2 && t.length >= 10 ? { nome: n, tel: t } : null; barraAcao();
    };
    $('#f-tel').oninput = (e) => { e.target.value = fmtTel(e.target.value); chk(); };
    $('#f-nome').oninput = chk; chk();
  }
  function pPagamento() {
    const s = planoCobre(); const total = PC.precoDe(F.servicos); const so = PC.regras().pix === 'obrigatorio';
    if (s) {
      F.pagamento = 'plano';
      tela.innerHTML = `<div class="ola-volta">Tudo coberto pelo seu ${E(PC.plano(s.plano).nome)}. Não precisa pagar nada.</div>${resumo()}`;
      return;
    }
    tela.innerHTML = `${resumo()}<p class="h2">Como prefere pagar?</p><div class="pagto">
      <button class="op" data-v="pix" aria-pressed="${F.pagamento === 'pix'}"><span class="ic ic-pix">PIX</span>
        <span class="t"><b>Pagar agora no Pix</b><small style="color:var(--tinta);font-weight:800">${PC.reais(total)} · horário garantido</small><small>É só chegar e sentar. Se desmarcar com ${PC.regras().cancelarAte / 60}h de antecedência, o valor volta.</small></span><span class="check">✓</span></button>
      ${so ? '' : `<button class="op" data-v="local" aria-pressed="${F.pagamento === 'local'}"><span class="ic ic-loja">R$</span><span class="t"><b>Pagar na barbearia</b><small>Pix, cartão ou dinheiro, na hora.</small></span><span class="check">✓</span></button>`}
    </div>`;
    $$('.op', tela).forEach((b) => b.onclick = () => { F.pagamento = b.dataset.v; $$('.op', tela).forEach((x) => x.setAttribute('aria-pressed', x === b)); barraAcao(); });
  }
  function resumo(a) {
    a = a || F; const bn = a.barbeiro === 'qualquer' ? 'Sem preferência' : PC.barbeiro(a.barbeiro).nome;
    return `<div class="resumo">
      <div><span>Casa</span><b>${E(PC.unidade(a.unidade).nome)}</b></div>
      <div><span>Barbeiro</span><b>${E(bn)}</b></div>
      <div><span>Serviço</span><b>${E(PC.nomeServicos(a.servicos))}</b></div>
      <div><span>Quando</span><b>${PC.fmtData(a.data, true)}, ${PC.hm(a.ini)}</b></div>
      <div><span>Valor</span><b>${a.plano ? 'No plano' : PC.reais(PC.precoDe(a.servicos))}</b></div></div>`;
  }

  function concluir() {
    if (F.remarcar) return remarcar();
    if (F.pagamento === 'pix') return folhaPix(PC.precoDe(F.servicos), 'Pague no Pix', () => gravar(true));
    gravar(false);
  }
  function escolherBarbeiro() {
    let b = F.barbeiro; if (b === 'qualquer') b = (PC.semPreferencia(F.unidade, F.data, F.ini, dur()) || {}).id;
    if (!b || !PC.livre(b, F.data, F.ini, dur(), F.remarcar)) { toast('Esse horário acabou de ser ocupado. Escolha outro.'); F.ini = null; F.passo = passosAtivos().findIndex((p) => p.id === 'horario'); telaFluxo(-1); return null; }
    return b;
  }
  function gravar(pagoPix) {
    const b = escolherBarbeiro(); if (!b) return;
    const c = PC.acharOuCriarCliente(eu.nome, eu.tel, 'App'); const plano = planoCobre();
    const a = { id: PC.id(), unidade: F.unidade, barbeiro: b, data: F.data, ini: F.ini, servicos: F.servicos.slice(), dur: dur(), total: PC.precoDe(F.servicos),
      cliente: { id: c.id, nome: c.nome, tel: c.tel }, status: 'agendado', origem: 'App', historico: [] };
    if (plano) a.plano = plano.plano;
    if (pagoPix) a.pix = { valor: a.total, pago: true };
    PC.registrar(a, 'Agendado pelo app' + (F.barbeiro === 'qualquer' ? ' (sem preferência)' : '') + (pagoPix ? ' · Pix pago' : ''));
    PC.db().agendamentos.push(a); PC.salvar();
    F.feito = a; telaFeito();
  }
  function remarcar() {
    const a = PC.db().agendamentos.find((x) => x.id === F.remarcar); if (!a) return;
    const b = escolherBarbeiro(); if (!b) return;
    const antes = `${PC.fmtData(a.data)} ${PC.hm(a.ini)}`;
    a.data = F.data; a.ini = F.ini; a.barbeiro = b; PC.registrar(a, `Remarcado pelo cliente no app (antes: ${antes})`); PC.salvar();
    F.feito = a; F.remarcado = true; telaFeito();
  }
  function telaFeito() {
    const a = F.feito; const b = PC.barbeiro(a.barbeiro); const u = PC.unidade(a.unidade);
    $('#progresso').hidden = true; acao.hidden = true; $('#voltar').hidden = true; $('#titulo').hidden = true; $('#marca').hidden = false; $('#passo').textContent = '';
    animar(1);
    tela.innerHTML = `<div class="feito"><div class="selo"><img src="fotos/escudo.png" alt=""></div>
      <p class="h1">${F.remarcado ? 'Remarcado' : 'Tá marcado'}, <em>${E(primeiro(a.cliente.nome))}.</em></p>
      <p class="sub" style="margin:0">${a.pix ? '<span class="pill verde">Pix pago</span> ' : ''}A recepção da ${E(u.nome)} já está vendo seu horário.</p></div>
      ${resumo(a)}
      <div class="botoes">
        <button class="btn btn-marinho" id="cal">Salvar na agenda do celular</button>
        <a class="btn btn-zap" target="_blank" rel="noopener" href="${PC.zap(PC.whatsapp, `Olá! ${F.remarcado ? 'Remarquei' : 'Marquei'} pelo app: ${PC.nomeServicos(a.servicos)} com ${b.nome}, ${PC.fmtData(a.data, true)} às ${PC.hm(a.ini)} (${u.nome}).`)}">Avisar no WhatsApp</a>
        <a class="btn btn-linha" href="#meus">Ver meus horários</a>
      </div>
      <p class="nota">Atrasou mais de ${PC.regras().tolerancia} minutos e o ${E(b.nome)} já está com o próximo? A gente encaixa você com outro barbeiro livre.</p>`;
    $('#cal').onclick = () => baixarICS(a);
    lembrar(a.cliente.nome, a.cliente.tel);
    F = null;
    let viu = false; try { viu = sessionStorage.getItem('pc_inst_pos') === '1'; sessionStorage.setItem('pc_inst_pos', '1'); } catch (e) { /* ok */ }
    if (!viu) setTimeout(() => folhaInstalar(true), 1400);
  }
  function baixarICS(a) {
    const [y, m, d] = a.data.split('-'); const hh = (x) => String(Math.floor(x / 60)).padStart(2, '0') + String(x % 60).padStart(2, '0') + '00';
    const u = PC.unidade(a.unidade);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Palacio do Corte//PT', 'BEGIN:VEVENT', 'UID:' + a.id + '@palaciodocorte',
      `DTSTART;TZID=America/Bahia:${y}${m}${d}T${hh(a.ini)}`, `DTEND;TZID=America/Bahia:${y}${m}${d}T${hh(a.ini + a.dur)}`,
      `SUMMARY:Palácio do Corte · ${PC.nomeServicos(a.servicos)}`, `LOCATION:${u.endereco}, Salvador - BA`, `DESCRIPTION:Com ${PC.barbeiro(a.barbeiro).nome}`,
      'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', 'DESCRIPTION:Seu horário no Palácio é daqui a 1 hora', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); l.download = 'palacio-do-corte.ics'; document.body.appendChild(l); l.click(); l.remove();
  }

  /* =====================================================================
     TELAS DAS ABAS
     ===================================================================== */
  function modoAbas(rota) {
    app.classList.remove('fluxo'); acao.hidden = true; $('#progresso').hidden = true;
    $('#voltar').hidden = true; $('#titulo').hidden = true; $('#marca').hidden = false; $('#passo').textContent = '';
    $$('#abas a').forEach((a) => a.dataset.r === rota ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    animar(0);
  }
  const meusAgs = () => eu ? PC.agsDoCliente(eu.tel) : [];
  const proximos = () => meusAgs().filter((a) => ['agendado', 'chegou', 'atendimento'].includes(a.status) && !passou(a)).sort((x, y) => (x.data + PC.hhmm(x.ini)).localeCompare(y.data + PC.hhmm(y.ini)));

  function cardProximo(a) {
    const b = PC.barbeiro(a.barbeiro), u = PC.unidade(a.unidade);
    return `<div class="cartao prox"><span class="rot">Seu próximo horário</span>
      <span class="quando">${quandoCurto(a.data, a.ini)}</span>
      <span class="det">${E(PC.nomeServicos(a.servicos))} com ${E(b.nome)} · ${E(u.nome)}${a.pix ? ' · Pix pago' : ''}</span>
      <div class="acoes"><button class="btn btn-claro" data-remarcar="${a.id}">Remarcar</button><button class="btn btn-linha" data-desmarcar="${a.id}">Desmarcar</button></div></div>`;
  }
  function ligarCards() {
    $$('[data-remarcar]', tela).forEach((b) => b.onclick = () => iniciarRemarcar(b.dataset.remarcar));
    $$('[data-desmarcar]', tela).forEach((b) => b.onclick = () => folhaDesmarcar(b.dataset.desmarcar));
  }

  function tInicio() {
    modoAbas('inicio');
    const h = new Date().getHours(); const cump = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const prox = proximos()[0];
    const ult = meusAgs().filter((a) => a.status !== 'cancelado').sort((x, y) => (y.data + y.ini).localeCompare(x.data + x.ini))[0];
    tela.innerHTML = `<p class="ola">${cump}${eu ? ', ' + E(primeiro(eu.nome)) : ''}.</p>
      <p class="h1">O que deseja <em>para hoje?</em></p>
      ${prox ? cardProximo(prox) : `<div class="capa"><img src="fotos/site/013.webp" alt=""><p>Seu próximo <em>corte</em><br>em menos de um minuto.</p><a href="#agendar" class="btn btn-cheio">Agendar horário</a></div>`}
      <p class="h2">Atalhos</p>
      <div class="atalhos">
        ${ult ? `<button class="atalho" id="repetir"><span class="ic">↻</span>Repetir o último<small>${E(PC.nomeServicos(ult.servicos))} com ${E(PC.barbeiro(ult.barbeiro).nome)}</small></button>` : `<a class="atalho" href="#agendar"><span class="ic">✂</span>Novo horário<small>Escolha casa, barbeiro e hora</small></a>`}
        <a class="atalho" href="#meus"><span class="ic">◷</span>Meus horários<small>Remarcar ou desmarcar</small></a>
        <a class="atalho" href="#clube"><span class="ic">♛</span>Clube Realeza<small>Corte o mês todo num valor só</small></a>
        <a class="atalho" target="_blank" rel="noopener" href="${PC.zap(PC.whatsapp, 'Olá! Vim pelo app do Palácio do Corte.')}"><span class="ic" style="background:#DDF7E6;color:#128C3E">✆</span>WhatsApp<small>Falar com a recepção</small></a>
      </div>
      <p class="h2">As casas</p>
      <div class="casas">${PC.unidades.map((u) => `<div class="casa-mini"><img src="${FOTO_UNID[u.id]}" alt=""><div><b>${E(u.nome)}</b><span>${E(u.endereco)}</span><span>${PC.barbeirosNoDia(u.id, PC.hoje()).length} barbeiros hoje</span><a class="link" href="${u.mapa}" target="_blank" rel="noopener">Como chegar</a></div></div>`).join('')}</div>
      ${prox ? `<a href="#agendar" class="btn btn-royal btn-cheio" style="margin-top:1rem">Marcar outro horário</a>` : ''}
      ${!instalado() ? `<button class="btn btn-linha btn-cheio" style="margin-top:.6rem" id="inst-ini">Colocar na tela inicial</button>` : ''}
      <p class="demo">Protótipo Zync · dados de exemplo · <a class="link" href="index.html">site do Palácio</a></p>`;
    ligarCards();
    const r = $('#repetir', tela); if (r) r.onclick = () => { F = novoFluxo({ unidade: ult.unidade, servicos: ult.servicos.slice(), barbeiro: ult.barbeiro }); F.passo = 3; location.hash = '#agendar'; };
    const i = $('#inst-ini', tela); if (i) i.onclick = () => folhaInstalar(false);
  }

  function tMeus() {
    modoAbas('meus');
    if (!eu) {
      const ex = PC.db().clientes.find((c) => c.nome === 'Pedro Henrique');
      tela.innerHTML = `<p class="h1">Meus <em>horários</em></p><p class="sub">Digite o WhatsApp que você usou para marcar.</p>
        <label class="campo"><span>Seu WhatsApp</span><input id="m-tel" inputmode="tel" placeholder="(71) 9 0000-0000"></label>
        <button class="btn btn-royal btn-cheio" id="m-ok">Ver meus horários</button>
        ${ex ? `<button class="btn btn-linha btn-cheio" style="margin-top:.6rem" id="m-ex">Testar com um cliente de exemplo</button>` : ''}
        <p class="demo">Na versão final, o cliente confirma com um código que chega no WhatsApp.</p>`;
      $('#m-tel').oninput = (e) => { e.target.value = fmtTel(e.target.value); };
      $('#m-ok').onclick = () => { const t = $('#m-tel').value.replace(/\D/g, ''); if (t.length < 10) { toast('Confira o número.'); return; } const c = PC.db().clientes.find((x) => x.tel === t); lembrar(c ? c.nome : 'Cliente', t); tMeus(); };
      const b = $('#m-ex'); if (b) b.onclick = () => { lembrar(ex.nome, ex.tel); tMeus(); };
      return;
    }
    const prox = proximos();
    const hist = meusAgs().filter((a) => !prox.includes(a)).sort((x, y) => (y.data + PC.hhmm(y.ini)).localeCompare(x.data + PC.hhmm(x.ini))).slice(0, 6);
    const st = { pago: ['verde', 'Concluído'], finalizado: ['verde', 'Concluído'], faltou: ['verm', 'Não compareceu'], cancelado: ['cinza', 'Desmarcado'], agendado: ['', 'Agendado'] };
    const cartao = (a, velho) => { const dt = new Date(a.data + 'T12:00:00'); const b = PC.barbeiro(a.barbeiro);
      return `<div class="ag ${velho ? 'passado' : ''}"><div class="data"><small>${dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small><b>${dt.getDate()}</b><small>${PC.hm(a.ini)}</small></div>
        <div class="info"><b>${E(PC.nomeServicos(a.servicos))}</b><span>${E(b.nome)} · ${E(PC.unidade(a.unidade).nome)}</span>
          <span style="margin-top:.3rem">${velho ? `<span class="pill ${(st[a.status] || st.agendado)[0]}">${(st[a.status] || st.agendado)[1]}</span>` : `<span class="pill">${quandoCurto(a.data, a.ini)}</span>`} ${a.pix && a.pix.pago ? `<span class="pill verde">${a.pix.estornado ? 'Pix devolvido' : 'Pix pago'}</span>` : ''}</span></div>
        ${velho ? (a.status !== 'cancelado' ? `<div class="acoes" style="grid-template-columns:1fr"><button class="btn btn-linha" data-repetir="${a.id}">Marcar de novo</button></div>` : '')
          : a.status === 'agendado' ? `<div class="acoes"><button class="btn btn-marinho" data-remarcar="${a.id}">Remarcar</button><button class="btn btn-linha" data-desmarcar="${a.id}">Desmarcar</button></div>` : ''}</div>`; };
    tela.innerHTML = `<p class="ola">${E(eu.nome)} · ${fmtTel(eu.tel)} · <a href="#" class="link" id="sair">não sou eu</a></p>
      <p class="h1">Meus <em>horários</em></p>
      <p class="h2">Próximos <small>${prox.length}</small></p>
      <div class="lista">${prox.length ? prox.map((a) => cartao(a, false)).join('') : `<div class="vazio">Nenhum horário marcado.<br><a href="#agendar" class="link">Marcar agora</a></div>`}</div>
      ${hist.length ? `<p class="h2">Anteriores</p><div class="lista">${hist.map((a) => cartao(a, true)).join('')}</div>` : ''}
      <p class="nota">Dá para desmarcar ou remarcar sozinho até ${PC.regras().cancelarAte / 60} horas antes. Depois disso, fale com a recepção.</p>`;
    ligarCards();
    $$('[data-repetir]', tela).forEach((b) => b.onclick = () => { const a = PC.db().agendamentos.find((x) => x.id === b.dataset.repetir); F = novoFluxo({ unidade: a.unidade, servicos: a.servicos.slice(), barbeiro: a.barbeiro }); F.passo = 3; location.hash = '#agendar'; });
    $('#sair').onclick = (e) => { e.preventDefault(); esquecer(); tMeus(); };
  }

  function iniciarRemarcar(id) {
    const a = PC.db().agendamentos.find((x) => x.id === id);
    if (!PC.podeCancelar(a)) return folhaDesmarcar(id);
    F = novoFluxo({ unidade: a.unidade, servicos: a.servicos.slice(), barbeiro: a.barbeiro, remarcar: a.id, data: a.data });
    F.passo = 3; location.hash = '#agendar'; if (location.hash === '#agendar') rota();
  }
  function folhaDesmarcar(id) {
    const a = PC.db().agendamentos.find((x) => x.id === id); if (!a) return;
    const u = PC.unidade(a.unidade);
    if (!PC.podeCancelar(a)) {
      folha(`<h3>Falta pouco para o seu horário</h3><p>Pelo app dá para desmarcar até ${PC.regras().cancelarAte / 60} horas antes. Agora, só falando com a recepção da ${E(u.nome)}.</p>
        <a class="btn btn-zap btn-cheio" target="_blank" rel="noopener" href="${PC.zap(PC.whatsapp, `Olá! Preciso mexer no meu horário de ${PC.fmtData(a.data, true)} às ${PC.hm(a.ini)} (${u.nome}).`)}">Falar com a recepção</a>
        <button class="btn btn-linha btn-cheio" style="margin-top:.6rem" data-fechar>Voltar</button>`);
      return;
    }
    let motivo = '';
    folha(`<h3>Desmarcar horário?</h3><p>${E(PC.nomeServicos(a.servicos))} com ${E(PC.barbeiro(a.barbeiro).nome)}, ${PC.fmtData(a.data, true)} às ${PC.hm(a.ini)}.</p>
      <p style="margin:0;font-weight:800;color:var(--tinta)">Quer contar o motivo? <span style="font-weight:600;color:var(--cinza)">(opcional)</span></p>
      <div class="motivos">${['Imprevisto', 'Vou remarcar', 'Estou doente', 'Trabalho', 'Outro'].map((m) => `<button aria-pressed="false">${m}</button>`).join('')}</div>
      ${a.pix && a.pix.pago ? `<p class="ola-volta">O Pix de ${PC.reais(a.pix.valor)} volta para você em até 1 dia útil.</p>` : ''}
      <button class="btn btn-verm btn-cheio" id="d-ok">Desmarcar</button>
      <button class="btn btn-linha btn-cheio" style="margin-top:.6rem" id="d-rem">Prefiro remarcar</button>
      <button class="btn btn-cheio" style="margin-top:.2rem" data-fechar>Manter horário</button>`, (f) => {
      $$('.motivos button', f).forEach((b) => b.onclick = () => { motivo = motivo === b.textContent ? '' : b.textContent; $$('.motivos button', f).forEach((x) => x.setAttribute('aria-pressed', x.textContent === motivo)); });
      $('#d-ok', f).onclick = () => { PC.cancelar(a, motivo); PC.salvar(); fecharFolha(); toast('Horário desmarcado. A vaga já voltou para a agenda.'); rota(); };
      $('#d-rem', f).onclick = () => { fecharFolha(); iniciarRemarcar(a.id); };
    });
  }

  function tClube() {
    modoAbas('clube');
    const c = clienteEu(); const s = c && PC.assinaturaAtiva(c.id);
    tela.innerHTML = `<p class="h1">Clube <em>Realeza</em></p><p class="sub">Um valor por mês e você corta quando quiser, nas duas casas.</p>
      ${s ? `<div class="ola-volta">Você é do clube: ${E(PC.plano(s.plano).nome)}, renova em ${PC.fmtData(s.vence, true)}.</div>` : ''}
      <div class="lista">${PC.planos.map((p) => `<div class="plano ${p.destaque ? 'top' : ''}">${p.destaque ? '<span class="pill" style="width:max-content;background:var(--areia);color:var(--tinta)">o mais escolhido</span>' : ''}
        <span class="nome">${E(p.nome)}</span><span class="valor">${PC.reais(p.preco)} <small>/mês</small></span>
        <ul>${p.desc.split(/ \+ | e /).map((x) => `<li>${E(x.charAt(0).toUpperCase() + x.slice(1))}</li>`).join('')}<li>Agenda pelo app, sem pagar na hora</li></ul>
        <button class="btn ${p.destaque ? '' : 'btn-royal'} btn-cheio" data-assinar="${p.id}" ${s ? 'disabled' : ''}>${s && s.plano === p.id ? 'Seu plano' : 'Assinar no Pix'}</button></div>`).join('')}</div>
      <p class="nota">Valores de exemplo. Cobrança mensal automática no Pix ou cartão; cancela quando quiser pelo app.</p>`;
    $$('[data-assinar]', tela).forEach((b) => b.onclick = () => {
      const p = PC.plano(b.dataset.assinar);
      if (!eu) { toast('Antes, marque um horário ou entre em Meus horários.'); location.hash = '#meus'; return; }
      folhaPix(p.preco, `Assinar ${p.nome}`, () => {
        const cl = PC.acharOuCriarCliente(eu.nome, eu.tel, 'App');
        PC.lancarVenda({ unidade: 'cb', tipo: 'balcao', cliente: cl.id, itens: [{ tipo: 'plano', id: p.id, nome: p.nome, qtd: 1, preco: p.preco }], total: p.preco, forma: 'Pix', vendedor: 'App' });
        PC.salvar(); toast(`Bem-vindo ao Clube, ${primeiro(eu.nome)}!`); tClube();
      });
    });
  }

  /* ---------------- rotas ---------------- */
  function rota() {
    fecharFolha();
    const r = (location.hash || '#inicio').slice(1);
    if (r === 'agendar') {
      if (!F || F.feito) {
        F = novoFluxo();
        const q = new URLSearchParams(location.search);
        if (PC.unidade(q.get('u'))) { F.unidade = q.get('u'); F.passo = 1; }
      }
      return telaFluxo(1);
    }
    if (r === 'meus') return tMeus();
    if (r === 'clube') return tClube();
    return tInicio();
  }
  window.addEventListener('hashchange', rota);
  window.addEventListener('storage', () => { if (!$('#veu') && !app.classList.contains('fluxo')) rota(); });
  if (new URLSearchParams(location.search).get('u') && !location.hash) location.hash = '#agendar';
  rota();

  // QR do lado (computador) e o aviso de instalar logo na chegada
  const ql = $('#qr-lado'); if (ql) ql.innerHTML = qrSvg(location.href.split('#')[0].split('?')[0], 3);
  let jaViu = false; try { jaViu = sessionStorage.getItem('pc_inst') === '1'; } catch (e) { /* ok */ }
  if (!instalado() && !jaViu) setTimeout(() => { if (!$('#veu')) folhaInstalar(false); }, 900);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
