"""
Treina e compara 3 modelos de classificação para o risco de evasão de ofertas de curso,
e salva o melhor (por F1 da classe minoritária "alto_risco") pronto pra API consumir.
"""

import json
import sys

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

from features import CATEGORICAS, NUMERICAS, dividir_x_y
from opcoes import gerar_opcoes

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

DADOS_PATH = "data/processed/cursos_2023_tratado.csv"
MODELO_PATH = "ml/models/modelo_evasao.joblib"
OPCOES_PATH = "ml/models/opcoes.json"


def montar_preprocessador():
    return ColumnTransformer([
        ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAS),
        ("num", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]), NUMERICAS),
    ])


def montar_modelos():
    return {
        "regressao_logistica": LogisticRegression(class_weight="balanced", max_iter=1000),
        "arvore_decisao": DecisionTreeClassifier(class_weight="balanced", max_depth=8, random_state=42),
        "random_forest": RandomForestClassifier(
            class_weight="balanced", n_estimators=300, max_depth=12, random_state=42, n_jobs=-1
        ),
    }


def avaliar(nome, pipeline, X_test, y_test):
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    print(f"\n=== {nome} ===")
    print(classification_report(y_test, y_pred, target_names=["baixo_risco", "alto_risco"]))
    auc = roc_auc_score(y_test, y_proba)
    print(f"ROC-AUC: {auc:.3f}")

    report = classification_report(
        y_test, y_pred, target_names=["baixo_risco", "alto_risco"], output_dict=True
    )
    return report["alto_risco"]["f1-score"], auc


def main():
    df = pd.read_csv(DADOS_PATH)
    X, y = dividir_x_y(df)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    melhor_nome, melhor_pipeline, melhor_f1 = None, None, -1

    for nome, modelo in montar_modelos().items():
        pipeline = Pipeline([
            ("preprocessador", montar_preprocessador()),
            ("modelo", modelo),
        ])
        pipeline.fit(X_train, y_train)
        f1_alto_risco, _ = avaliar(nome, pipeline, X_test, y_test)

        if f1_alto_risco > melhor_f1:
            melhor_nome, melhor_pipeline, melhor_f1 = nome, pipeline, f1_alto_risco

    print(f"\nMelhor modelo (F1 da classe alto_risco): {melhor_nome} ({melhor_f1:.3f})")
    joblib.dump(melhor_pipeline, MODELO_PATH)
    print(f"Salvo em {MODELO_PATH}")

    with open(OPCOES_PATH, "w", encoding="utf-8") as f:
        json.dump(gerar_opcoes(X), f, ensure_ascii=False, indent=2)
    print(f"Opções do formulário salvas em {OPCOES_PATH}")


if __name__ == "__main__":
    main()
