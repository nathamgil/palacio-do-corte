/* Subpáginas: planos do Clube e inscrição do Trabalhe conosco (cai no painel da gestão). */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const E = PC.esc;

  const g = $('#planos-g');
  if (g) g.innerHTML = PC.planos.map((p) => `<article class="plano-c ${p.destaque ? 'top' : ''}">
    ${p.destaque ? '<span class="selo-top">o mais escolhido</span>' : ''}
    <span class="nome">${E(p.nome)}</span><span class="valor">${PC.reais(p.preco).replace(',00', '')} <small>/mês</small></span>
    <ul>${p.desc.split(/ \+ | e /).map((x) => `<li>${E(x.charAt(0).toUpperCase() + x.slice(1))}</li>`).join('')}<li>Vale nas duas casas</li><li>Agenda pelo app</li></ul>
    <a class="btn ${p.destaque ? '' : 'btn-royal'}" href="agendar.html#clube">Assinar</a></article>`).join('');

  const f = $('#form-vaga');
  if (f) {
    let exp = '';
    f.querySelectorAll('[data-campo="exp"] button').forEach((b) => b.onclick = () => {
      exp = b.textContent; f.querySelectorAll('[data-campo="exp"] button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    });
    f.tel.oninput = () => { const d = f.tel.value.replace(/\D/g, '').slice(0, 11); f.tel.value = d.length > 7 ? `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}` : d; };
    f.onsubmit = (e) => {
      e.preventDefault();
      const nome = f.nome.value.trim(), tel = f.tel.value.replace(/\D/g, '');
      if (nome.length < 3 || tel.length < 10) { alert('Preencha nome e WhatsApp.'); return; }
      PC.db().candidatos.push({ id: PC.id(), nome, tel, exp: exp || 'Não informou', especial: f.especial.value.trim() || '—', unidade: f.unidade.value, insta: f.insta.value.trim(), etapa: 'nova', data: PC.hoje() });
      PC.salvar();
      $('#form-area').innerHTML = `<div class="recebido"><img src="fotos/escudo.png" alt="" style="filter:invert(1)"><h3>Recebemos, ${E(nome.split(' ')[0])}.</h3>
        <p>Sua inscrição já está com a gestão do Palácio. A gente chama você no WhatsApp para marcar o teste na cadeira.</p>
        <a class="link-seta" style="color:var(--tinta);border-color:var(--tinta)" href="index.html">Voltar ao site</a></div>`;
    };
  }
})();
