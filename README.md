# Preditor de Evasão em Cursos Superiores

Projeto de portfólio que usa os microdados do Censo da Educação Superior (INEP) para treinar
um modelo de machine learning que estima o risco de evasão de uma oferta de curso, exposto
como API e consumido por uma interface web simples.

## Objetivo

Sair do notebook e entregar um produto funcionando: alguém preenche um formulário descrevendo
um curso hipotético (modalidade, turno, categoria administrativa, região etc.) e recebe uma
previsão de risco de evasão, com o modelo por trás treinado em dados públicos reais.

## Sobre a granularidade dos dados (decisão importante)

O pitch original do projeto previa prever a evasão de um *aluno* individual. Isso não é mais
possível com dado público: **desde o Censo de 2020, o INEP não publica mais microdados por
aluno** — por decisão da própria Procuradoria Federal junto ao INEP e exigência da ANPD (LGPD),
os microdados passaram a ser divulgados agregados por **curso/oferta** (uma linha = um curso de
uma IES, geralmente por polo). Por isso o projeto foi reformulado: o modelo prevê o risco de
evasão de uma **oferta de curso**, não de um estudante específico.

### Definição da variável-alvo

O INEP não fornece uma "taxa de evasão" pronta. Ela foi construída a partir do dicionário de
dados: a *Situação do Vínculo do Aluno no Curso* é uma categoria única e mutuamente exclusiva
(Cursando, Matrícula trancada, Desvinculado do curso, Transferência interna, Formado, Falecido).
Logo:

```
total_vinculos = QT_MAT + QT_SIT_TRANCADA + QT_SIT_DESVINCULADO
                  + QT_SIT_TRANSFERIDO + QT_CONC + QT_SIT_FALECIDO
taxa_evasao     = QT_SIT_DESVINCULADO / total_vinculos
```

É uma foto de um único ano (2023), não um acompanhamento de coorte ao longo do curso inteiro —
uma aproximação transversal da evasão, documentada como limitação do projeto.

Para virar um problema de classificação (como o roteiro original pedia), ofertas no quartil
superior de `taxa_evasao` são rotuladas como `alto_risco = 1`. Isso já entrega uma classe
desbalanceada de forma natural (~26% alto risco / ~74% não), sem artificialismo.

Ofertas com menos de 10 vínculos totais são descartadas antes de calcular o alvo — sem esse
filtro, uma turma de 2 alunos onde 1 evade vira "50% de evasão", o que é ruído estatístico, não
sinal. Ver [ml/src/data_prep.py](ml/src/data_prep.py) para a implementação completa.

## Stack

- **Dados**: microdados do Censo da Educação Superior (INEP)
- **ML**: Python, Pandas, scikit-learn
- **API**: Flask
- **Frontend**: React
- **Empacotamento** (opcional, mais pra frente): Docker

## Estrutura

```
data/
  raw/          # microdados baixados do INEP (não versionado)
  processed/    # dados limpos/tratados (não versionado)
notebooks/      # exploração de dados (EDA)
ml/
  src/          # scripts de preparação de dados, features, treino e avaliação
  models/       # modelos treinados serializados (não versionado)
backend/        # API Flask que expõe o modelo
frontend/       # interface React para simular um caso
```

## Roteiro

- [x] Baixar e selecionar um recorte dos microdados do INEP (um ano)
- [x] Limpeza e engenharia de atributos
- [x] Treinar e comparar 2–3 modelos (regressão logística, árvore, random forest)
- [x] Avaliar com métricas adequadas para classe desbalanceada (precisão/recall, não só acurácia)
- [x] Expor o modelo numa API Flask
- [x] Interface em React para simular um caso e ver o risco
- [ ] README final contando a jornada: pergunta, dados, modelo, resultado, limitações

## API

Depois de treinar o modelo (`python ml/src/train.py`, gera `ml/models/modelo_evasao.joblib`
e `ml/models/opcoes.json`), suba a API:

```bash
cd backend
.venv\Scripts\activate
python -m flask --app app run --port 5000
```

- `GET /health` — checagem simples
- `GET /opcoes` — valor/rótulo de cada campo categórico, pro frontend montar os selects
  exatamente com as categorias que o modelo viu no treino
- `POST /predict` — recebe os campos do curso hipotético e devolve
  `{"alto_risco": bool, "probabilidade_alto_risco": float}`

## Modelo

Três classificadores foram treinados sobre as mesmas features (perfil da IES/curso + porte de
vagas/demanda) para prever `alto_risco` (quartil superior de `taxa_evasao`), com
`class_weight="balanced"` pra lidar com o desbalanceamento:

| Modelo               | Precisão (alto risco) | Recall (alto risco) | F1 (alto risco) | ROC-AUC |
|-----------------------|:---:|:---:|:---:|:---:|
| Regressão logística   | 0.38 | 0.68 | 0.49 | 0.699 |
| Árvore de decisão     | 0.40 | 0.67 | 0.50 | 0.711 |
| **Random Forest**     | **0.40** | **0.70** | **0.51** | **0.730** |

Random Forest venceu e foi o modelo salvo (`ml/models/modelo_evasao.joblib`, gerado localmente,
não versionado — rode `python ml/src/train.py` pra reproduzir).

**Achados**: as features mais importantes foram o tipo de organização acadêmica da IES
(Universidade vs. Centro Universitário), a quantidade de ingressantes, a taxa de ocupação das
vagas ofertadas e a concorrência (inscritos por vaga) — essas duas últimas foram atributos
criados, não vieram prontas do INEP.

**Limitações**: recall razoável (70%) mas precisão baixa (40%) — o modelo erra bastante pra
mais ao marcar cursos como "alto risco". Isso é esperado: as features disponíveis descrevem o
*curso*, não o aluno, então boa parte da variação individual que de fato explica evasão
(desempenho acadêmico, situação financeira, adaptação) não está nos dados públicos disponíveis.

## Dados

Baixe os microdados do Censo da Educação Superior na página oficial do INEP:

https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior

Escolha um ano (o projeto usa 2023), extraia o `.zip` e copie `MICRODADOS_CADASTRO_CURSOS_AAAA.CSV`
para `data/raw/`. Não existe mais arquivo por aluno — ver a seção acima sobre granularidade.

## Setup

### Ambiente de dados/ML

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r ml/requirements.txt
```

### Backend (API)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173` e espera a API em `http://localhost:5000` (configurável via
`VITE_API_URL`). Backend e frontend rodam em processos separados, ao mesmo tempo.
