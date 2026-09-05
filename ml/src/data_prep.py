"""
Prepara os microdados do Censo da Educação Superior 2023 (INEP) para modelagem.

Contexto importante: desde 2020, o INEP não publica mais microdados por aluno (LGPD).
O que temos é um registro por "oferta de curso" (curso x IES x polo/local), com contagens
agregadas de matrícula, conclusão e situação de vínculo. O projeto foi reformulado para
prever o RISCO DE EVASÃO DE UMA OFERTA DE CURSO, não de um aluno individual.

Definição da taxa de evasão (não fornecida pronta pelo INEP, construída a partir do
dicionário de dados): a "Situação do Vínculo do Aluno no Curso" é uma categoria única e
mutuamente exclusiva (Cursando, Matrícula trancada, Desvinculado do curso, Transferência
interna, Formado, Falecido). Então:

    total_vinculos = QT_MAT + QT_SIT_TRANCADA + QT_SIT_DESVINCULADO
                      + QT_SIT_TRANSFERIDO + QT_CONC + QT_SIT_FALECIDO
    taxa_evasao     = QT_SIT_DESVINCULADO / total_vinculos

Isso é uma foto de um único ano (não acompanha coorte ao longo do curso todo), então é uma
aproximação transversal da evasão, não uma taxa de evasão de coorte.
"""

import sys

import pandas as pd

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

RAW_PATH = "data/raw/MICRODADOS_CADASTRO_CURSOS_2023.CSV"
OUT_PATH = "data/processed/cursos_2023_tratado.csv"

# Amostra mínima de vínculos para considerar a taxa de evasão de uma oferta confiável
# (evita que uma turma de 2 alunos vire "50% de evasão" por causa de 1 aluno).
MIN_VINCULOS = 10

COLUNAS = [
    # identificação (não entram como feature)
    "CO_IES", "CO_CURSO", "NO_CURSO",
    # geografia e perfil da IES
    "NO_REGIAO", "SG_UF", "TP_ORGANIZACAO_ACADEMICA", "TP_REDE",
    "TP_CATEGORIA_ADMINISTRATIVA", "IN_COMUNITARIA", "IN_CONFESSIONAL",
    # perfil do curso
    "NO_CINE_AREA_GERAL", "TP_GRAU_ACADEMICO", "IN_GRATUITO",
    "TP_MODALIDADE_ENSINO", "TP_NIVEL_ACADEMICO", "TP_DIMENSAO",
    # porte/demanda, conhecidos antes do desfecho (não vazam o alvo)
    "QT_VG_TOTAL", "QT_INSCRITO_TOTAL", "QT_ING",
    # componentes do alvo
    "QT_MAT", "QT_CONC", "QT_SIT_TRANCADA", "QT_SIT_DESVINCULADO",
    "QT_SIT_TRANSFERIDO", "QT_SIT_FALECIDO",
]


def carregar_bruto():
    return pd.read_csv(RAW_PATH, sep=";", encoding="latin1", usecols=COLUNAS, low_memory=False)


def construir_alvo(df):
    df = df.copy()
    df["total_vinculos"] = (
        df["QT_MAT"] + df["QT_SIT_TRANCADA"] + df["QT_SIT_DESVINCULADO"]
        + df["QT_SIT_TRANSFERIDO"] + df["QT_CONC"] + df["QT_SIT_FALECIDO"]
    )
    df["taxa_evasao"] = df["QT_SIT_DESVINCULADO"] / df["total_vinculos"]
    return df


def main():
    df = carregar_bruto()
    print(f"Linhas brutas: {len(df):,}")

    df = df[df["TP_NIVEL_ACADEMICO"] == 1]  # só Graduação (exclui sequencial)
    print(f"Após filtrar só Graduação: {len(df):,}")

    df = construir_alvo(df)
    df = df[df["total_vinculos"] >= MIN_VINCULOS]
    print(f"Após filtrar ofertas com menos de {MIN_VINCULOS} vínculos: {len(df):,}")

    limiar = df["taxa_evasao"].quantile(0.75)
    df["alto_risco"] = (df["taxa_evasao"] >= limiar).astype(int)

    print(f"Limiar de alto risco (percentil 75): {limiar:.1%}")
    print(f"Taxa de evasão - média: {df['taxa_evasao'].mean():.1%}, mediana: {df['taxa_evasao'].median():.1%}")
    print("Balanço de classes (alto_risco):")
    print(df["alto_risco"].value_counts(normalize=True))

    df.to_csv(OUT_PATH, index=False)
    print(f"Salvo em {OUT_PATH}")


if __name__ == "__main__":
    main()
