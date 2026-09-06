# Preditor de Evasão em Cursos Superiores

Projeto de portfólio que usa os microdados do Censo da Educação Superior (INEP) para treinar
um modelo de machine learning que estima o risco de evasão de uma oferta de curso, exposto
como API e consumido por uma interface web onde dá pra simular um curso hipotético e ver o
risco na hora.

## A pergunta

A ideia original era simples: alguém descreve um aluno hipotético e recebe uma previsão de
risco de evasão, treinada em dados reais do ensino superior brasileiro. No meio do caminho,
essa pergunta teve que mudar — e essa mudança é, na prática, o achado mais interessante do
projeto (ver [Os dados](#os-dados) abaixo). A pergunta final ficou: **dado o perfil de uma
oferta de curso — modalidade, categoria administrativa, região, porte, demanda — dá pra
estimar se ela está em alto risco de evasão?**

## Os dados

O plano era usar microdados por aluno do Censo da Educação Superior. Isso não existe mais:
**desde o Censo de 2020, o INEP não publica microdados individuais** — por decisão da própria
Procuradoria Federal junto ao INEP e exigência da ANPD (LGPD), os dados passaram a ser
divulgados agregados por **curso/oferta** (uma linha = um curso de uma IES, geralmente por
polo). O projeto foi reformulado em cima disso: em vez de um aluno, a unidade de análise virou
uma oferta de curso.

O INEP também não fornece uma "taxa de evasão" pronta — foi preciso construir uma a partir do
dicionário de dados. A *Situação do Vínculo do Aluno no Curso* é uma categoria única e
mutuamente exclusiva (Cursando, Matrícula trancada, Desvinculado do curso, Transferência
interna, Formado, Falecido), então:

```
total_vinculos = QT_MAT + QT_SIT_TRANCADA + QT_SIT_DESVINCULADO
                  + QT_SIT_TRANSFERIDO + QT_CONC + QT_SIT_FALECIDO
taxa_evasao     = QT_SIT_DESVINCULADO / total_vinculos
```

É uma foto de um único ano (2023), não um acompanhamento de coorte ao longo do curso inteiro —
uma aproximação transversal da evasão, não uma taxa de evasão real de coorte.

Duas decisões de limpeza vieram dessa definição:

- **Amostra mínima de 10 vínculos por oferta.** Sem isso, uma turma de 2 alunos onde 1 evade
  vira "50% de evasão" — ruído estatístico, não sinal. Cortou o dataset de 671.610 para 171.139
  ofertas de curso (só Graduação).
- **Classificação, não regressão.** Ofertas no quartil superior de `taxa_evasao` foram
  rotuladas como `alto_risco = 1`. Isso já entrega uma classe desbalanceada de forma natural
  (~26% alto risco / ~74% não), sem artificialismo — e permite avaliar por precisão/recall,
  como qualquer problema real de detecção de risco.

Implementação completa em [ml/src/data_prep.py](ml/src/data_prep.py).

## O modelo

Features usadas: perfil da IES (organização acadêmica, rede, categoria administrativa,
comunitária/confessional), perfil do curso (área CINE, grau acadêmico, modalidade, gratuidade)
e porte/demanda (vagas ofertadas, inscritos, ingressantes) — mais duas métricas derivadas
(`concorrencia` = inscritos/vaga, `taxa_ocupacao_vagas` = ingressantes/vaga). Só entraram
variáveis conhecíveis **antes** do desfecho; `QT_MAT`, `QT_CONC` e os `QT_SIT_*` ficaram de
fora por definirem o próprio alvo (vazamento de dado). Ver
[ml/src/features.py](ml/src/features.py).

Três classificadores foram treinados e comparados, todos com `class_weight="balanced"`:

| Modelo               | Precisão (alto risco) | Recall (alto risco) | F1 (alto risco) | ROC-AUC |
|-----------------------|:---:|:---:|:---:|:---:|
| Regressão logística   | 0.38 | 0.68 | 0.49 | 0.699 |
| Árvore de decisão     | 0.40 | 0.67 | 0.50 | 0.711 |
| **Random Forest**     | **0.40** | **0.70** | **0.51** | **0.730** |

Random Forest venceu e foi o modelo salvo. Ver [ml/src/train.py](ml/src/train.py).

## O resultado

O modelo é servido por uma API Flask (`/predict`) e consumido por um formulário React: você
descreve um curso hipotético e recebe o risco estimado (alto/baixo risco + probabilidade). Os
próprios campos e opções do formulário vêm de `/opcoes`, gerado a partir das categorias reais
vistas no treino — o frontend nunca duplica essa lista manualmente, então formulário e modelo
não podem ficar dessincronizados.

**Achados**: as features mais importantes foram o tipo de organização acadêmica da IES
(Universidade vs. Centro Universitário), a quantidade de ingressantes, a taxa de ocupação das
vagas ofertadas e a concorrência (inscritos por vaga) — essas duas últimas foram atributos
criados, não vieram prontas do INEP. Na prática, cursos com baixa procura e vagas ociosas
pesam mais para o risco do que a categoria administrativa isolada.

## Limitações

- **Precisão baixa (40%) apesar do recall razoável (70%)**: o modelo erra bastante pra mais ao
  marcar cursos como "alto risco". Esperado — as features descrevem o *curso*, não o aluno, e
  boa parte da variação que de fato explica evasão (desempenho acadêmico, situação financeira,
  adaptação, vida pessoal) simplesmente não está em dado público agregado.
- **Foto de um ano, não uma coorte**: `taxa_evasao` mistura, no mesmo corte transversal, alunos
  em fases bem diferentes do curso. Uma taxa de evasão de coorte de verdade exigiria
  acompanhar os mesmos alunos ao longo dos anos — dado que não é mais publicado
  individualmente.
- **Unidade de análise é a oferta, não o aluno**: o pitch original (risco por aluno) não é mais
  viável com dado público do INEP desde a mudança de 2020 pela LGPD.

## Estrutura

```
data/
  raw/          # microdados baixados do INEP (não versionado)
  processed/    # dados limpos/tratados (não versionado)
notebooks/      # exploração de dados (EDA)
ml/
  src/          # scripts de preparação de dados, features, opções, treino
  models/       # modelo e opções do formulário serializados (não versionado)
backend/        # API Flask que expõe o modelo
frontend/       # interface React para simular um caso
```

## Como rodar

### 1. Dados

Baixe os microdados do Censo da Educação Superior na página oficial do INEP:

https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior

Escolha um ano (o projeto usa 2023), extraia o `.zip` e copie `MICRODADOS_CADASTRO_CURSOS_AAAA.CSV`
para `data/raw/`. Não existe mais arquivo por aluno — ver [Os dados](#os-dados).

### 2. Ambiente de ML e treino

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r ml/requirements.txt
python ml/src/data_prep.py
python ml/src/train.py
```

Isso gera `data/processed/cursos_2023_tratado.csv`, `ml/models/modelo_evasao.joblib` e
`ml/models/opcoes.json`.

### 3. Backend (API)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m flask --app app run --port 5000
```

- `GET /health` — checagem simples
- `GET /opcoes` — valor/rótulo de cada campo categórico, pro frontend montar os selects
  exatamente com as categorias que o modelo viu no treino
- `POST /predict` — recebe os campos do curso hipotético e devolve
  `{"alto_risco": bool, "probabilidade_alto_risco": float}`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173` e espera a API em `http://localhost:5000` (configurável via
`VITE_API_URL`). Backend e frontend rodam em processos separados, ao mesmo tempo.

## Stack

- **Dados**: microdados do Censo da Educação Superior (INEP)
- **ML**: Python, Pandas, scikit-learn
- **API**: Flask
- **Frontend**: React
- **Empacotamento** (opcional, mais pra frente): Docker

## Roteiro

- [x] Baixar e selecionar um recorte dos microdados do INEP (um ano)
- [x] Limpeza e engenharia de atributos
- [x] Treinar e comparar 2–3 modelos (regressão logística, árvore, random forest)
- [x] Avaliar com métricas adequadas para classe desbalanceada (precisão/recall, não só acurácia)
- [x] Expor o modelo numa API Flask
- [x] Interface em React para simular um caso e ver o risco
- [x] README final contando a jornada: pergunta, dados, modelo, resultado, limitações
