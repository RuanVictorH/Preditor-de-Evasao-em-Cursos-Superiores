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

app = Flask(__name__)
CORS(app)

modelo = joblib.load(MODELO_PATH)
with open(OPCOES_PATH, encoding="utf-8") as f:
    opcoes = json.load(f)

CAMPOS_ENTRADA = CATEGORICAS + NUMERICAS_ENTRADA


@app.route("/health")
def health():
    return {"status": "ok"}


@app.route("/opcoes")
def get_opcoes():
    return jsonify(opcoes)


@app.route("/predict", methods=["POST"])
def predict():
    dados = request.get_json(force=True, silent=True) or {}

    faltando = [c for c in CAMPOS_ENTRADA if c not in dados]
    if faltando:
        return jsonify({"erro": f"Campos faltando: {', '.join(faltando)}"}), 400

    linha = {}
    for col in CATEGORICAS:
        valor = str(dados[col])
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

    return jsonify({
        "alto_risco": probabilidade >= 0.5,
        "probabilidade_alto_risco": round(probabilidade, 4),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
