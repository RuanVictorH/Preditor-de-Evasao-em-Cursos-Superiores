import { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─── Constantes fixas ──────────────────────────────────────────────
const REGIOES = ["Centro-Oeste", "Nordeste", "Norte", "Sudeste", "Sul"];

const CAT_PARA_REDE = {
  "1": "Pública", "2": "Pública", "3": "Pública",
  "4": "Privada", "5": "Privada", "6": "Privada",
  "7": "Privada", "8": "Privada", "9": "Privada",
};

const LABELS_GRAU = { "1": "Bacharelado", "2": "Licenciatura", "3": "Tecnológico", "4": "Bacharelado e Licenciatura" };
const LABELS_MODALIDADE = { "1": "Presencial", "2": "EAD" };
const LABELS_ORG = {
  "1": "Universidade",
  "2": "Centro Universitário",
  "3": "Faculdade",
  "4": "IF / CEFET",
  "5": "CEFET",
};

const SLIDER_MAX = { QT_VG_TOTAL: 2000, QT_INSCRITO_TOTAL: 10000, QT_ING: 2000 };

const PASSOS = [
  { num: "①", titulo: "Localização" },
  { num: "②", titulo: "Instituição" },
  { num: "③", titulo: "Curso" },
  { num: "④", titulo: "Porte e Demanda" },
];

// ─── Sub-componentes ───────────────────────────────────────────────

function RadioGroup({ opcoes, valor, onChange }) {
  return (
    <div className="radio-group">
      {opcoes.map((op) => (
        <label
          key={op.value}
          className={`radio-btn ${valor === op.value ? "selecionado" : ""}`}
        >
          <input
            type="radio"
            value={op.value}
            checked={valor === op.value}
            onChange={() => onChange(op.value)}
          />
          {op.label}
        </label>
      ))}
    </div>
  );
}

function ToggleSwitch({ valor, onChange, labelSim = "Sim", labelNao = "Não" }) {
  const ativo = valor === "1" || valor === 1 || valor === true;
  return (
    <div className="toggle-wrapper">
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => onChange(e.target.checked ? "1" : "0")}
        />
        <span className="toggle-slider" />
      </label>
      <span className="toggle-label">{ativo ? labelSim : labelNao}</span>
    </div>
  );
}

function Autocomplete({ opcoes, valor, onChange, placeholder }) {
  const [query, setQuery] = useState(
    () => opcoes.find((o) => o.value === valor)?.label || valor || ""
  );
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  const filtradas = query
    ? opcoes.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : opcoes;

  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Sincroniza label quando valor externo muda
  useEffect(() => {
    const label = opcoes.find((o) => o.value === valor)?.label;
    if (label && label !== query) setQuery(label);
  }, [valor]); // eslint-disable-line

  function selecionar(op) {
    setQuery(op.label);
    onChange(op.value);
    setAberto(false);
  }

  return (
    <div className="autocomplete-wrapper" ref={ref}>
      <input
        type="text"
        value={query}
        placeholder={placeholder || "Buscar..."}
        onChange={(e) => {
          setQuery(e.target.value);
          setAberto(true);
          if (!e.target.value) onChange("");
        }}
        onFocus={() => setAberto(true)}
      />
      {aberto && filtradas.length > 0 && (
        <div className="autocomplete-lista">
          {filtradas.map((op) => (
            <div
              key={op.value}
              className={`autocomplete-item ${op.value === valor ? "ativo" : ""}`}
              onMouseDown={() => selecionar(op)}
            >
              {op.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SliderNumerico({ nome, valor, onChange, max, mediana, erro }) {
  const maxVal = max || 2000;
  const numVal = valor === "" ? "" : Number(valor);

  function handleSlider(e) {
    onChange(nome, Number(e.target.value));
  }
  function handleInput(e) {
    const v = e.target.value;
    onChange(nome, v === "" ? "" : Number(v));
  }

  return (
    <div className="slider-wrapper">
      <div className="slider-row">
        <input
          type="range"
          min={0}
          max={maxVal}
          step={1}
          value={numVal || 0}
          onChange={handleSlider}
        />
        <input
          type="number"
          className="slider-num-input"
          min={0}
          max={maxVal * 5}
          value={valor}
          onChange={handleInput}
          placeholder="0"
        />
      </div>
      {mediana != null && (
        <span className="slider-mediana-label">
          Mediana nacional para essa combinação: <strong>{mediana.toLocaleString("pt-BR")}</strong>
        </span>
      )}
      {erro && <span className="campo-erro">{erro}</span>}
    </div>
  );
}

// Gauge SVG (semicírculo)
function Gauge({ probabilidade, nivel }) {
  const raio = 80;
  const cx = 110;
  const cy = 100;
  const larguraArco = 16;

  // Ângulo: 180° = 0%, 0° = 100% (semicírculo invertido)
  const angulo = (1 - probabilidade) * Math.PI;
  const x = cx + raio * Math.cos(angulo);
  const y = cy - raio * Math.sin(angulo);

  const corNivel = { baixo: "#27865a", medio: "#b68a1a", alto: "#b8433d" };
  const cor = corNivel[nivel] || "#27865a";

  // Trilha de fundo (semicírculo)
  const trackX2 = cx + raio;
  const trackX1 = cx - raio;

  return (
    <svg width="220" height="120" viewBox="0 0 220 120">
      {/* Trilha de fundo */}
      <path
        d={`M ${trackX1} ${cy} A ${raio} ${raio} 0 0 1 ${trackX2} ${cy}`}
        fill="none"
        stroke="#eef1ef"
        strokeWidth={larguraArco}
        strokeLinecap="round"
      />
      {/* Arco colorido */}
      <path
        d={`M ${cx - raio} ${cy} A ${raio} ${raio} 0 0 1 ${x} ${y}`}
        fill="none"
        stroke={cor}
        strokeWidth={larguraArco}
        strokeLinecap="round"
      />
      {/* Marcador de agulha */}
      <circle cx={x} cy={y} r={6} fill={cor} />
      {/* Rótulos */}
      <text x={cx - raio - 6} y={cy + 18} fontSize="11" fill="#9bb" textAnchor="middle">0%</text>
      <text x={cx + raio + 6} y={cy + 18} fontSize="11" fill="#9bb" textAnchor="middle">100%</text>
    </svg>
  );
}

// Gráfico de barras horizontal top 5
function BarrasTop5({ dados }) {
  const maxImp = Math.max(...dados.map((d) => d.importancia), 0.01);
  return (
    <div>
      {dados.map((d) => (
        <div className="barra-item" key={d.feature}>
          <div className="barra-rotulo">
            <span>{d.rotulo}</span>
            <span>{(d.importancia * 100).toFixed(1)}%</span>
          </div>
          <div className="barra-track">
            <div
              className="barra-fill"
              style={{ width: `${(d.importancia / maxImp) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────
function App() {
  const [opcoesBruto, setOpcoesBruto] = useState(null);
  const [regiaoUFs, setRegiaoUFs] = useState({});
  const [medianasPorAreaGrau, setMedianasPorAreaGrau] = useState({});
  const [medianaGeral, setMedianaGeral] = useState({});
  const [modeloInfo, setModeloInfo] = useState({});
  const [passo, setPasso] = useState(0);
  const [form, setForm] = useState({
    NO_REGIAO: "",
    SG_UF: "",
    TP_ORGANIZACAO_ACADEMICA: "1",
    TP_CATEGORIA_ADMINISTRATIVA: "1",
    IN_COMUNITARIA: "0",
    IN_CONFESSIONAL: "0",
    NO_CINE_AREA_GERAL: "",
    TP_GRAU_ACADEMICO: "1",
    IN_GRATUITO: "0",
    TP_MODALIDADE_ENSINO: "1",
    TP_DIMENSAO: "1",
    QT_VG_TOTAL: "",
    QT_INSCRITO_TOTAL: "",
    QT_ING: "",
  });
  const [erros, setErros] = useState({});
  const [resultado, setResultado] = useState(null);
  const [erroGlobal, setErroGlobal] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [iniciando, setIniciando] = useState(true);

  // Carrega opções e metadados do backend
  useEffect(() => {
    fetch(`${API_URL}/opcoes`)
      .then((r) => r.json())
      .then((dados) => {
        setOpcoesBruto(dados.campos);
        setRegiaoUFs(dados.regiao_ufs || {});
        setMedianasPorAreaGrau(dados.medianas_por_area_grau || {});
        setMedianaGeral(dados.mediana_geral || {});
        setModeloInfo(dados.modelo || {});
        // valor inicial de UF e área
        const primeiraRegiao = REGIOES[0];
        const ufs = dados.regiao_ufs?.[primeiraRegiao] || [];
        const areas = dados.campos?.NO_CINE_AREA_GERAL || [];
        setForm((f) => ({
          ...f,
          NO_REGIAO: primeiraRegiao,
          SG_UF: ufs[0] || "",
          NO_CINE_AREA_GERAL: areas[0]?.value || "",
        }));
        setIniciando(false);
      })
      .catch(() => {
        setErroGlobal("Não foi possível conectar ao backend. Verifique se está rodando na porta 5000.");
        setIniciando(false);
      });
  }, []);

  function set(campo, valor) {
    setForm((f) => {
      const novo = { ...f, [campo]: valor };

      // Ao trocar Região, resetar UF para a primeira da nova região
      if (campo === "NO_REGIAO") {
        const ufs = regiaoUFs[valor] || [];
        novo.SG_UF = ufs[0] || "";
      }

      // Ao trocar para Presencial, ajusta TP_DIMENSAO automaticamente
      if (campo === "TP_MODALIDADE_ENSINO") {
        novo.TP_DIMENSAO = valor === "1" ? "1" : "2";
      }

      return novo;
    });
    // Limpa erro do campo
    setErros((e) => ({ ...e, [campo]: undefined }));
  }

  // Derivações automáticas
  const rede = CAT_PARA_REDE[form.TP_CATEGORIA_ADMINISTRATIVA] || "Privada";
  const isPrivada = rede === "Privada";
  const isEAD = form.TP_MODALIDADE_ENSINO === "2";

  // Mediana para sliders
  const chaveMediana = `${form.NO_CINE_AREA_GERAL}__${form.TP_GRAU_ACADEMICO}`;
  const med = medianasPorAreaGrau[chaveMediana] || medianaGeral;

  // UFs da região selecionada
  const ufsDaRegiao = regiaoUFs[form.NO_REGIAO] || [];

  // Opções formatadas do backend
  const opcoesCampos = opcoesBruto || {};

  function validarPasso(p) {
    const novosErros = {};
    if (p === 0) {
      if (!form.NO_REGIAO) novosErros.NO_REGIAO = "Selecione uma região.";
      if (!form.SG_UF) novosErros.SG_UF = "Selecione um estado.";
    }
    if (p === 2) {
      if (!form.NO_CINE_AREA_GERAL) novosErros.NO_CINE_AREA_GERAL = "Selecione uma área do curso.";
    }
    if (p === 3) {
      const vg = Number(form.QT_VG_TOTAL);
      const ins = Number(form.QT_INSCRITO_TOTAL);
      const ing = Number(form.QT_ING);
      if (!form.QT_VG_TOTAL || vg <= 0) novosErros.QT_VG_TOTAL = "Informe o número de vagas.";
      if (!form.QT_INSCRITO_TOTAL || ins < 0) novosErros.QT_INSCRITO_TOTAL = "Informe o total de inscritos.";
      if (!form.QT_ING || ing < 0) novosErros.QT_ING = "Informe o número de ingressantes.";
      if (vg > 0 && ing > vg) novosErros.QT_ING = `Ingressantes (${ing}) não pode ser maior que vagas (${vg}).`;
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  function avancar() {
    if (!validarPasso(passo)) return;
    setPasso((p) => p + 1);
  }

  function voltar() {
    setPasso((p) => Math.max(0, p - 1));
    setErros({});
  }

  const enviar = useCallback(async () => {
    if (!validarPasso(3)) return;
    setErroGlobal(null);
    setCarregando(true);

    // Prepara payload: envia tudo exceto TP_REDE (derivado no backend)
    const payload = { ...form };
    if (!isPrivada) {
      payload.IN_COMUNITARIA = "0";
      payload.IN_CONFESSIONAL = "0";
    }

    try {
      const resp = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.erro || "Erro ao calcular a previsão.");
      setResultado(dados);
      setPasso(4);
    } catch (err) {
      setErroGlobal(err.message);
    } finally {
      setCarregando(false);
    }
  }, [form, isPrivada]); // eslint-disable-line

  function testarOutroCenario() {
    setResultado(null);
    setErros({});
    setErroGlobal(null);
    setPasso(0);
  }

  if (iniciando) {
    return (
      <div className="pagina">
        <div className="carregando">
          <div className="spinner" />
          Carregando formulário...
        </div>
      </div>
    );
  }

  return (
    <div className="pagina">
      <header className="header-app">
        <h1>Preditor de Evasão em Cursos Superiores</h1>
        <p className="subtitulo">
          Descreva um curso e veja o risco de evasão estimado por um modelo treinado
          nos microdados do Censo da Educação Superior (INEP, 2023).
        </p>
      </header>

      {/* Stepper — só nos passos do formulário */}
      {passo < 4 && (
        <div className="stepper">
          {PASSOS.map((p, i) => (
            <div
              key={i}
              className={`step-item ${i === passo ? "ativo" : i < passo ? "concluido" : ""}`}
              onClick={() => i < passo && setPasso(i)}
            >
              <span className="step-num">{p.num}</span>
              {p.titulo}
            </div>
          ))}
        </div>
      )}

      {erroGlobal && <div className="mensagem-erro">{erroGlobal}</div>}

      {/* ① Localização */}
      {passo === 0 && (
        <div>
          <div className="card">
            <div className="card-titulo">① Localização</div>

            <div className="campo-grupo">
              <label className="campo-label">Região</label>
              <select value={form.NO_REGIAO} onChange={(e) => set("NO_REGIAO", e.target.value)}>
                {REGIOES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {erros.NO_REGIAO && <span className="campo-erro">{erros.NO_REGIAO}</span>}
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Estado (UF)</label>
              <select value={form.SG_UF} onChange={(e) => set("SG_UF", e.target.value)}>
                {ufsDaRegiao.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
              {erros.SG_UF && <span className="campo-erro">{erros.SG_UF}</span>}
            </div>
          </div>

          <div className="nav-botoes">
            <button className="btn-primary" onClick={avancar}>Próximo →</button>
          </div>
        </div>
      )}

      {/* ② Instituição */}
      {passo === 1 && (
        <div>
          <div className="card">
            <div className="card-titulo">② Instituição</div>

            <div className="campo-grupo">
              <label className="campo-label">Organização acadêmica</label>
              <select
                value={form.TP_ORGANIZACAO_ACADEMICA}
                onChange={(e) => set("TP_ORGANIZACAO_ACADEMICA", e.target.value)}
              >
                {(opcoesCampos.TP_ORGANIZACAO_ACADEMICA || []).map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Categoria administrativa</label>
              <RadioGroup
                opcoes={(opcoesCampos.TP_CATEGORIA_ADMINISTRATIVA || []).filter(
                  (o) => o.value !== "Não informado"
                )}
                valor={form.TP_CATEGORIA_ADMINISTRATIVA}
                onChange={(v) => set("TP_CATEGORIA_ADMINISTRATIVA", v)}
              />
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Rede de ensino</label>
              <div className={`badge-rede ${rede.toLowerCase()}`}>
                {rede === "Pública" ? "🏛️" : "🏢"} {rede}
                <span style={{ fontWeight: 400, fontSize: 12 }}>&nbsp;(derivado da categoria)</span>
              </div>
            </div>

            {/* Progressive disclosure: só aparece se Privada */}
            {isPrivada && (
              <div className="disclosure-enter">
                <div className="campo-grupo">
                  <label className="campo-label">Instituição comunitária?</label>
                  <ToggleSwitch
                    valor={form.IN_COMUNITARIA}
                    onChange={(v) => set("IN_COMUNITARIA", v)}
                  />
                </div>
                <div className="campo-grupo">
                  <label className="campo-label">Instituição confessional?</label>
                  <ToggleSwitch
                    valor={form.IN_CONFESSIONAL}
                    onChange={(v) => set("IN_CONFESSIONAL", v)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="nav-botoes">
            <button className="btn-secondary" onClick={voltar}>← Voltar</button>
            <button className="btn-primary" onClick={avancar}>Próximo →</button>
          </div>
        </div>
      )}

      {/* ③ Curso */}
      {passo === 2 && (
        <div>
          <div className="card">
            <div className="card-titulo">③ Curso</div>

            <div className="campo-grupo">
              <label className="campo-label">Área do curso</label>
              <Autocomplete
                opcoes={(opcoesCampos.NO_CINE_AREA_GERAL || []).filter(
                  (o) => o.value !== "Não informado"
                )}
                valor={form.NO_CINE_AREA_GERAL}
                onChange={(v) => set("NO_CINE_AREA_GERAL", v)}
                placeholder="Digite para buscar..."
              />
              {erros.NO_CINE_AREA_GERAL && (
                <span className="campo-erro">{erros.NO_CINE_AREA_GERAL}</span>
              )}
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Grau acadêmico</label>
              <RadioGroup
                opcoes={(opcoesCampos.TP_GRAU_ACADEMICO || [])
                  .filter((o) => o.value !== "Não informado")
                  .map((o) => ({ value: o.value, label: LABELS_GRAU[o.value] || o.label }))}
                valor={form.TP_GRAU_ACADEMICO}
                onChange={(v) => set("TP_GRAU_ACADEMICO", v)}
              />
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Curso gratuito?</label>
              <ToggleSwitch
                valor={form.IN_GRATUITO}
                onChange={(v) => set("IN_GRATUITO", v)}
              />
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Modalidade de ensino</label>
              <RadioGroup
                opcoes={(opcoesCampos.TP_MODALIDADE_ENSINO || [])
                  .filter((o) => o.value !== "Não informado")
                  .map((o) => ({ value: o.value, label: LABELS_MODALIDADE[o.value] || o.label }))}
                valor={form.TP_MODALIDADE_ENSINO}
                onChange={(v) => set("TP_MODALIDADE_ENSINO", v)}
              />
            </div>

            {/* Dimensão da oferta: aparece só se Presencial, ou informação adaptada para EAD */}
            {!isEAD ? (
              <div className="campo-grupo">
                <label className="campo-label">
                  Dimensão da oferta
                  <span
                    className="tooltip-icon"
                    data-tip="Classificação do INEP que indica o tipo e o escopo geográfico da oferta do curso."
                  >
                    ℹ️
                  </span>
                </label>
                <select
                  value={form.TP_DIMENSAO}
                  onChange={(e) => set("TP_DIMENSAO", e.target.value)}
                >
                  {(opcoesCampos.TP_DIMENSAO || [])
                    .filter((o) => o.value === "1")
                    .concat(
                      (opcoesCampos.TP_DIMENSAO || []).filter((o) => o.value !== "1")
                    )
                    .filter((o) => o.value !== "Não informado" && o.value === "1")
                    .length > 0
                    ? (opcoesCampos.TP_DIMENSAO || []).filter(
                        (o) => o.value !== "Não informado" && o.value === "1"
                      )
                    : (opcoesCampos.TP_DIMENSAO || []).filter(
                        (o) => o.value !== "Não informado"
                      )
                  }
                  {/* Fallback: exibe todas se filtragem acima for vazia */}
                  {(opcoesCampos.TP_DIMENSAO || []).filter(
                    (o) => o.value !== "Não informado"
                  ).map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="campo-grupo">
                <label className="campo-label">
                  Dimensão da oferta
                  <span
                    className="tooltip-icon"
                    data-tip="Para cursos EAD, a dimensão indica se a oferta é registrada por estado ou apenas a nível nacional."
                  >
                    ℹ️
                  </span>
                </label>
                <select
                  value={form.TP_DIMENSAO}
                  onChange={(e) => set("TP_DIMENSAO", e.target.value)}
                >
                  {(opcoesCampos.TP_DIMENSAO || [])
                    .filter((o) => o.value !== "Não informado" && o.value !== "1")
                    .map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <div className="nav-botoes">
            <button className="btn-secondary" onClick={voltar}>← Voltar</button>
            <button className="btn-primary" onClick={avancar}>Próximo →</button>
          </div>
        </div>
      )}

      {/* ④ Porte e Demanda */}
      {passo === 3 && (
        <div>
          <div className="card">
            <div className="card-titulo">④ Porte e Demanda</div>

            <div className="campo-grupo">
              <label className="campo-label">Vagas ofertadas</label>
              <SliderNumerico
                nome="QT_VG_TOTAL"
                valor={form.QT_VG_TOTAL}
                onChange={set}
                max={SLIDER_MAX.QT_VG_TOTAL}
                mediana={med?.QT_VG_TOTAL}
                erro={erros.QT_VG_TOTAL}
              />
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Total de inscritos no processo seletivo</label>
              <SliderNumerico
                nome="QT_INSCRITO_TOTAL"
                valor={form.QT_INSCRITO_TOTAL}
                onChange={set}
                max={SLIDER_MAX.QT_INSCRITO_TOTAL}
                mediana={med?.QT_INSCRITO_TOTAL}
                erro={erros.QT_INSCRITO_TOTAL}
              />
            </div>

            <div className="campo-grupo">
              <label className="campo-label">Ingressantes</label>
              <SliderNumerico
                nome="QT_ING"
                valor={form.QT_ING}
                onChange={set}
                max={SLIDER_MAX.QT_ING}
                mediana={med?.QT_ING}
                erro={erros.QT_ING}
              />
            </div>
          </div>

          <div className="nav-botoes">
            <button className="btn-secondary" onClick={voltar}>← Voltar</button>
            <button className="btn-primary" onClick={enviar} disabled={carregando}>
              {carregando ? "Calculando..." : "Calcular risco de evasão →"}
            </button>
          </div>
        </div>
      )}

      {/* ⑤ Resultado */}
      {passo === 4 && resultado && (
        <div className="resultado-pagina">
          {/* Gauge */}
          <div className="gauge-card">
            <div className="gauge-titulo">Risco de evasão estimado</div>
            <div className="gauge-svg-wrapper">
              <Gauge
                probabilidade={resultado.probabilidade_alto_risco}
                nivel={resultado.nivel_risco}
              />
            </div>
            <div className={`gauge-probabilidade ${resultado.nivel_risco}`}>
              {(resultado.probabilidade_alto_risco * 100).toFixed(1)}%
            </div>
            <div className={`gauge-nivel ${resultado.nivel_risco}`}>
              {resultado.nivel_risco === "baixo" && "🟢 Baixo Risco"}
              {resultado.nivel_risco === "medio" && "🟡 Risco Médio"}
              {resultado.nivel_risco === "alto" && "🔴 Alto Risco"}
            </div>
          </div>

          {/* Benchmark comparativo */}
          {resultado.benchmark && (
            <div className="benchmark-card">
              <div className="bm-titulo">📊 Comparação com a média</div>
              <p className="benchmark-texto">
                Este curso tem probabilidade de alto risco de evasão{" "}
                {Math.abs(resultado.benchmark.diferenca_percentual_pp).toFixed(1)} p.p.{" "}
                <strong className={resultado.benchmark.comparacao}>
                  {resultado.benchmark.comparacao === "acima"
                    ? "acima ↑"
                    : resultado.benchmark.comparacao === "abaixo"
                    ? "abaixo ↓"
                    : "igual"}
                </strong>{" "}
                da {resultado.benchmark.descricao}.{" "}
                <span style={{ color: "var(--texto-suave)", fontSize: 13 }}>
                  (Referência: {(resultado.benchmark.referencia_probabilidade * 100).toFixed(1)}%)
                </span>
              </p>
            </div>
          )}

          {/* Top 5 features */}
          {resultado.top5_importancias?.length > 0 && (
            <div className="top5-card">
              <div className="top5-titulo">🔍 Variáveis com maior peso na predição</div>
              <BarrasTop5 dados={resultado.top5_importancias} />
            </div>
          )}

          {/* Rodapé técnico */}
          <div className="rodape-tecnico">
            <strong>Modelo:</strong> {resultado.modelo?.algoritmo} &nbsp;|&nbsp;
            <strong>ROC-AUC:</strong> {resultado.modelo?.auc?.toFixed(3)} &nbsp;|&nbsp;
            <strong>F1 (alto risco):</strong> {resultado.modelo?.f1_score?.toFixed(3)} &nbsp;|&nbsp;
            <strong>Fonte:</strong> Microdados Censo da Ed. Superior, INEP 2023 &nbsp;|&nbsp;
            {resultado.modelo?.repositorio_url && (
              <a href={resultado.modelo.repositorio_url} target="_blank" rel="noopener noreferrer">
                Repositório GitHub
              </a>
            )}
          </div>

          <div className="nav-botoes">
            <button className="btn-secondary" onClick={testarOutroCenario}>
              🔄 Testar outro cenário
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
