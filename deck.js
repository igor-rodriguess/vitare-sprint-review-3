/* =====================================================================
   VITARE · Sprint Review 3 · motor do deck (v2, direção "título de cinema")
   - palco 1920×1080 escalado para a janela
   - passos por slide (data-step / data-until), classes at-0..at-N no slide
   - transições entre slides (data-trans no slide que ENTRA; na volta, o inverso):
       corte  · troca seca
       fade   · dissolve curto
       iris   · o slide novo abre de um círculo (data-ox / data-oy do slide que SAI)
       zoom   · a câmera mergulha no ponto data-ox / data-oy do slide que sai
       carro  · um carro cruza a tela e o slide novo entra atrás dele (clip-path)
   - teclado, endereço #id:passo, notas (N), apresentador (P), tela cheia (F), ajuda (?)
   - prefers-reduced-motion: toda transição vira um fade curto
   ===================================================================== */
(function () {
  "use strict";

  var stage = document.getElementById("stage");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var cortina = document.querySelector(".cortina");
  var TOTAL = slides.length;
  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var atual = -1, passo = 0;

  /* ---------- Escala ---------- */
  function escala() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.setProperty("--s", s);
  }
  window.addEventListener("resize", escala);
  escala();

  /* ---------- Passos ---------- */
  function maxPasso(sl) {
    var m = 0;
    sl.querySelectorAll("[data-step],[data-until]").forEach(function (el) {
      m = Math.max(m, parseInt(el.dataset.step || 0, 10), parseInt(el.dataset.until || 0, 10));
    });
    sl.querySelectorAll("video[data-pausas]").forEach(function (v) { m = Math.max(m, pausas(v).length); });
    return m;
  }
  function aplicaPasso(sl, p) {
    for (var k = 0; k <= 12; k++) sl.classList.toggle("at-" + k, k <= p);
    sl.querySelectorAll("[data-step]").forEach(function (el) { el.classList.toggle("on", p >= parseInt(el.dataset.step, 10)); });
    sl.querySelectorAll("[data-until]").forEach(function (el) { el.classList.toggle("off", p >= parseInt(el.dataset.until, 10)); });
  }

  /* ---------- Contagem dos números ---------- */
  function conta(sl) {
    sl.querySelectorAll("[data-count]").forEach(function (el) {
      var alvo = parseInt(el.dataset.count, 10), atraso = parseFloat(el.dataset.delay || 0) * 1000;
      var fmt = function (n) { return n.toLocaleString("pt-BR"); };
      if (reduz) { el.firstChild.nodeValue = fmt(alvo); return; }
      // setTimeout (e não rAF) para a contagem sempre terminar, mesmo com a aba em segundo plano
      var id = (el._conta = (el._conta || 0) + 1), passos = 40, dur = 1400;
      el.firstChild.nodeValue = "0";
      for (var k = 1; k <= passos; k++) (function (k) {
        setTimeout(function () {
          if (el._conta !== id) return;
          var e = 1 - Math.pow(1 - k / passos, 3);
          el.firstChild.nodeValue = fmt(Math.round(alvo * e));
        }, atraso + dur * k / passos);
      })(k);
    });
  }

  /* ---------- Entrada do conteúdo (dispara as animações internas) ---------- */
  function entra(sl) {
    sl.classList.remove("is-in"); void sl.offsetWidth; sl.classList.add("is-in");
    conta(sl);
    midia(sl);
  }

  /* ---------- Vídeo no slide: toca por partes e para no fim de cada uma ----------
     data-pausas="t1,t2,..." no <video>: o passo 0 toca de 0 até t1, o passo 1 de t1 até t2, e o
     último passo vai até o fim. Sem data-pausas, toca do começo ao fim. R repete a parte atual. */
  var vigia = null;
  function pausas(v) { return (v.getAttribute("data-pausas") || "").split(",").filter(Boolean).map(Number); }
  function midia(ativo) {
    if (vigia) { cancelAnimationFrame(vigia); vigia = null; }
    slides.forEach(function (sl) {
      sl.querySelectorAll("video").forEach(function (v) {
        if (sl !== ativo) { if (!v.paused) v.pause(); return; }
        var ps = pausas(v), ini = passo > 0 ? (ps[passo - 1] || 0) : 0, fim = passo < ps.length ? ps[passo] : Infinity;
        // seguindo da parte anterior o vídeo já está no ponto certo; voltando ou no R, ele pula para o começo da parte
        if (Math.abs(v.currentTime - ini) > 0.3) { try { v.currentTime = ini; } catch (e) {} }
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        if (fim === Infinity) return;
        (function olha() {
          if (v.currentTime >= fim) { v.pause(); vigia = null; return; }
          vigia = requestAnimationFrame(olha);
        })();
      });
    });
  }

  /* ---------- Transições entre slides ---------- */
  var DUR = { corte: 0, fade: 420, iris: 1000, zoom: 950, carro: 1250 };
  var REVELA = { iris: 150, zoom: 520, carro: 260 };   // quando o conteúdo novo começa a animar
  var trans = null;

  function terminaTransicao() {
    if (!trans) return;
    trans.timers.forEach(clearTimeout);
    var f = trans.limpa; trans = null; f();
  }

  function origem(sl, alvo) {
    alvo.style.setProperty("--ox", (sl.dataset.ox || 960) + "px");
    alvo.style.setProperty("--oy", (sl.dataset.oy || 540) + "px");
  }

  function troca(velho, novo, dir) {
    terminaTransicao();
    var tipo = (dir > 0 ? novo : velho).dataset.trans || "fade";
    if (!velho) tipo = "corte";
    else if (reduz) tipo = "fade";

    novo.classList.add("is-active");
    if (tipo === "corte") {
      if (velho) velho.classList.remove("is-active", "is-in");
      entra(novo);
      return;
    }

    var marcas = ["t-" + tipo]; if (dir < 0) marcas.push("volta");
    // a íris e o zoom usam o ponto do slide que fica "antes" na história
    var ref = dir > 0 ? velho : novo;
    origem(ref, novo); origem(ref, velho);

    velho.classList.add("sai"); marcas.forEach(function (m) { velho.classList.add(m); });
    novo.classList.add("entra"); marcas.forEach(function (m) { novo.classList.add(m); });
    stage.classList.add("em-transicao");
    if (tipo === "carro") {
      cortina.classList.remove("anda", "volta"); void cortina.offsetWidth;
      cortina.classList.add("anda"); if (dir < 0) cortina.classList.add("volta");
    }

    var timers = [];
    var limpa = function () {
      velho.classList.remove("sai", "is-active", "is-in", "volta", "t-" + tipo);
      novo.classList.remove("entra", "volta", "t-" + tipo);
      cortina.classList.remove("anda", "volta");
      stage.classList.remove("em-transicao");
      if (!novo.classList.contains("is-in")) entra(novo);
    };
    var rev = REVELA[tipo] || 0;
    if (rev && !reduz) timers.push(setTimeout(function () { entra(novo); }, rev)); else entra(novo);
    timers.push(setTimeout(function () { var f = limpa; trans = null; f(); }, DUR[tipo] || 500));
    trans = { timers: timers, limpa: limpa };
  }

  /* ---------- Navegação ---------- */
  function go(i, p, forca) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    var sl = slides[i];
    p = Math.max(0, Math.min(maxPasso(sl), p || 0));
    if (i !== atual) {
      var velho = atual >= 0 ? slides[atual] : null, dir = i > atual ? 1 : -1;
      atual = i; passo = p;
      aplicaPasso(sl, p);
      troca(velho, sl, dir);
    } else {
      passo = p;
      aplicaPasso(sl, p);
      if (forca) entra(sl); else midia(sl);   // no mesmo slide, o passo novo toca a próxima parte do vídeo
    }
    var h = "#" + sl.id + (p ? ":" + p : "");
    if (location.hash !== h) history.replaceState(null, "", h);
    notas(sl);
    canal("go", { i: i, p: p });
  }
  function prox() { if (passo < maxPasso(slides[atual])) go(atual, passo + 1); else if (atual < slides.length - 1) go(atual + 1, 0); }
  function ant() { if (passo > 0) go(atual, passo - 1); else if (atual > 0) go(atual - 1, maxPasso(slides[atual - 1])); }

  /* ---------- Notas (N): o contador mora aqui, não na tela ---------- */
  var painelNotas = document.querySelector(".notas"), t0 = null;
  function rotulo(sl) { return String(sl.dataset.n || slides.indexOf(sl) + 1).padStart(2, "0") + " / " + TOTAL + " · " + (sl.dataset.title || ""); }
  function notas(sl) {
    var a = sl.querySelector("aside.notes");
    painelNotas.querySelector(".corpo-nota").innerHTML = a ? a.innerHTML : "<p class='palco'>Sem notas.</p>";
    painelNotas.querySelector(".titulo-nota").textContent = rotulo(sl) + " · passo " + passo + "/" + maxPasso(sl);
  }
  setInterval(function () {
    if (!t0) return;
    var s = Math.floor((Date.now() - t0) / 1000);
    var txt = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
    painelNotas.querySelector(".tempo").textContent = txt;
    var pa = document.querySelector(".pa-relogio"); if (pa) pa.textContent = txt;
  }, 500);

  /* ---------- Sincronia com a janela do apresentador ---------- */
  var bc = null; try { bc = new BroadcastChannel("vitare-s3"); } catch (e) { bc = null; }
  var recebendo = false;
  function canal(tipo, dados) { if (bc && !recebendo) try { bc.postMessage({ tipo: tipo, dados: dados }); } catch (e) {} }
  if (bc) bc.onmessage = function (ev) {
    if (ev.data && ev.data.tipo === "go") { recebendo = true; go(ev.data.dados.i, ev.data.dados.p); recebendo = false; }
  };

  /* ---------- Modo apresentador (?apresentador) ---------- */
  if (/apresentador/.test(location.search)) {
    document.body.classList.add("apresentador");
    t0 = Date.now();
    var pa = document.querySelector(".painel-apresentador");
    var orig = notas;
    notas = function (sl) {
      orig(sl);
      var a = sl.querySelector("aside.notes"), i = slides.indexOf(sl), nx = slides[i + 1];
      pa.querySelector(".pa-notas").innerHTML = "<p class='pa-atual'>" + rotulo(sl) + " · passo " + passo + "/" + maxPasso(sl) + "</p>" + (a ? a.innerHTML : "");
      pa.querySelector(".pa-prox").textContent = nx ? "Próximo: " + (nx.dataset.title || "") : "Fim";
    };
  }

  /* ---------- Teclado e clique ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === "ArrowRight" || k === "PageDown" || k === " " || k === "Enter") { e.preventDefault(); prox(); }
    else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") { e.preventDefault(); ant(); }
    else if (k === "Home") go(0, 0);
    else if (k === "End") go(slides.length - 1, 0);
    else if (k === "n" || k === "N") { painelNotas.classList.toggle("aberta"); if (!t0) t0 = Date.now(); }
    else if (k === "p" || k === "P") window.open(location.pathname + "?apresentador" + location.hash, "vitare-apresentador", "width=1100,height=760");
    else if (k === "f" || k === "F") { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }
    else if (k === "r" || k === "R") go(atual, passo, true);
    else if (k === "?" || k === "h" || k === "H") document.querySelector(".ajuda").classList.toggle("aberta");
    else if (k === "Escape") { painelNotas.classList.remove("aberta"); document.querySelector(".ajuda").classList.remove("aberta"); }
  });
  stage.addEventListener("click", function (e) {
    var r = stage.getBoundingClientRect();
    if (e.clientX < r.left + r.width * 0.25) ant(); else prox();
  });

  /* ---------- Início ---------- */
  function lerHash() {
    var h = location.hash.slice(1).split(":");
    var i = slides.findIndex(function (s) { return s.id === h[0]; });
    return { i: i >= 0 ? i : 0, p: parseInt(h[1] || "0", 10) || 0 };
  }
  window.addEventListener("hashchange", function () { var h = lerHash(); if (h.i !== atual || h.p !== passo) go(h.i, h.p); });
  var h = lerHash();
  go(h.i, h.p);

  /* ---------- Teste das transições: ?avanca=ms (ou ?volta=ms) abre no #slide:passo e avança sozinho ---------- */
  var teste = location.search.match(/[?&](avanca|volta)=?(\d*)/);
  if (teste) setTimeout(teste[1] === "avanca" ? prox : ant, parseInt(teste[2] || "300", 10));
})();
