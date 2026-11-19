/* =====================================================================
   VITARE · Sprint Review 3 · motor do deck
   - palco 1920×1080 escalado para a janela
   - passos por slide (data-step / data-until), classes at-0..at-N no slide
   - teclado, endereço #id:passo, faixa de progresso por capítulo
   - notas (N), apresentador (P), tela cheia (F), ajuda (?)
   ===================================================================== */
(function () {
  "use strict";

  var stage = document.getElementById("stage");
  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var TOTAL = parseInt(stage.dataset.total || slides.length, 10);
  var reduz = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var atual = 0, passo = 0;

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

  /* ---------- Navegação ---------- */
  function go(i, p, animar) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    var sl = slides[i], mudou = i !== atual || animar === "forca";
    p = Math.max(0, Math.min(maxPasso(sl), p || 0));
    slides.forEach(function (s, k) { if (k !== i) s.classList.remove("is-active", "is-in"); });
    sl.classList.add("is-active");
    if (mudou || !sl.classList.contains("is-in")) {
      sl.classList.remove("is-in"); void sl.offsetWidth; sl.classList.add("is-in");
      conta(sl);
    }
    atual = i; passo = p;
    aplicaPasso(sl, p);
    stage.classList.toggle("sem-chrome", sl.hasAttribute("data-sem-chrome"));
    stage.classList.toggle("claro", sl.classList.contains("claro"));  // chrome acompanha o slide claro
    chrome(sl);
    var h = "#" + sl.id + (p ? ":" + p : "");
    if (location.hash !== h) history.replaceState(null, "", h);
    notas(sl);
    canal("go", { i: i, p: p });
  }
  function prox() { if (passo < maxPasso(slides[atual])) go(atual, passo + 1); else if (atual < slides.length - 1) go(atual + 1, 0); }
  function ant() { if (passo > 0) go(atual, passo - 1); else if (atual > 0) go(atual - 1, maxPasso(slides[atual - 1])); }

  /* ---------- Chrome: nível e faixa ---------- */
  var caps = [];
  slides.forEach(function (s) {
    var c = s.dataset.chapter;
    if (c !== undefined && !caps.some(function (x) { return x.c === c; })) caps.push({ c: c, nome: s.dataset.chapterName || "" });
  });
  var lane = document.querySelector(".lane__caps");
  var capEls = (stage.dataset.capitulos || "").split("|").map(function (nome, k) {
    var el = document.createElement("span");
    el.className = "lane__cap"; el.textContent = String(k); el.dataset.nome = nome;
    lane.appendChild(el); return el;
  });
  var capInicio = (stage.dataset.capInicio || "").split(",").map(Number); // nº do 1º slide de cada capítulo
  capEls.forEach(function (el, k) { el.style.left = ((capInicio[k] - 1) / (TOTAL - 1) * 100) + "%"; });

  function chrome(sl) {
    var n = slides.indexOf(sl) + 1, numero = parseInt(sl.dataset.n || n, 10);
    document.querySelector(".lane__feito").style.width = "calc((100% - 120px) * " + ((numero - 1) / (TOTAL - 1)) + ")";
    document.querySelector(".lane__num").innerHTML = String(numero).padStart(2, "0") + "<span> / " + TOTAL + "</span>";
    var c = parseInt(sl.dataset.chapter, 10);
    capEls.forEach(function (el, k) { el.classList.toggle("atual", k === c); });
    var nv = document.querySelector(".chrome-top .nivel");
    nv.innerHTML = "<b>" + String(c).padStart(2, "0") + "</b>" + (sl.dataset.chapterName || "");
  }

  /* ---------- Notas (N) ---------- */
  var painelNotas = document.querySelector(".notas"), t0 = null;
  function notas(sl) {
    var a = sl.querySelector("aside.notes");
    painelNotas.querySelector(".corpo").innerHTML = a ? a.innerHTML : "<p class='palco'>Sem notas.</p>";
    painelNotas.querySelector(".titulo").textContent = (sl.dataset.n || slides.indexOf(sl) + 1) + " · " + (sl.dataset.title || "");
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
      pa.querySelector(".pa-notas").innerHTML = "<p class='pa-prox'>" + (sl.dataset.n || i + 1) + " · " + (sl.dataset.title || "") + " · passo " + passo + "/" + maxPasso(sl) + "</p>" + (a ? a.innerHTML : "");
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
    else if (k === "r" || k === "R") go(atual, passo, "forca");
    else if (k === "?" || k === "h" || k === "H") document.querySelector(".ajuda").classList.toggle("aberta");
    else if (k === "Escape") { painelNotas.classList.remove("aberta"); document.querySelector(".ajuda").classList.remove("aberta"); }
  });
  /* ---------- Vídeos de backup dos testes ---------- */
  // O vídeo só carrega quando alguém clica no espaço (o slide não depende do arquivo).
  // Sem o arquivo em video/, o espaço avisa onde colocá-lo. O vídeo pausa ao sair do slide.
  document.querySelectorAll(".reserva[data-video]").forEach(function (box) {
    box.addEventListener("click", function () {
      if (box.querySelector("video")) return;
      var v = document.createElement("video");
      v.controls = true; v.playsInline = true; v.src = box.dataset.video;
      v.addEventListener("error", function () { box.classList.add("sem-video"); v.remove(); });
      v.addEventListener("loadeddata", function () { box.classList.add("com-video"); v.play(); });
      box.appendChild(v);
    });
  });
  function pausaVideos() { document.querySelectorAll(".reserva video").forEach(function (v) { if (!v.closest(".is-active")) v.pause(); }); }
  stage.addEventListener("transitionend", pausaVideos);

  stage.addEventListener("click", function (e) {
    if (e.target.closest("video, a, .reserva")) return;  // controles do vídeo não avançam o slide
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
  atual = -1;
  go(h.i, h.p);
})();
