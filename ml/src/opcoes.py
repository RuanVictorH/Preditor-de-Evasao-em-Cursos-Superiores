"""
Gera as opções de formulário (valor/rótulo) pras variáveis categóricas do modelo, a partir
dos próprios códigos do dicionário de dados do INEP. Usado pelo backend pra alimentar o
formulário do frontend, garantindo que os valores batem exatamente com o que o modelo viu
no treino.
"""

from features import CATEGORICAS

LABELS_POR_CODIGO = {
    "TP_ORGANIZACAO_ACADEMICA": {
        1: "Universidade",
        2: "Centro Universitário",
        3: "Faculdade",
        4: "Instituto Federal de Educação, Ciência e Tecnologia",
        5: "Centro Federal de Educação Tecnológica",
    },
    "TP_REDE": {1: "Pública", 2: "Privada"},
    "TP_CATEGORIA_ADMINISTRATIVA": {
        1: "Pública Federal",
        2: "Pública Estadual",
        3: "Pública Municipal",
        4: "Privada com fins lucrativos",
        5: "Privada sem fins lucrativos",
        6: "Privada - Particular em sentido estrito",
        7: "Especial",
        8: "Privada comunitária",
        9: "Privada confessional",
    },
    "IN_COMUNITARIA": {0: "Não", 1: "Sim"},
    "IN_CONFESSIONAL": {0: "Não", 1: "Sim"},
    "TP_GRAU_ACADEMICO": {
        1: "Bacharelado",
        2: "Licenciatura",
        3: "Tecnológico",
        4: "Bacharelado e Licenciatura",
    },
    "IN_GRATUITO": {0: "Não", 1: "Sim"},
    "TP_MODALIDADE_ENSINO": {1: "Presencial", 2: "Curso a distância (EAD)"},
    "TP_DIMENSAO": {
        1: "Curso presencial ofertado no Brasil",
        2: "Curso a distância ofertado no Brasil",
        3: "Curso a distância com dimensão de dados somente a nível Brasil",
        4: "Curso a distância ofertado por instituição brasileira no exterior",
    },
}


def gerar_opcoes(X):
    """X já deve ter passado por construir_features (colunas categóricas como string)."""
    opcoes = {}
    for col in CATEGORICAS:
        valores = sorted(X[col].unique())
        mapa = LABELS_POR_CODIGO.get(col)
        if mapa:
            lista = []
            vistos = set()
            for v in valores:
                if v == "Não informado":
                    lista.append({"value": v, "label": "Não informado"})
                else:
                    codigo = int(float(v))
                    valor_norm = str(codigo)  # normaliza "1.0" -> "1"
                    if valor_norm not in vistos:
                        vistos.add(valor_norm)
                        lista.append({"value": valor_norm, "label": mapa.get(codigo, v)})
        else:
            lista = [{"value": v, "label": v} for v in valores]
        opcoes[col] = lista
    return opcoes
