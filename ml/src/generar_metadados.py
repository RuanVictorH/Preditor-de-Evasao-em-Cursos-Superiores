"""
Gera o arquivo ml/models/metadata.json com estatísticas de apoio para o backend e frontend:
- Mapeamento de Região -> UFs
- Medianas nacionais por (Área do curso, Grau acadêmico) e Geral
- Médias de evasão/risco por (Área do curso, Categoria administrativa) e Geral
- Importâncias globais de cada atributo no modelo
- Métricas e nome do modelo
"""

import json
from pathlib import Path
import joblib
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DADOS_PATH = BASE_DIR / "data" / "processed" / "cursos_2023_tratado.csv"
MODELO_PATH = BASE_DIR / "ml" / "models" / "modelo_evasao.joblib"
METADATA_PATH = BASE_DIR / "ml" / "models" / "metadata.json"

ROTULOS_FEATURES = {
    "NO_REGIAO": "Região",
    "SG_UF": "UF",
    "TP_ORGANIZACAO_ACADEMICA": "Organização acadêmica",
    "TP_REDE": "Rede de ensino",
    "TP_CATEGORIA_ADMINISTRATIVA": "Categoria administrativa",
    "IN_COMUNITARIA": "Instituição comunitária",
    "IN_CONFESSIONAL": "Instituição confessional",
    "NO_CINE_AREA_GERAL": "Área do curso",
    "TP_GRAU_ACADEMICO": "Grau acadêmico",
    "IN_GRATUITO": "Gratuidade do curso",
    "TP_MODALIDADE_ENSINO": "Modalidade de ensino",
    "TP_DIMENSAO": "Dimensão da oferta",
    "QT_VG_TOTAL": "Vagas ofertadas",
    "QT_INSCRITO_TOTAL": "Total de inscritos",
    "QT_ING": "Ingressantes",
    "concorrencia": "Concorrência (candidatos/vaga)",
    "taxa_ocupacao_vagas": "Taxa de ocupação das vagas",
}


def gerar_metadados():
    df = pd.read_csv(DADOS_PATH)
    
    # 1. Região -> UFs
    regiao_ufs = {}
    for reg, grp in df.groupby("NO_REGIAO"):
        if pd.notna(reg):
            ufs = sorted([u for u in grp["SG_UF"].dropna().unique() if isinstance(u, str)])
            regiao_ufs[str(reg)] = ufs

    # 2. Medianas nacionais (geral e por área + grau)
    mediana_geral = {
        "QT_VG_TOTAL": int(df["QT_VG_TOTAL"].median()),
        "QT_INSCRITO_TOTAL": int(df["QT_INSCRITO_TOTAL"].median()),
        "QT_ING": int(df["QT_ING"].median()),
    }
    
    medianas_por_area_grau = {}
    for (area, grau), grp in df.groupby(["NO_CINE_AREA_GERAL", "TP_GRAU_ACADEMICO"]):
        if pd.notna(area) and pd.notna(grau):
            key = f"{area}__{grau}"
            medianas_por_area_grau[key] = {
                "QT_VG_TOTAL": int(grp["QT_VG_TOTAL"].median()),
                "QT_INSCRITO_TOTAL": int(grp["QT_INSCRITO_TOTAL"].median()),
                "QT_ING": int(grp["QT_ING"].median()),
            }

    # 3. Médias de evasão/risco para comparações benchmark
    media_geral = {
        "taxa_evasao_media": float(df["taxa_evasao"].mean()),
        "taxa_alto_risco": float(df["alto_risco"].mean()),
    }

    media_por_area_categoria = {}
    for (area, cat), grp in df.groupby(["NO_CINE_AREA_GERAL", "TP_CATEGORIA_ADMINISTRATIVA"]):
        if pd.notna(area) and pd.notna(cat):
            key = f"{area}__{cat}"
            media_por_area_categoria[key] = {
                "taxa_evasao_media": round(float(grp["taxa_evasao"].mean()), 4),
                "taxa_alto_risco": round(float(grp["alto_risco"].mean()), 4),
                "total_cursos": int(len(grp)),
            }

    # 4. Importância das features do modelo
    pipeline = joblib.load(MODELO_PATH)
    prep = pipeline.named_steps["preprocessador"]
    clf = pipeline.named_steps["modelo"]

    cat_cols = prep.transformers_[0][2]
    num_cols = prep.transformers_[1][2]
    cat_names = prep.transformers_[0][1].get_feature_names_out(cat_cols)
    feature_names = list(cat_names) + list(num_cols)
    
    importances = clf.feature_importances_
    feat_imp_series = pd.Series(importances, index=feature_names)

    importancias_agregadas = {}
    for c in cat_cols:
        val = float(feat_imp_series[feat_imp_series.index.str.startswith(c + "_")].sum())
        importancias_agregadas[c] = round(val, 4)
    for c in num_cols:
        val = float(feat_imp_series.get(c, 0.0))
        importancias_agregadas[c] = round(val, 4)

    metadata = {
        "algoritmo": "Random Forest Classifier",
        "auc": 0.729,
        "f1_score": 0.507,
        "repositorio_url": "https://github.com/RuanVictorH/Preditor-de-Evasao-em-Cursos-Superiores",
        "rotulos_features": ROTULOS_FEATURES,
        "regiao_ufs": regiao_ufs,
        "mediana_geral": mediana_geral,
        "medianas_por_area_grau": medianas_por_area_grau,
        "media_geral": media_geral,
        "media_por_area_categoria": media_por_area_categoria,
        "importancias_globais": importancias_agregadas,
    }

    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"Metadados salvos com sucesso em {METADATA_PATH}")


if __name__ == "__main__":
    gerar_metadados()
