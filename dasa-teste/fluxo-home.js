/**
 * Fluxo DASA de teste no layout da home (fundo azul, cards brancos, barra laranja).
 * Uso: DrappDasaTeste.init({ root, chave, progresso })
 */
(function (global) {
  const API = "https://pedidos.drapp.com.br/api/dasa-teste";
  const PEDIDOS = "https://pedidos.drapp.com.br";
  const TOTAL = 5;

  const TITULOS = {
    1: ["Vamos montar seu orçamento", "Anexe o pedido médico — foto ou PDF."],
    2: ["Onde você quer orçar?", "Escolha o laboratório: A+, Hermes, Alta ou Lavoisier."],
    3: ["Confira os exames", "Revise o que lemos. Se o nome estiver errado, edite o texto."],
    4: ["Seus dados", "CPF, contato e nome para registrar o pedido de teste."],
    5: ["Confirmar pedido", "Revise e envie. Sem WhatsApp/PDF neste teste."],
  };

  // Marcas do form (DASA = grupo, não aparece). A+/Hermes = Fleury; Alta/Lavoisier = DASA.
  const MARCAS_BASE = [
    { id: "aplus", lab: "aplus", grupo: "fleury", nome: "A+", logo: "logo-aplus.png" },
    { id: "hermes", lab: "hermes", grupo: "fleury", nome: "Hermes Pardini", logo: "logo-hermes.png" },
    { id: "alta", lab: "alta", grupo: "dasa", nome: "Alta", logo: "logos/alta.png" },
    { id: "lavoisier", lab: "lavoisier", grupo: "dasa", nome: "Lavoisier", logo: "logos/lavoisier.svg" },
  ];

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }
  function soDigitos(s) { return String(s || "").replace(/\D/g, ""); }
  function fmtPreco(n) {
    if (n == null || !Number.isFinite(n)) return "—";
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function fileToB64(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result || "")); };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  function init(opts) {
    var root = opts.root;
    var chave = opts.chave;
    var labelEl = opts.labelEl;
    var barraEl = opts.barraEl;
    var tituloEl = opts.tituloEl;
    var subEl = opts.subEl;
    var pathPrefix = opts.pathPrefix || "";
    if (!root || !chave) return;

    var MARCAS = MARCAS_BASE.map(function (m) {
      return {
        id: m.id,
        lab: m.lab,
        grupo: m.grupo,
        nome: m.nome,
        logo: pathPrefix + m.logo,
      };
    });

    var estado = {
      passo: 1,
      marca: "alta",
      lab: "alta",
      grupo: "dasa",
      files: [],
      itens: [],
      editando: null,
    };

    root.innerHTML =
      '<div class="dasa-wiz">' +
        '<div class="dasa-passo" data-p="1">' +
          '<div class="card">' +
            '<p style="font-size:19px;font-weight:800;color:var(--dark);margin:0 0 12px;">Anexe um ou mais pedidos médicos</p>' +
            '<div class="upload-acoes">' +
              '<label class="upload-botao">📎 Anexar ou fotografar' +
                '<input type="file" id="dasaFiles" accept="image/*,application/pdf" multiple hidden>' +
              '</label>' +
              '<label class="upload-add-botao" title="Adicionar mais">+' +
                '<input type="file" id="dasaFilesMais" accept="image/*,application/pdf" multiple hidden>' +
              '</label>' +
            '</div>' +
            '<div id="dasaListaArq" class="upload-status" style="margin-top:10px;"></div>' +
          '</div>' +
          '<div class="wiz-nav" style="margin-top:16px;">' +
            '<button type="button" class="primary-btn" id="dasaNext1">Continuar →</button>' +
          '</div>' +
          '<div id="dasaErro1" class="erro" style="display:none;margin-top:12px;"></div>' +
        '</div>' +

        '<div class="dasa-passo" data-p="2" style="display:none;">' +
          '<div class="card">' +
            '<div class="lab-selector-title" style="margin-bottom:12px;">Em qual laboratório deseja orçar?</div>' +
            '<div class="dasa-marcas">' +
              MARCAS.map(function (m) {
                var fallback = pathPrefix + "logos/lavoisier.jpg";
                return (
                  '<button type="button" class="dasa-marca' + (m.id === "alta" ? " is-on" : "") +
                    '" data-marca="' + m.id + '" data-lab="' + m.lab + '" data-grupo="' + m.grupo + '">' +
                    '<img src="' + m.logo + '" alt="' + esc(m.nome) + '" onerror="this.onerror=null;this.src=\'' + fallback + '\'">' +
                    '<span>' + esc(m.nome) + "</span>" +
                  "</button>"
                );
              }).join("") +
            '</div>' +
          '</div>' +
          '<div id="dasaErro2" class="erro" style="display:none;margin-top:12px;"></div>' +
          '<div class="wiz-nav" style="margin-top:16px;">' +
            '<button type="button" class="secondary-btn" id="dasaBack2">← Voltar</button>' +
            '<button type="button" class="primary-btn" id="dasaNext2">Continuar →</button>' +
          '</div>' +
        '</div>' +

        '<div class="dasa-passo" data-p="3" style="display:none;">' +
          '<div class="card">' +
            '<p id="dasaResumo" class="sub" style="margin-top:0;">Lendo exames…</p>' +
            '<div id="dasaTabela"></div>' +
          '</div>' +
          '<div class="wiz-nav" style="margin-top:16px;">' +
            '<button type="button" class="secondary-btn" id="dasaBack3">← Voltar</button>' +
            '<button type="button" class="primary-btn" id="dasaNext3">Continuar →</button>' +
          '</div>' +
          '<button type="button" class="secondary-btn" id="dasaAjudaCedo" style="width:100%;margin-top:8px;border-color:#fecaca;color:#b91c1c;">Preciso de ajuda para identificar</button>' +
          '<div id="dasaErro3" class="erro" style="display:none;margin-top:12px;"></div>' +
        '</div>' +

        '<div class="dasa-passo" data-p="4" style="display:none;">' +
          '<div class="card">' +
            '<label for="dasaCpf" style="font-weight:700;">CPF</label>' +
            '<input id="dasaCpf" type="text" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" style="width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:8px;font-size:15px;margin:6px 0 8px;">' +
            '<button type="button" class="secondary-btn" id="dasaBtnCpf" style="width:auto;padding:8px 14px;margin:0 0 12px;">Buscar CPF</button>' +
            '<div id="dasaCpfHint" style="display:none;font-size:13px;color:#075985;background:#f0f9ff;border-radius:8px;padding:8px 10px;margin-bottom:10px;"></div>' +
            '<label for="dasaNome" style="font-weight:700;">Nome completo</label>' +
            '<input id="dasaNome" type="text" placeholder="Como no documento" style="width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:8px;font-size:15px;margin:6px 0 12px;">' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
              '<div><label for="dasaNasc" style="font-weight:700;">Nascimento</label>' +
              '<input id="dasaNasc" type="date" style="width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:8px;font-size:15px;margin-top:6px;"></div>' +
              '<div><label for="dasaTel" style="font-weight:700;">WhatsApp</label>' +
              '<input id="dasaTel" type="tel" placeholder="(11) 99999-9999" style="width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:8px;font-size:15px;margin-top:6px;"></div>' +
            '</div>' +
            '<label for="dasaEmail" style="font-weight:700;display:block;margin-top:12px;">E-mail</label>' +
            '<input id="dasaEmail" type="email" placeholder="seu@email.com" style="width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:8px;font-size:15px;margin-top:6px;">' +
          '</div>' +
          '<div class="wiz-nav" style="margin-top:16px;">' +
            '<button type="button" class="secondary-btn" id="dasaBack4">← Voltar</button>' +
            '<button type="button" class="primary-btn" id="dasaNext4">Continuar →</button>' +
          '</div>' +
          '<div id="dasaErro4" class="erro" style="display:none;margin-top:12px;"></div>' +
        '</div>' +

        '<div class="dasa-passo" data-p="5" style="display:none;">' +
          '<div class="card" id="dasaResumoFinal"></div>' +
          '<div class="wiz-nav" style="margin-top:16px;">' +
            '<button type="button" class="secondary-btn" id="dasaBack5">← Voltar</button>' +
            '<button type="button" class="primary-btn" id="dasaEnviar">Finalizar →</button>' +
          '</div>' +
          '<button type="button" class="secondary-btn" id="dasaAjuda" style="width:100%;margin-top:8px;border-color:#fecaca;color:#b91c1c;">Finalizar e pedir ajuda nos exames</button>' +
          '<div id="dasaErro5" class="erro" style="display:none;margin-top:12px;"></div>' +
          '<div id="dasaOk5" class="ok" style="display:none;margin-top:12px;"></div>' +
        '</div>' +
      '</div>';

    function pintarProg() {
      if (labelEl) labelEl.textContent = "Passo " + estado.passo + " de " + TOTAL;
      if (barraEl) {
        barraEl.innerHTML = "";
        for (var i = 1; i <= TOTAL; i++) {
          var s = document.createElement("span");
          if (i <= estado.passo) s.className = "on";
          barraEl.appendChild(s);
        }
      }
      var t = TITULOS[estado.passo] || ["", ""];
      if (tituloEl) tituloEl.textContent = t[0];
      if (subEl) subEl.textContent = t[1];
      root.querySelectorAll(".dasa-passo").forEach(function (el) {
        el.style.display = Number(el.getAttribute("data-p")) === estado.passo ? "block" : "none";
      });
    }

    function ir(n) {
      estado.passo = n;
      pintarProg();
      if (n === 5) pintarResumoFinal();
      var sec = document.getElementById("orcamento");
      if (sec) sec.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function showErr(id, msg) {
      var el = document.getElementById(id);
      if (!el) return;
      if (!msg) { el.style.display = "none"; return; }
      el.textContent = msg;
      el.style.display = "block";
    }

    // arquivos
    function onFiles(list) {
      var arr = Array.from(list || []).slice(0, 5);
      estado.files = estado.files.concat(arr).slice(0, 5);
      document.getElementById("dasaListaArq").textContent =
        estado.files.length ? estado.files.map(function (f) { return f.name; }).join(" · ") : "";
    }
    document.getElementById("dasaFiles").addEventListener("change", function (e) {
      estado.files = [];
      onFiles(e.target.files);
    });
    document.getElementById("dasaFilesMais").addEventListener("change", function (e) {
      onFiles(e.target.files);
    });

    document.getElementById("dasaNext1").onclick = function () {
      showErr("dasaErro1");
      if (!estado.files.length) {
        showErr("dasaErro1", "Anexe o pedido médico.");
        return;
      }
      ir(2);
    };
    document.getElementById("dasaBack2").onclick = function () { ir(1); };
    document.getElementById("dasaBack3").onclick = function () { ir(2); };
    document.getElementById("dasaBack4").onclick = function () { ir(3); };
    document.getElementById("dasaBack5").onclick = function () { ir(4); };

    root.querySelectorAll(".dasa-marca").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".dasa-marca").forEach(function (b) { b.classList.remove("is-on"); });
        btn.classList.add("is-on");
        estado.marca = btn.getAttribute("data-marca");
        estado.lab = btn.getAttribute("data-lab");
        estado.grupo = btn.getAttribute("data-grupo") || "dasa";
      });
    });

    async function rematchItem(i) {
      var texto = (estado.itens[i].texto_ocr || "").trim();
      if (!texto) return;
      var res = await fetch(API + "/match", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-dasa-teste-chave": chave },
        body: JSON.stringify({ chave: chave, lab: estado.lab, textos: [texto] }),
      });
      var j = await res.json().catch(function () { return {}; });
      if (!res.ok || !j.ok || !j.itens || !j.itens[0]) throw new Error(j.erro || "Falha ao buscar exame");
      estado.itens[i] = j.itens[0];
    }

    function renderTabela() {
      var wrap = document.getElementById("dasaTabela");
      var m = estado.itens.filter(function (x) { return x.status === "match"; }).length;
      document.getElementById("dasaResumo").textContent =
        estado.itens.length + " exame(s) · " + m + " identificados · " + (estado.itens.length - m) + " para revisar";

      if (!estado.itens.length) {
        wrap.innerHTML = "<p style='color:var(--muted)'>Nenhum exame lido. Digite abaixo.</p>" +
          "<input type='text' id='dasaManual' placeholder='Ex.: Hemograma' style='width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;'>" +
          "<button type='button' class='primary-btn' id='dasaAddManual' style='margin-top:8px;'>Adicionar</button>";
        document.getElementById("dasaAddManual").onclick = async function () {
          var v = (document.getElementById("dasaManual").value || "").trim();
          if (!v) return;
          estado.itens.push({ texto_ocr: v, status: "sem_match", match: null });
          try { await rematchItem(estado.itens.length - 1); } catch (_) {}
          renderTabela();
        };
        return;
      }

      var html = "<table style='width:100%;border-collapse:collapse;font-size:14px;'><thead><tr>" +
        "<th style='text-align:left;font-size:11px;color:var(--muted);padding:8px 4px;'>Exame</th><th></th><th style='text-align:left;font-size:11px;color:var(--muted);'>Status</th><th style='text-align:left;font-size:11px;color:var(--muted);'>Catálogo</th></tr></thead><tbody>";
      estado.itens.forEach(function (it, i) {
        var badge = it.status === "match"
          ? "<span style='background:#dcfce7;color:#166534;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;'>MATCH</span>"
          : "<span style='background:#fee2e2;color:#b91c1c;font-size:10px;font-weight:800;padding:2px 7px;border-radius:4px;'>SEM MATCH</span>";
        var cat = it.match
          ? "<strong>" + esc(it.match.sigla) + "</strong><div style='font-size:12px;color:var(--muted);'>" + esc(it.match.descricao) + " · " + fmtPreco(it.match.preco_drapp) + "</div>"
          : "—";
        var em = estado.editando === i;
        var texto = em
          ? "<input id='dasaEditInp' value=\"" + esc(it.texto_ocr) + "\" style='width:100%;padding:6px 8px;border:1px solid var(--line);border-radius:6px;'>"
          : "<div style='font-weight:600;'>" + esc(it.texto_ocr) + "</div>";
        var acao = em
          ? "<button type='button' data-salvar='" + i + "' style='font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;border:1px solid #93c5fd;background:#fff;color:#1e40af;cursor:pointer;'>Buscar</button>"
          : "<button type='button' data-editar='" + i + "' style='font-size:11px;font-weight:700;padding:5px 10px;border-radius:6px;border:1px solid #93c5fd;background:#fff;color:#1e40af;cursor:pointer;'>Editar</button>";
        html += "<tr style='border-top:1px solid var(--line);'><td style='padding:10px 4px;'>" + texto + "</td><td style='padding:10px 4px;'>" + acao +
          "</td><td style='padding:10px 4px;'>" + badge + "</td><td style='padding:10px 4px;'>" + cat + "</td></tr>";
      });
      html += "</tbody></table>";
      wrap.innerHTML = html;
      wrap.querySelectorAll("[data-editar]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          estado.editando = Number(btn.getAttribute("data-editar"));
          renderTabela();
        });
      });
      wrap.querySelectorAll("[data-salvar]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var i = Number(btn.getAttribute("data-salvar"));
          var inp = document.getElementById("dasaEditInp");
          var novo = (inp && inp.value || "").trim();
          if (!novo) return;
          estado.itens[i].texto_ocr = novo;
          btn.disabled = true;
          try {
            await rematchItem(i);
            estado.editando = null;
            renderTabela();
          } catch (e) {
            alert(e.message || "Falha");
            btn.disabled = false;
          }
        });
      });
    }

    document.getElementById("dasaNext2").onclick = async function () {
      showErr("dasaErro2");
      // A+ / Hermes → fluxo Fleury da home (se o host registrou o callback)
      if (estado.grupo === "fleury") {
        if (typeof opts.onEscolherFleury === "function") {
          opts.onEscolherFleury({
            marca: estado.marca,
            lab: estado.lab,
            files: estado.files.slice(),
          });
          return;
        }
        showErr("dasaErro2", "A+ e Hermes usam o fluxo Fleury da home. Abra sem o parâmetro de teste DASA, ou escolha Alta/Lavoisier.");
        return;
      }
      showErr("dasaErro3");
      ir(3);
      document.getElementById("dasaResumo").textContent = "Lendo o pedido…";
      document.getElementById("dasaTabela").innerHTML = "";
      document.getElementById("dasaNext3").disabled = true;
      try {
        var fotos = [];
        for (var i = 0; i < estado.files.length; i++) {
          var f = estado.files[i];
          fotos.push({ base64: await fileToB64(f), nome: f.name, tipo: f.type || "image/jpeg" });
        }
        var res = await fetch(API + "/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-dasa-teste-chave": chave },
          body: JSON.stringify({ chave: chave, lab: estado.lab, fotos: fotos }),
        });
        var j = await res.json().catch(function () { return {}; });
        if (!res.ok || !j.ok) throw new Error(j.erro || ("HTTP " + res.status));
        estado.itens = j.itens || [];
        estado.editando = null;
        renderTabela();
      } catch (e) {
        showErr("dasaErro3", e.message || "Falha no OCR");
      } finally {
        document.getElementById("dasaNext3").disabled = false;
      }
    };

    document.getElementById("dasaNext3").onclick = function () {
      showErr("dasaErro3");
      if (!estado.itens.filter(function (i) { return i.texto_ocr; }).length) {
        showErr("dasaErro3", "Inclua ao menos um exame.");
        return;
      }
      ir(4);
    };
    document.getElementById("dasaAjudaCedo").onclick = function () { ir(4); };

    document.getElementById("dasaCpf").addEventListener("input", function () {
      var d = soDigitos(this.value).slice(0, 11);
      if (d.length > 9) this.value = d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
      else if (d.length > 6) this.value = d.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
      else if (d.length > 3) this.value = d.replace(/(\d{3})(\d{0,3})/, "$1.$2");
      else this.value = d;
    });

    document.getElementById("dasaBtnCpf").onclick = async function () {
      var hint = document.getElementById("dasaCpfHint");
      var cpf = soDigitos(document.getElementById("dasaCpf").value);
      hint.style.display = "block";
      if (cpf.length !== 11) { hint.textContent = "Informe um CPF com 11 dígitos."; return; }
      hint.textContent = "Buscando…";
      try {
        var res = await fetch(PEDIDOS + "/api/cpf?cpf=" + encodeURIComponent(cpf));
        var j = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(j.mensagem || j.erro || ("HTTP " + res.status));
        var nome = j.nome || j.nome_completo || "";
        var nasc = j.nascimento || j.data_nascimento || "";
        if (nome) document.getElementById("dasaNome").value = nome;
        if (nasc) {
          var m = String(nasc).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
          var iso = m ? (m[3] + "-" + m[2] + "-" + m[1]) : String(nasc).slice(0, 10);
          if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) document.getElementById("dasaNasc").value = iso;
        }
        if (j.telefone && !document.getElementById("dasaTel").value) {
          document.getElementById("dasaTel").value = String(j.telefone).replace(/^\+55\s*/, "");
        }
        if (j.email && !document.getElementById("dasaEmail").value) {
          document.getElementById("dasaEmail").value = j.email;
        }
        hint.textContent = nome ? ("Encontramos: " + nome) : "CPF ok — complete o que faltar.";
      } catch (e) {
        hint.textContent = e.message || "Não encontramos. Preencha à mão.";
      }
    };

    document.getElementById("dasaNext4").onclick = function () {
      showErr("dasaErro4");
      var nome = document.getElementById("dasaNome").value.trim();
      var tel = document.getElementById("dasaTel").value.trim();
      if (!nome || nome.split(/\s+/).length < 2) {
        showErr("dasaErro4", "Informe o nome completo.");
        return;
      }
      if (soDigitos(tel).length < 10) {
        showErr("dasaErro4", "Informe um WhatsApp válido.");
        return;
      }
      ir(5);
    };

    function marcaNome() {
      var m = MARCAS.find(function (x) { return x.id === estado.marca; });
      return m ? m.nome : estado.lab;
    }

    function pintarResumoFinal() {
      var m = estado.itens.filter(function (x) { return x.status === "match"; }).length;
      document.getElementById("dasaResumoFinal").innerHTML =
        "<p style='margin:0 0 8px;font-weight:800;font-size:16px;'>Resumo</p>" +
        "<div style='font-size:14px;line-height:1.7;'>" +
          "<div><strong>Marca:</strong> " + esc(marcaNome()) + "</div>" +
          "<div><strong>Nome:</strong> " + esc(document.getElementById("dasaNome").value) + "</div>" +
          "<div><strong>WhatsApp:</strong> " + esc(document.getElementById("dasaTel").value) + "</div>" +
          "<div><strong>Exames:</strong> " + estado.itens.length + " · " + m + " com match</div>" +
          "<div style='margin-top:8px;color:var(--muted);font-size:13px;'>Ambiente de teste — card TESTE-DASA no admin, sem WhatsApp/PDF.</div>" +
        "</div>";
    }

    async function enviar(pedirAjuda) {
      showErr("dasaErro5");
      var ok = document.getElementById("dasaOk5");
      ok.style.display = "none";
      var limpos = estado.itens.filter(function (i) { return i.texto_ocr; });
      var btn = pedirAjuda ? document.getElementById("dasaAjuda") : document.getElementById("dasaEnviar");
      var old = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Enviando…";
      try {
        var res = await fetch(API + "/pedido", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-dasa-teste-chave": chave },
          body: JSON.stringify({
            chave: chave,
            lab: estado.lab,
            nome: document.getElementById("dasaNome").value.trim(),
            telefone: document.getElementById("dasaTel").value.trim(),
            email: document.getElementById("dasaEmail").value.trim() || undefined,
            cpf: soDigitos(document.getElementById("dasaCpf").value) || undefined,
            nascimento: document.getElementById("dasaNasc").value || undefined,
            pedirAjuda: pedirAjuda,
            itens: limpos.map(function (it) {
              return {
                texto_ocr: it.texto_ocr,
                status: pedirAjuda && it.status === "sem_match" ? "ajuda" : it.status,
                exame_id: it.match && it.match.exame_id,
                sigla: it.match && it.match.sigla,
                descricao_match: it.match && it.match.descricao,
                confianca: it.match && it.match.confianca,
              };
            }),
          }),
        });
        var j = await res.json().catch(function () { return {}; });
        if (!res.ok || !j.ok) throw new Error(j.erro || ("HTTP " + res.status));
        ok.innerHTML = esc(j.mensagem) + "<br><small>token " + esc(j.token) + " · card " + esc(j.deal_id) + "</small>";
        ok.style.display = "block";
        document.getElementById("dasaEnviar").disabled = true;
        document.getElementById("dasaAjuda").disabled = true;
      } catch (e) {
        showErr("dasaErro5", e.message || "Falha ao registrar");
      } finally {
        btn.disabled = false;
        btn.textContent = old;
      }
    }

    document.getElementById("dasaEnviar").onclick = function () { enviar(false); };
    document.getElementById("dasaAjuda").onclick = function () { enviar(true); };

    pintarProg();
  }

  global.DrappDasaTeste = { init: init };
})(window);
