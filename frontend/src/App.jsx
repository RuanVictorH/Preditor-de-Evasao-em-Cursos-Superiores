import { useEffect, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ROTULOS = {
  NO_REGIAO: "Região",
  SG_UF: "UF",
  TP_ORGANIZACAO_ACADEMICA: "Organização acadêmica da instituição",
  TP_REDE: "Rede",
  TP_CATEGORIA_ADMINISTRATIVA: "Categoria administrativa",
  IN_COMUNITARIA: "Instituição comunitária?",
  IN_CONFESSIONAL: "Instituição confessional?",
  NO_CINE_AREA_GERAL: "Área do curso",
  TP_GRAU_ACADEMICO: "Grau acadêmico",
  IN_GRATUITO: "Curso gratuito?",
  TP_MODALIDADE_ENSINO: "Modalidade",
  TP_DIMENSAO: "Dimensão da oferta",
};

const GRUPOS = [
  { titulo: "Localização", campos: ["NO_REGIAO", "SG_UF"] },
  {
    titulo: "Instituição",
    campos: [
      "TP_ORGANIZACAO_ACADEMICA",
      "TP_REDE",
      "TP_CATEGORIA_ADMINISTRATIVA",
      "IN_COMUNITARIA",
      "IN_CONFESSIONAL",
    ],
  },
  {
    titulo: "Curso",
    campos: [
      "NO_CINE_AREA_GERAL",
      "TP_GRAU_ACADEMICO",
      "IN_GRATUITO",
      "TP_MODALIDADE_ENSINO",
      "TP_DIMENSAO",
    ],
  },
];

const CAMPOS_NUMERICOS = [
  { nome: "QT_VG_TOTAL", rotulo: "Vagas ofertadas" },
  { nome: "QT_INSCRITO_TOTAL", rotulo: "Total de inscritos no processo seletivo" },
  { nome: "QT_ING", rotulo: "Ingressantes" },
];

function App() {
  const [opcoes, setOpcoes] = useState(null);
  const [form, setForm] = useState({});
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/opcoes`)
      .then((r) => r.json())
      .then((dados) => {
        setOpcoes(dados);
        const inicial = {};
        for (const campo of Object.keys(dados)) {
          inicial[campo] = dados[campo][0]?.value ?? "";
        }
        for (const { nome } of CAMPOS_NUMERICOS) inicial[nome] = "";
        setForm(inicial);
      })
      .catch(() => setErro("Não foi possível carregar o formulário. O backend está rodando?"));
  }, []);

  function atualizarCampo(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviar(e) {
    e.preventDefault();
    setErro(null);
    setResultado(null);
    setCarregando(true);
    try {
      const resp = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const dados = await resp.json();
      if (!resp.ok) throw new Error(dados.erro || "Erro ao calcular a previsão.");
      setResultado(dados);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  if (erro && !opcoes) {
    return (
      <div className="pagina">
        <p className="erro">{erro}</p>
      </div>
    );
  }

  if (!opcoes) {
    return (
      <div className="pagina">
        <p>Carregando formulário...</p>
      </div>
    );
  }

  return (
    <div className="pagina">
      <header>
        <h1>Preditor de Evasão em Cursos Superiores</h1>
        <p className="subtitulo">
          Descreva um curso hipotético e veja o risco de evasão estimado por um modelo treinado
          nos microdados do Censo da Educação Superior (INEP, 2023).
        </p>
      </header>

      <form onSubmit={enviar} className="formulario">
        {GRUPOS.map(({ titulo, campos }) => (
          <fieldset key={titulo}>
            <legend>{titulo}</legend>
            {campos.map((campo) => (
              <label key={campo}>
                {ROTULOS[campo]}
                <select
                  value={form[campo] ?? ""}
                  onChange={(e) => atualizarCampo(campo, e.target.value)}
                >
                  {opcoes[campo].map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </fieldset>
        ))}

        <fieldset>
          <legend>Porte e demanda</legend>
          {CAMPOS_NUMERICOS.map(({ nome, rotulo }) => (
            <label key={nome}>
              {rotulo}
              <input
                type="number"
                min="0"
                required
                value={form[nome] ?? ""}
                onChange={(e) => atualizarCampo(nome, e.target.value)}
              />
            </label>
          ))}
        </fieldset>

        <button type="submit" disabled={carregando}>
          {carregando ? "Calculando..." : "Calcular risco de evasão"}
        </button>
      </form>

      {erro && <p className="erro">{erro}</p>}

      {resultado && (
        <div className={`resultado ${resultado.alto_risco ? "alto" : "baixo"}`}>
          <h2>{resultado.alto_risco ? "Alto risco de evasão" : "Baixo risco de evasão"}</h2>
          <p>
            Probabilidade estimada: <strong>{(resultado.probabilidade_alto_risco * 100).toFixed(1)}%</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
