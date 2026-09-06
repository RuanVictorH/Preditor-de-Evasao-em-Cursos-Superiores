import json
import sys
from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "ml" / "src"))
from features import CATEGORICAS, NUMERICAS, NUMERICAS_ENTRADA, construir_features  # noqa: E402

MODELO_PATH = BASE_DIR / "ml" / "models" / "modelo_evasao.joblib"
OPCOES_PATH = BASE_DIR / "ml" / "models" / "opcoes.json"
METADATA_PATH = BASE_DIR / "ml" / "models" / "metadata.json"

# Mapeamento TP_CATEGORIA_ADMINISTRATIVA -> TP_REDE
CAT_PARA_REDE = {
    "1": "1", "2": "1", "3": "1",  # Públicas -> Rede Pública
    "4": "2", "5": "2", "6": "2", "7": "2", "8": "2", "9": "2",  # Privadas -> Rede Privada
}

app = Flask(__name__)
CORS(app)

modelo = joblib.load(MODELO_PATH)

with open(OPCOES_PATH, encoding="utf-8") as f:
    opcoes = json.load(f)

with open(METADATA_PATH, encoding="utf-8") as f:
    metadata = json.load(f)

CAMPOS_ENTRADA = [c for c in CATEGORICAS if c != "TP_REDE"] + NUMERICAS_ENTRADA


def _nome_rotulo(col: str) -> str:
    return metadata.get("rotulos_features", {}).get(col, col)


def _calcular_top5_importancias(linha_dict: dict) -> list:
    """Retorna top 5 features com suas importâncias globais e rótulos."""
    imp = metadata.get("importancias_globais", {})
    # Filtra para as features relevantes (excluindo derivadas)
    base_features = [
        "taxa_ocupacao_vagas", "concorrencia",
        "QT_VG_TOTAL", "QT_INSCRITO_TOTAL", "QT_ING",
        "TP_ORGANIZACAO_ACADEMICA", "TP_CATEGORIA_ADMINISTRATIVA",
        "NO_CINE_AREA_GERAL", "TP_GRAU_ACADEMICO", "TP_DIMENSAO",
        "TP_MODALIDADE_ENSINO", "IN_GRATUITO", "SG_UF", "NO_REGIAO",
        "TP_REDE", "IN_COMUNITARIA", "IN_CONFESSIONAL",
    ]
    ordenadas = sorted(
        [(f, imp.get(f, 0)) for f in base_features],
        key=lambda x: x[1],
        reverse=True
    )
    return [
        {"feature": feat, "rotulo": _nome_rotulo(feat), "importancia": round(imp_val, 4)}
        for feat, imp_val in ordenadas[:5]
    ]


def _calcular_benchmark(linha_dict: dict, probabilidade: float) -> dict:
    """Compara a probabilidade prevista com a média para cursos da mesma área/categoria."""
    area = linha_dict.get("NO_CINE_AREA_GERAL", "")
    cat = linha_dict.get("TP_CATEGORIA_ADMINISTRATIVA", "")
    key = f"{area}__{cat}"
    media_grupo = metadata.get("media_por_area_categoria", {}).get(key, {})
    media_geral = metadata.get("media_geral", {}).get("taxa_alto_risco", 0.5)

    if media_grupo:
        ref = media_grupo.get("taxa_alto_risco", media_geral)
        n = media_grupo.get("total_cursos", 0)
        descricao = f"mesma área e categoria administrativa ({n} cursos no dataset)"
    else:
        ref = media_geral
        descricao = "média geral nacional"

    diferenca_pp = round((probabilidade - ref) * 100, 1)
    return {
        "referencia_probabilidade": round(ref, 4),
        "diferenca_percentual_pp": diferenca_pp,
        "descricao": descricao,
        "comparacao": "acima" if diferenca_pp > 0 else ("abaixo" if diferenca_pp < 0 else "igual"),
    }


@app.route("/health")
def health():
    return {"status": "ok"}


@app.route("/opcoes")
def get_opcoes():
    return jsonify({
        "campos": opcoes,
        "regiao_ufs": metadata.get("regiao_ufs", {}),
        "medianas_por_area_grau": metadata.get("medianas_por_area_grau", {}),
        "mediana_geral": metadata.get("mediana_geral", {}),
        "modelo": {
            "algoritmo": metadata.get("algoritmo"),
            "auc": metadata.get("auc"),
            "f1_score": metadata.get("f1_score"),
            "repositorio_url": metadata.get("repositorio_url"),
        },
    })


@app.route("/predict", methods=["POST"])
def predict():
    dados = request.get_json(force=True, silent=True) or {}

    # TP_REDE é derivada automaticamente: não exigir do frontend
    campos_requeridos = [c for c in CATEGORICAS if c not in ("TP_REDE",)] + NUMERICAS_ENTRADA
    faltando = [c for c in campos_requeridos if c not in dados]
    if faltando:
        return jsonify({"erro": f"Campos faltando: {', '.join(faltando)}"}), 400

    linha = {}

    # Derivar TP_REDE automaticamente da categoria administrativa
    cat_adm = str(dados.get("TP_CATEGORIA_ADMINISTRATIVA", ""))
    rede_derivada = CAT_PARA_REDE.get(cat_adm, "2")
    dados["TP_REDE"] = rede_derivada

    # Defaults para comunitária/confessional se for pública
    if rede_derivada == "1":
        dados.setdefault("IN_COMUNITARIA", "0")
        dados.setdefault("IN_CONFESSIONAL", "0")

    for col in CATEGORICAS:
        valor = str(dados.get(col, ""))
        if col not in dados or not valor:
            return jsonify({"erro": f"Campo ausente: {col}"}), 400
        valores_validos = {opt["value"] for opt in opcoes[col]}
        if valor not in valores_validos:
            return jsonify({"erro": f"Valor inválido para {col}: {dados[col]!r}"}), 400
        linha[col] = valor

    for col in NUMERICAS_ENTRADA:
        try:
            linha[col] = float(dados[col])
        except (TypeError, ValueError):
            return jsonify({"erro": f"Valor numérico inválido para {col}: {dados[col]!r}"}), 400

    df = construir_features(pd.DataFrame([linha]))
    probabilidade = float(modelo.predict_proba(df[CATEGORICAS + NUMERICAS])[0, 1])

    # Nível de risco em 3 faixas
    if probabilidade < 0.35:
        nivel = "baixo"
    elif probabilidade < 0.60:
        nivel = "medio"
    else:
        nivel = "alto"

    top5 = _calcular_top5_importancias(linha)
    benchmark = _calcular_benchmark(linha, probabilidade)

    return jsonify({
        "alto_risco": probabilidade >= 0.5,
        "nivel_risco": nivel,
        "probabilidade_alto_risco": round(probabilidade, 4),
        "top5_importancias": top5,
        "benchmark": benchmark,
        "modelo": {
            "algoritmo": metadata.get("algoritmo"),
            "auc": metadata.get("auc"),
            "f1_score": metadata.get("f1_score"),
            "repositorio_url": metadata.get("repositorio_url"),
        },
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
