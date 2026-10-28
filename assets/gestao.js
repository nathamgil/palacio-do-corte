/* =====================================================================
   Palácio do Corte — painel da gestão, parte 2 (MODO DEMONSTRAÇÃO)
   Estoque (venda, insumos, retiradas da equipe), Pix e notas fiscais,
   escala e folgas, acerto da equipe e resultados.
   ===================================================================== */
window.GESTAO = function (P) {
  'use strict';
  const { $, $$, E, toast, modal, fecharModal, salvarRender, chipsUnidade, ligarChips, nomeB } = P;
  const S = P.sess;
  const db = () => PC.db();
  const R = () => PC.regras();

  P.ABAS.gestor = [['geral', 'Visão geral'], ['agenda', 'Agenda'], ['caixa', 'Caixa e vendas'], ['pix', 'Pix e notas fiscais'], ['estoque', 'Estoque'],
    ['escala', 'Equipe e escala'], ['acerto', 'Acerto da equipe'], ['resultados', 'Resultados'], ['clientes', 'Clientes'], ['importar', 'Importar do Barbecode'], ['regras', 'Regras e acessos']];
  P.ABAS.recepcao = P.ABAS.recepcao.concat([['estoque', 'Estoque']]);

  const unidSel = (chave) => S()[chave] || 'cb';
  const status = (q, min) => q === 0 ? '<span class="tag verm">zerado</span>' : q < min ? '<span class="tag verm">abaixo do mínimo</span>' : q < min * 1.5 ? '<span class="tag amarelo">perto do mínimo</span>' : '<span class="tag verde">ok</span>';
  const abasInternas = (chave, ops) => `<div class="chips">${ops.map(([id, n]) => `<button class="chip" data-chip="${chave}" data-v="${id}" aria-pressed="${(S()[chave] || ops[0][0]) === id}">${n}</button>`).join('')}</div>`;

  /* ================= ESTOQUE ================= */
  function telaEstoque() {
    const c = $('#conteudo'); const gestor = S().perfil === 'gestor';
    const u = gestor ? unidSel('unidEst') : S().unidade; const grupo = S().grupoEst || 'publico';
    const itens = grupo === 'insumos' ? PC.insumos : PC.produtos;
    const compra = []; PC.unidades.forEach((un) => PC.produtos.concat(PC.insumos).forEach((p) => { const q = PC.qtdEstoque(un.id, p.id); if (q < p.min) compra.push({ un, p, q, pedir: p.min * 2 - q }); }));
    const valorEst = PC.produtos.reduce((t, p) => t + PC.qtdEstoque(u, p.id) * p.custo, 0) + PC.insumos.reduce((t, p) => t + PC.qtdEstoque(u, p.id) * p.custo, 0);
    const ret = db().retiradas.filter((r) => PC.barbeiro(r.barbeiro).unidade === u);
    let corpo = '';
    if (grupo === 'publico' || grupo === 'insumos') {
      corpo = `<div class="card"><h2>${grupo === 'publico' ? 'Venda ao público' : 'Insumos da casa (uso na cadeira)'}</h2><div class="tabela-wrap"><table><thead><tr><th>Item</th><th class="num">Tem</th><th class="num">Mínimo</th><th class="num">Custo</th>${grupo === 'publico' ? '<th class="num">Venda</th><th class="num">Margem</th>' : ''}<th>Situação</th><th></th></tr></thead><tbody>
        ${itens.map((p) => { const q = PC.qtdEstoque(u, p.id); return `<tr><td><b>${E(p.nome)}</b></td><td class="num"><b>${q}</b>${p.un ? ' ' + E(p.un) : ''}</td><td class="num">${p.min}</td><td class="num">${PC.reais(p.custo)}</td>${grupo === 'publico' ? `<td class="num">${PC.reais(p.preco)}</td><td class="num">${Math.round((1 - p.custo / p.preco) * 100)}%</td>` : ''}<td>${status(q, p.min)}</td>
          <td class="acoes-linha"><button class="btn btn-linha btn-peq" data-mov="entrada" data-i="${p.id}">+ Entrada</button>${grupo === 'insumos' ? `<button class="btn btn-linha btn-peq" data-mov="uso" data-i="${p.id}">Baixa de uso</button>` : ''}${gestor ? `<button class="btn btn-linha btn-peq" data-mov="transf" data-i="${p.id}">Transferir</button>` : ''}</td></tr>`; }).join('')}
        </tbody></table></div><p class="ajuda">Venda no balcão já dá baixa sozinha. Insumo sai quando a recepção lança a baixa de uso (ou, na versão final, por serviço feito: 1 lâmina por barba, 1 pescoceira por corte).</p></div>`;
    } else if (grupo === 'retiradas') {
      corpo = `<div class="card"><h2>Mercadoria da equipe <button class="btn btn-azul btn-peq" id="nova-ret" style="float:right">+ Registrar retirada</button></h2>
        <p class="ajuda" style="margin-bottom:.8rem">Quando um barbeiro leva um produto ou consome algo da casa, sai do estoque e entra como desconto no acerto dele, pelo ${R().descontoEquipe === 'custo' ? 'preço de custo' : R().descontoEquipe === '30' ? 'preço de venda com 30% off' : 'preço de venda'}.</p>
        ${ret.length ? `<div class="tabela-wrap"><table><thead><tr><th>Dia</th><th>Quem</th><th>Item</th><th class="num">Qtd</th><th class="num">Desconta</th></tr></thead><tbody>${ret.slice().reverse().map((r) => `<tr><td>${PC.fmtData(r.data)}</td><td><b>${E(nomeB(r.barbeiro))}</b></td><td>${E(PC.produto(r.item).nome)}</td><td class="num">${r.qtd}</td><td class="num">${PC.reais(r.valor)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nenhuma retirada nesta unidade.</p>'}</div>`;
    } else {
      const mv = (db().movimentos || []).filter((m) => m.unidade === u).slice(0, 30);
      corpo = `<div class="card"><h2>Movimentações</h2>${mv.length ? `<div class="tabela-wrap"><table><thead><tr><th>Quando</th><th>Item</th><th>Tipo</th><th class="num">Qtd</th><th>Obs.</th></tr></thead><tbody>${mv.map((m) => `<tr><td>${PC.fmtData(m.data)} ${PC.hm(m.hora)}</td><td>${E(PC.produto(m.item).nome)}</td><td>${E(m.tipo)}</td><td class="num"><b style="color:${m.delta < 0 ? 'var(--verm)' : 'var(--verde)'}">${m.delta > 0 ? '+' : ''}${m.delta}</b></td><td>${E(m.obs)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nada movimentado ainda hoje. Faça uma entrada ou uma venda e volte aqui.</p>'}</div>`;
    }
    c.innerHTML = `
      <div class="cab"><h1>Estoque<small>${E(PC.unidade(u).nome)}</small></h1>${gestor ? chipsUnidade('unidEst', false) : ''}</div>
      <div class="kpis">
        <div class="kpi"><span>Itens abaixo do mínimo</span><b>${compra.filter((x) => x.un.id === u).length}</b><small>nesta unidade</small></div>
        <div class="kpi"><span>Valor parado em estoque</span><b>${PC.reais(valorEst)}</b><small>a preço de custo</small></div>
        <div class="kpi"><span>Retiradas da equipe</span><b>${PC.reais(ret.reduce((t, r) => t + r.valor, 0))}</b><small>a descontar no acerto</small></div>
      </div>
      ${abasInternas('grupoEst', [['publico', 'Venda ao público'], ['insumos', 'Insumos da casa'], ['retiradas', 'Mercadoria da equipe'], ['mov', 'Movimentações']])}
      <div class="duas-col" style="margin-top:1rem">${corpo}
        <div class="card"><h2>Lista de compras</h2>${compra.length ? `<ul class="lista-simples">${compra.map((x) => `<li><span><b>${E(x.p.nome)}</b><small>${E(x.un.nome)} · tem ${x.q}, mínimo ${x.p.min}</small></span><span class="tag">pedir ${x.pedir}</span></li>`).join('')}</ul>
          <p style="margin:.8rem 0 .6rem;font-weight:800">Total estimado: ${PC.reais(compra.reduce((t, x) => t + x.pedir * x.p.custo, 0))}</p>
          <a class="btn btn-zap" style="width:100%" target="_blank" rel="noopener" href="${PC.zap('5571900000000', 'Pedido Palácio do Corte:\n' + compra.map((x) => `• ${x.pedir}x ${x.p.nome} (${x.un.nome})`).join('\n'))}">Mandar pedido ao fornecedor</a>` : '<p class="ajuda">Nada para comprar.</p>'}</div>
      </div>`;
    ligarChips(c);
    $$('[data-mov]', c).forEach((b) => b.onclick = () => modalMov(b.dataset.mov, b.dataset.i, u));
    const nr = $('#nova-ret', c); if (nr) nr.onclick = () => modalRetirada(u);
  }
  function modalMov(tipo, id, u) {
    const p = PC.produto(id); const outra = PC.unidades.find((x) => x.id !== u);
    const tit = { entrada: 'Entrada de mercadoria', uso: 'Baixa de uso', transf: `Transferir para ${outra.nome}` }[tipo];
    const m = modal(`<h2>${tit}</h2><p class="ajuda" style="margin-bottom:.8rem">${E(p.nome)} · ${E(PC.unidade(u).nome)} tem ${PC.qtdEstoque(u, id)}</p>
      <label class="campo"><span>Quantidade</span><input type="number" id="m-q" min="1" value="${tipo === 'entrada' ? p.min * 2 : 1}"></label>
      ${tipo === 'entrada' ? `<label class="campo"><span>Nota do fornecedor (opcional)</span><input id="m-o" placeholder="ex.: NF 4521 · Distribuidora"></label>` : ''}
      <button class="btn btn-azul" style="width:100%" id="m-ok">Confirmar</button>`);
    $('#m-ok', m).onclick = () => {
      const q = Math.max(1, Number($('#m-q', m).value) || 0); const o = ($('#m-o', m) || {}).value || '';
      if (tipo === 'entrada') PC.movEstoque(u, id, q, 'Entrada', o);
      if (tipo === 'uso') PC.movEstoque(u, id, -q, 'Uso na cadeira', '');
      if (tipo === 'transf') { PC.movEstoque(u, id, -q, 'Transferência', 'para ' + outra.nome); PC.movEstoque(outra.id, id, q, 'Transferência', 'de ' + PC.unidade(u).nome); }
      fecharModal(); salvarRender('Estoque atualizado.');
    };
  }
  function modalRetirada(u) {
    const m = modal(`<h2>Registrar retirada da equipe</h2>
      <label class="campo"><span>Quem levou</span><select id="r-b">${PC.barbeirosDa(u).map((b) => `<option value="${b.id}">${E(b.nome)}</option>`).join('')}</select></label>
      <label class="campo"><span>O quê</span><select id="r-i">${PC.produtos.map((p) => `<option value="${p.id}">${E(p.nome)} · ${PC.reais(PC.precoEquipe(p))} p/ equipe</option>`).join('')}</select></label>
      <label class="campo"><span>Quantidade</span><input type="number" id="r-q" min="1" value="1"></label>
      <p class="ajuda" id="r-v"></p>
      <button class="btn btn-azul" style="width:100%" id="r-ok">Registrar e descontar no acerto</button>`);
    const calc = () => { const p = PC.produto($('#r-i', m).value); $('#r-v', m).textContent = `Vai descontar ${PC.reais(PC.precoEquipe(p) * (Number($('#r-q', m).value) || 1))} no acerto.`; };
    $('#r-i', m).onchange = calc; $('#r-q', m).oninput = calc; calc();
    $('#r-ok', m).onclick = () => { PC.retirada($('#r-b', m).value, $('#r-i', m).value, Math.max(1, Number($('#r-q', m).value) || 1)); fecharModal(); salvarRender('Retirada registrada.'); };
  }

  /* ================= PIX E NOTAS ================= */
  function telaPix() {
    const c = $('#conteudo'); const hoje = PC.hoje(); const u = S().unidVer || 'todas'; const naU = (x) => u === 'todas' || x.unidade === u;
    const pixAg = db().agendamentos.filter((a) => a.pix && a.pix.pago && naU(a) && a.data >= hoje);
    const pixHoje = pixAg.filter((a) => a.data === hoje && !a.pix.estornado);
    const devolvidos = db().agendamentos.filter((a) => a.pix && a.pix.estornado && naU(a));
    const vendas = db().vendas.filter((v) => v.data === hoje && naU(v) && v.nf).sort((a, b) => b.hora - a.hora);
    const pend = vendas.filter((v) => v.nf.status === 'pendente');
    c.innerHTML = `
      <div class="cab"><h1>Pix e notas fiscais<small>${PC.fmtData(hoje, true)}</small></h1>${chipsUnidade('unidVer', true)}</div>
      <div class="kpis">
        <div class="kpi"><span>Pix pago no agendamento</span><b>${PC.reais(pixAg.filter((a) => !a.pix.estornado).reduce((t, a) => t + a.pix.valor, 0))}</b><small>${pixAg.length} horários já pagos (hoje e próximos dias)</small></div>
        <div class="kpi"><span>Chegam pagos hoje</span><b>${pixHoje.length}</b><small>cliente só senta na cadeira</small></div>
        <div class="kpi"><span>Notas emitidas hoje</span><b>${vendas.length - pend.length}</b><small>${PC.reais(vendas.filter((v) => v.nf.status === 'emitida').reduce((t, v) => t + v.total, 0))}</small></div>
        <div class="kpi"><span>Notas na fila</span><b>${pend.length}</b><small>${R().emissorNF === 'auto' ? 'saem sozinhas' : 'emissão manual'}</small></div>
      </div>
      <div class="duas-col">
        <div class="card"><h2>Notas de hoje ${pend.length ? `<button class="btn btn-azul btn-peq" id="emitir-todas" style="float:right">Emitir ${pend.length} pendentes</button>` : ''}</h2>
          <div class="tabela-wrap"><table><thead><tr><th>Hora</th><th>O quê</th><th>Tipo</th><th class="num">Valor</th><th>Nota</th></tr></thead><tbody>
          ${vendas.map((v) => `<tr><td>${PC.hhmm(v.hora)}</td><td>${E(v.itens.map((i) => i.nome).join(', '))}</td><td>${PC.tipoNF(v)}</td><td class="num">${PC.reais(v.total)}</td>
            <td>${v.nf.status === 'emitida' ? `<button class="tag verde" data-ver="${v.id}">nº ${v.nf.numero} · ver</button>` : `<button class="btn btn-linha btn-peq" data-emitir="${v.id}">Emitir</button>`}</td></tr>`).join('')}
          </tbody></table></div>
          <p class="ajuda">Serviço sai como NFS-e (Prefeitura de Salvador) e produto como NFC-e (SEFAZ-BA). Plano usado no atendimento não gera nota de novo: a nota sai na venda do plano.</p></div>
        <div style="display:grid;gap:1rem;align-content:start">
          <div class="card"><h2>Pix integrado ao agendamento</h2>
            <p style="margin-bottom:.6rem"><span class="tag verde">● conectado</span> Mercado Pago <span class="ajuda">(exemplo)</span></p>
            <div class="campo"><span>No app do cliente, o Pix é</span><div class="chips">${[['opcional', 'Opcional'], ['obrigatorio', 'Obrigatório'], ['desligado', 'Desligado']].map(([v, n]) => `<button class="chip" data-pix="${v}" aria-pressed="${R().pix === v}">${n}</button>`).join('')}</div></div>
            <div class="campo"><span>Cliente desmarca sozinho até</span><div class="chips">${[60, 120, 240, 1440].map((n) => `<button class="chip" data-canc="${n}" aria-pressed="${R().cancelarAte === n}">${n < 1440 ? n / 60 + 'h antes' : '1 dia antes'}</button>`).join('')}</div></div>
            <p class="ajuda">Desmarcou dentro do prazo: o Pix volta sozinho. Fora do prazo ou faltou: o valor fica com a casa (regra de vocês).</p>
            ${devolvidos.length ? `<p class="ajuda" style="margin-top:.4rem">${devolvidos.length} Pix devolvido(s) por desmarcação.</p>` : ''}</div>
          <div class="card"><h2>Emissão das notas</h2>
            <div class="escolhas">
              <button class="escolha ${R().emissorNF === 'auto' ? 'rec' : ''}" data-nf="auto"><span class="av">1</span><span><b>Automática</b><small>Pagou, a nota sai na hora e vai pro WhatsApp do cliente.</small></span></button>
              <button class="escolha ${R().emissorNF === 'manual' ? 'rec' : ''}" data-nf="manual"><span class="av">2</span><span><b>Manual</b><small>A recepção revisa e emite no fim do dia.</small></span></button>
            </div></div>
          <div class="card"><h2>Chegam pagos hoje</h2>${pixHoje.length ? `<ul class="lista-simples">${pixHoje.map((a) => `<li><span><b>${PC.hm(a.ini)} · ${E(a.cliente.nome)}</b><small>${E(nomeB(a.barbeiro))} · ${E(PC.unidade(a.unidade).nome)}</small></span><span class="tag verde">${PC.reais(a.pix.valor)}</span></li>`).join('')}</ul>` : '<p class="ajuda">Nenhum hoje.</p>'}</div>
        </div>
      </div>`;
    ligarChips(c);
    $$('[data-emitir]', c).forEach((b) => b.onclick = () => { PC.emitirNF(db().vendas.find((v) => v.id === b.dataset.emitir)); salvarRender('Nota emitida.'); });
    const et = $('#emitir-todas', c); if (et) et.onclick = () => { pend.forEach((v) => PC.emitirNF(v)); salvarRender(`${pend.length} notas emitidas.`); };
    $$('[data-ver]', c).forEach((b) => b.onclick = () => verNota(db().vendas.find((v) => v.id === b.dataset.ver)));
    $$('[data-pix]', c).forEach((b) => b.onclick = () => { R().pix = b.dataset.pix; salvarRender('Regra do Pix salva. Já vale no app do cliente.'); });
    $$('[data-canc]', c).forEach((b) => b.onclick = () => { R().cancelarAte = Number(b.dataset.canc); salvarRender('Prazo salvo.'); });
    $$('[data-nf]', c).forEach((b) => b.onclick = () => { R().emissorNF = b.dataset.nf; salvarRender('Salvo.'); });
  }
  function verNota(v) {
    const cli = PC.cliente(v.cliente);
    modal(`<div class="nota-fiscal"><p class="nf-tipo">${E(v.nf.tipo)} nº ${v.nf.numero} · série 1</p><h2>Palácio do Corte Barbearia</h2>
      <p class="ajuda">CNPJ 00.000.000/0001-00 (exemplo) · ${E(PC.unidade(v.unidade).endereco)}, Salvador - BA</p>
      <table style="margin:.8rem 0"><tbody>${v.itens.map((i) => `<tr><td>${E(i.nome)}${i.qtd > 1 ? ' ×' + i.qtd : ''}</td><td class="num">${PC.reais(i.preco * i.qtd)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="num"><b>${PC.reais(v.total)}</b></td></tr></tbody></table>
      <p class="ajuda">Cliente: ${E(cli ? cli.nome : 'Consumidor')} · Pago em ${E(v.forma)} · emitida às ${PC.hm(v.nf.quando)}</p>
      <p class="nf-chave">${E(v.nf.chave)}</p>
      <a class="btn btn-zap" style="width:100%;margin-top:.8rem" target="_blank" rel="noopener" href="${PC.zap(cli && cli.tel ? cli.tel : PC.whatsapp, `Sua nota do Palácio do Corte: ${v.nf.tipo} nº ${v.nf.numero}, ${PC.reais(v.total)}.`)}">Enviar ao cliente no WhatsApp</a></div>`);
  }

  /* ================= EQUIPE E ESCALA ================= */
  const SIT = { trabalha: ['Trabalha', ''], folga: ['Folga', 'f-folga'], ferias: ['Férias', 'f-ferias'], atestado: ['Atestado', 'f-atestado'], avulsa: ['Folga avulsa', 'f-folga'] };
  function telaEscala() {
    const c = $('#conteudo'); const hoje = PC.hoje(); const dias = Array.from({ length: 7 }, (_, i) => PC.somaDias(hoje, i));
    const etapas = [['nova', 'Inscrição nova'], ['teste', 'Teste na cadeira'], ['formacao', 'Formação Palácio'], ['contratado', 'Contratado']];
    c.innerHTML = `
      <div class="cab"><h1>Equipe e escala<small>Quem trabalha, quem está de folga e quem está chegando</small></h1></div>
      <div class="kpis">${PC.unidades.map((u) => { const t = PC.barbeirosDa(u.id); const n = PC.barbeirosNoDia(u.id, hoje); return `<div class="kpi"><span>Hoje · ${E(u.nome)}</span><b>${n.length} de ${t.length}</b><small>${t.filter((b) => !n.includes(b)).map((b) => `${b.nome} (${SIT[PC.situacao(b.id, hoje)][0].toLowerCase()})`).join(', ') || 'equipe completa'}</small></div>`; }).join('')}
        <div class="kpi"><span>Candidatos no processo</span><b>${db().candidatos.filter((k) => k.etapa !== 'contratado').length}</b><small>vindos do site</small></div></div>
      <div class="card"><h2>Próximos 7 dias</h2><div class="tabela-wrap"><table class="escala"><thead><tr><th>Barbeiro</th>${dias.map((d) => `<th>${PC.fmtData(d).replace(',', '')}</th>`).join('')}</tr></thead><tbody>
        ${PC.unidades.map((u) => `<tr class="sep"><td colspan="8">${E(u.nome)}</td></tr>` + PC.barbeirosDa(u.id).map((b) => `<tr><td><b>${E(b.nome)}</b></td>${dias.map((d) => { const s = PC.expedienteDe(d) ? PC.situacao(b.id, d) : 'fechado'; const aus = PC.ausencia(b.id, d);
          return `<td><button class="cel ${(SIT[aus && aus.tipo === 'folga' ? 'avulsa' : s] || ['', 'f-folga'])[1]}" data-b="${b.id}" data-d="${d}">${s === 'trabalha' ? PC.qtdNoDia(b.id, d) + ' clientes' : (SIT[aus && aus.tipo === 'folga' ? 'avulsa' : s] || ['Fechado'])[0]}</button></td>`; }).join('')}</tr>`).join('')).join('')}
      </tbody></table></div><p class="ajuda">Toque num dia para dar folga, férias ou atestado. Quem está fora some na hora do app de agendamento.</p></div>
      <div class="card" style="margin-top:1rem"><h2>Trabalhe conosco · candidatos</h2><div class="funil">${etapas.map(([id, n]) => `<div class="funil-col"><h3>${n}</h3>${db().candidatos.filter((k) => k.etapa === id).map((k) => `<div class="cand"><b>${E(k.nome)}</b><small>${E(k.exp)} · ${E(k.especial)}</small><small>${E(PC.unidade(k.unidade).nome)}${k.insta ? ' · ' + E(k.insta) : ''}</small>
        <div class="acoes-linha"><a class="btn btn-zap btn-peq" target="_blank" rel="noopener" href="${PC.zap(k.tel, `Oi, ${k.nome.split(' ')[0]}! Aqui é do Palácio do Corte, sobre sua inscrição.`)}">WhatsApp</a>${id !== 'contratado' ? `<button class="btn btn-linha btn-peq" data-avanca="${k.id}">Avançar →</button>` : ''}</div></div>`).join('') || '<p class="ajuda">—</p>'}</div>`).join('')}</div></div>`;
    $$('.cel', c).forEach((b) => b.onclick = () => modalDia(b.dataset.b, b.dataset.d));
    $$('[data-avanca]', c).forEach((b) => b.onclick = () => { const k = db().candidatos.find((x) => x.id === b.dataset.avanca); k.etapa = etapas[etapas.findIndex((e) => e[0] === k.etapa) + 1][0]; salvarRender(`${k.nome.split(' ')[0]} avançou de etapa.`); });
  }
  function modalDia(bId, d) {
    const b = PC.barbeiro(bId); const aus = PC.ausencia(bId, d); const ag = PC.doDia(d, (a) => a.barbeiro === bId && a.status === 'agendado');
    const m = modal(`<h2>${E(b.nome)} · ${PC.fmtData(d, true)}</h2>
      <p class="ajuda" style="margin-bottom:.8rem">Hoje está como: <b>${SIT[PC.situacao(bId, d)][0]}</b>. Folga fixa: ${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][(db().escala[bId] || {}).folga] || 'nenhuma'}.</p>
      ${ag.length ? `<p class="alerta-txt">${ag.length} cliente(s) marcado(s) nesse dia. Ao dar folga, a recepção recebe a lista para remanejar.</p>` : ''}
      <div class="escolhas">
        ${aus || PC.situacao(bId, d) === 'folga' ? `<button class="escolha" data-op="volta"><span class="av">↺</span><span><b>Volta a trabalhar</b><small>${aus ? 'Remove ' + E(SIT[aus.tipo][0].toLowerCase()) : 'Tira a folga fixa desse dia da semana'}</small></span></button>` : ''}
        <button class="escolha" data-op="folga"><span class="av">1</span><span><b>Folga só nesse dia</b><small>Folga avulsa</small></span></button>
        <button class="escolha" data-op="fixa"><span class="av">2</span><span><b>Folga fixa toda ${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][PC.diaSemana(d)]}</b><small>Vale para todas as semanas</small></span></button>
        <button class="escolha" data-op="atestado"><span class="av">3</span><span><b>Atestado</b><small>Afastado nesse dia</small></span></button>
        <button class="escolha" data-op="ferias"><span class="av">4</span><span><b>Férias de 15 dias</b><small>A partir desse dia</small></span></button>
      </div>`);
    $$('[data-op]', m).forEach((x) => x.onclick = () => {
      const op = x.dataset.op; const A = db().ausencias;
      if (op === 'volta') { db().ausencias = A.filter((a) => a !== aus); if (!aus && db().escala[bId]) delete db().escala[bId].folga; }
      if (op === 'folga' || op === 'atestado') A.push({ id: PC.id(), barbeiro: bId, de: d, ate: d, tipo: op });
      if (op === 'ferias') A.push({ id: PC.id(), barbeiro: bId, de: d, ate: PC.somaDias(d, 14), tipo: 'ferias' });
      if (op === 'fixa') db().escala[bId] = { folga: PC.diaSemana(d) };
      fecharModal(); salvarRender(ag.length && op !== 'volta' ? `Escala salva. ${ag.length} cliente(s) para remanejar.` : 'Escala salva.');
    });
  }

  /* ================= ACERTO DA EQUIPE ================= */
  function telaAcerto() {
    const c = $('#conteudo'); const hoje = PC.hoje(); const ini = PC.somaDias(hoje, -14);
    const hist = db().historico.filter((h) => h.data >= ini);
    const fechados = db().acertos || (db().acertos = []);
    const linhas = PC.barbeiros.map((b, i) => {
      const unidTot = hist.reduce((t, h) => t + h[b.unidade], 0); const peso = [1.18, 1.3, 0.92, 0.86, 1.1, 0.95, 1.05, 0.7][i];
      const servHoje = db().vendas.filter((v) => v.data === hoje && v.barbeiro === b.id).reduce((t, v) => t + v.itens.filter((x) => x.tipo === 'servico').reduce((s, x) => s + x.preco, 0), 0);
      const fat = Math.round(unidTot * 0.78 / 4 * peso) + servHoje;
      const com = fat * R().comissao / 100; const ret = db().retiradas.filter((r) => r.barbeiro === b.id && r.data >= ini).reduce((t, r) => t + r.valor, 0);
      const minimo = 600; // mínimo garantido de R$ 1.200/mês = R$ 600 por quinzena
      const bruto = Math.max(com, minimo);
      return { b, fat, com, ret, bruto, liq: bruto - ret, usouMin: com < minimo, pago: fechados.includes(b.id) };
    });
    c.innerHTML = `
      <div class="cab"><h1>Acerto da equipe<small>Quinzena ${PC.fmtData(ini)} a ${PC.fmtData(hoje)}</small></h1></div>
      <div class="kpis">
        <div class="kpi"><span>Faturado em serviços</span><b>${PC.reais(linhas.reduce((t, l) => t + l.fat, 0))}</b></div>
        <div class="kpi"><span>Comissões</span><b>${PC.reais(linhas.reduce((t, l) => t + l.bruto, 0))}</b><small>${R().comissao}% ou o mínimo garantido</small></div>
        <div class="kpi"><span>Descontos da equipe</span><b>${PC.reais(linhas.reduce((t, l) => t + l.ret, 0))}</b><small>produtos retirados</small></div>
        <div class="kpi"><span>A pagar</span><b>${PC.reais(linhas.filter((l) => !l.pago).reduce((t, l) => t + l.liq, 0))}</b><small>${linhas.filter((l) => l.pago).length} já pagos</small></div>
      </div>
      <div class="card"><div class="tabela-wrap"><table><thead><tr><th>Barbeiro</th><th>Unidade</th><th class="num">Faturou</th><th class="num">Comissão</th><th class="num">Descontos</th><th class="num">Recebe</th><th></th></tr></thead><tbody>
        ${linhas.map((l) => `<tr><td><b>${E(l.b.nome)}</b></td><td>${E(PC.unidade(l.b.unidade).nome)}</td><td class="num">${PC.reais(l.fat)}</td><td class="num">${PC.reais(l.bruto)}${l.usouMin ? ' <span class="tag">mínimo</span>' : ''}</td><td class="num">${l.ret ? '− ' + PC.reais(l.ret) : '—'}</td><td class="num"><b>${PC.reais(l.liq)}</b></td>
          <td class="acoes-linha">${l.pago ? '<span class="tag verde">pago</span>' : `<button class="btn btn-azul btn-peq" data-pagar="${l.b.id}">Marcar pago</button>`}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="ajuda">Comissão de ${R().comissao}% (muda em Regras) e mínimo garantido de R$ 1.200 por mês, como no anúncio de vaga de vocês. Na versão final, cada barbeiro vê o próprio extrato no perfil dele.</p></div>`;
    $$('[data-pagar]', c).forEach((b) => b.onclick = () => { fechados.push(b.dataset.pagar); salvarRender(`Acerto de ${nomeB(b.dataset.pagar)} marcado como pago.`); });
  }

  /* ================= RESULTADOS ================= */
  function telaResultados() {
    const c = $('#conteudo'); const h = db().historico; const max = Math.max(...h.map((x) => x.cb + x.cs));
    const tot = (k) => h.reduce((t, x) => t + x[k], 0);
    const ags = db().agendamentos.filter((a) => a.status !== 'cancelado');
    const cont = (f) => { const m = {}; ags.forEach((a) => { const k = f(a); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const serv = cont((a) => PC.servico(a.servicos[0]).nome).slice(0, 6); const maxS = serv[0][1];
    const pico = {}; ags.forEach((a) => { const hh = Math.floor(a.ini / 60); pico[hh] = (pico[hh] || 0) + 1; }); const maxP = Math.max(...Object.values(pico));
    const orig = cont((a) => a.origem); const totO = ags.length;
    const faltas = db().agendamentos.filter((a) => a.status === 'faltou').length; const feitos = db().agendamentos.filter((a) => ['pago', 'faltou'].includes(a.status)).length;
    const sem1 = h.slice(-7).reduce((t, x) => t + x.cb + x.cs, 0), sem0 = h.slice(-14, -7).reduce((t, x) => t + x.cb + x.cs, 0);
    c.innerHTML = `
      <div class="cab"><h1>Resultados<small>Últimas 4 semanas</small></h1></div>
      <div class="kpis">
        <div class="kpi"><span>Faturamento 28 dias</span><b>${PC.reais(tot('cb') + tot('cs'))}</b><small>as duas casas</small></div>
        <div class="kpi"><span>Última semana</span><b>${PC.reais(sem1)}</b><small style="color:${sem1 >= sem0 ? 'var(--verde)' : 'var(--verm)'}">${sem1 >= sem0 ? '▲' : '▼'} ${Math.abs(Math.round((sem1 / sem0 - 1) * 100))}% sobre a anterior</small></div>
        <div class="kpi"><span>Federação</span><b>${Math.round(tot('cs') / (tot('cb') + tot('cs')) * 100)}%</b><small>do faturamento, casa nova crescendo</small></div>
        <div class="kpi"><span>Faltas</span><b>${feitos ? Math.round(faltas / feitos * 100) : 0}%</b><small>Pix no agendamento derruba esse número</small></div>
      </div>
      <div class="card"><h2>Faturamento por dia <span class="legenda-g"><i style="background:#111B33"></i>Cidade Baixa <i style="background:#1F45B5"></i>Federação</span></h2>
        <div class="barras">${h.map((x) => `<div class="b" title="${PC.fmtData(x.data)} · ${PC.reais(x.cb + x.cs)}"><i style="height:${x.cs / max * 100}%;background:#1F45B5"></i><i style="height:${x.cb / max * 100}%;background:#111B33"></i><small>${new Date(x.data + 'T12:00:00').getDate()}</small></div>`).join('')}</div></div>
      <div class="tres-col">
        <div class="card"><h2>Serviços mais feitos</h2>${serv.map(([n, v]) => `<div style="margin-bottom:.6rem"><div style="display:flex;justify-content:space-between;font-size:.9rem"><b>${E(n)}</b><span>${v}</span></div><div class="barra-h"><i style="width:${v / maxS * 100}%"></i></div></div>`).join('')}</div>
        <div class="card"><h2>Horário de pico</h2><div class="barras pico">${Object.keys(pico).sort((a, b) => a - b).map((k) => `<div class="b"><i style="height:${pico[k] / maxP * 100}%;background:${pico[k] === maxP ? '#1F45B5' : '#9AA8C8'}"></i><small>${k}h</small></div>`).join('')}</div></div>
        <div class="card"><h2>De onde vêm os horários</h2>${orig.map(([n, v]) => `<div style="margin-bottom:.6rem"><div style="display:flex;justify-content:space-between;font-size:.9rem"><b>${E(n === 'Site' || n === 'App' ? n + ' (sem recepção)' : n)}</b><span>${Math.round(v / totO * 100)}%</span></div><div class="barra-h"><i style="width:${v / totO * 100}%"></i></div></div>`).join('')}
          <p class="ajuda">Tudo que entra pelo app libera a recepção para vender produto e plano.</p></div>
      </div>`;
  }

  Object.assign(P.TELAS, { estoque: telaEstoque, pix: telaPix, escala: telaEscala, acerto: telaAcerto, resultados: telaResultados });
};
