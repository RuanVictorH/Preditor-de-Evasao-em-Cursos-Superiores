"""
Engenharia de atributos para o preditor de risco de evasão de ofertas de curso.

Só entram features conhecíveis ANTES do desfecho (perfil do curso, vagas, demanda).
QT_MAT, QT_CONC e QT_SIT_* ficam de fora por definirem o próprio alvo (vazamento de dado).
"""

import pandas as pd

CATEGORICAS = [
    "NO_REGIAO", "SG_UF", "TP_ORGANIZACAO_ACADEMICA", "TP_REDE",
    "TP_CATEGORIA_ADMINISTRATIVA", "IN_COMUNITARIA", "IN_CONFESSIONAL",
    "NO_CINE_AREA_GERAL", "TP_GRAU_ACADEMICO", "IN_GRATUITO",
    "TP_MODALIDADE_ENSINO", "TP_DIMENSAO",
]

# campos brutos que o formulário pede; concorrencia/taxa_ocupacao_vagas são derivados deles
NUMERICAS_ENTRADA = ["QT_VG_TOTAL", "QT_INSCRITO_TOTAL", "QT_ING"]
NUMERICAS = NUMERICAS_ENTRADA + ["concorrencia", "taxa_ocupacao_vagas"]

ALVO = "alto_risco"


def construir_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # candidatos por vaga: proxy de seletividade/demanda pelo curso
    df["concorrencia"] = df["QT_INSCRITO_TOTAL"] / df["QT_VG_TOTAL"].replace(0, pd.NA)
    df["concorrencia"] = df["concorrencia"].fillna(0)

    # % das vagas ofertadas que de fato foram preenchidas por ingressantes
    df["taxa_ocupacao_vagas"] = df["QT_ING"] / df["QT_VG_TOTAL"].replace(0, pd.NA)
    df["taxa_ocupacao_vagas"] = df["taxa_ocupacao_vagas"].fillna(0)

    for col in CATEGORICAS:
        df[col] = df[col].astype("object").fillna("Não informado").astype(str)

    return df


def dividir_x_y(df: pd.DataFrame):
    df = construir_features(df)
    X = df[CATEGORICAS + NUMERICAS]
    y = df[ALVO]
    return X, y
