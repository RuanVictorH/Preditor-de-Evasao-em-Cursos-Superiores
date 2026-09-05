# Preditor de Evasão em Cursos Superiores

Projeto de portfólio que usa os microdados do Censo da Educação Superior (INEP) para treinar
um modelo de machine learning que estima o risco de evasão de um estudante, exposto como API
e consumido por uma interface web simples.

## Objetivo

Sair do notebook e entregar um produto funcionando: alguém preenche um formulário com dados
de um aluno hipotético e recebe uma previsão de risco de evasão, com o modelo por trás treinado
em dados públicos reais.

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

- [ ] Baixar e selecionar um recorte dos microdados do INEP (um ano)
- [ ] Limpeza e engenharia de atributos
- [ ] Treinar e comparar 2–3 modelos (regressão logística, árvore, random forest)
- [ ] Avaliar com métricas adequadas para classe desbalanceada (precisão/recall, não só acurácia)
- [ ] Expor o modelo numa API Flask
- [ ] Interface em React para simular um caso e ver o risco
- [ ] README final contando a jornada: pergunta, dados, modelo, resultado, limitações

## Dados

Baixe os microdados do Censo da Educação Superior na página oficial do INEP:

https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-da-educacao-superior

Escolha um ano recente (2023 ou 2024), extraia o `.zip` e copie os arquivos CSV de interesse
(principalmente o de alunos/situação de matrícula) para `data/raw/`. Os arquivos são grandes
(vários GB no total) — não serão versionados no git.

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
npm create vite@latest . -- --template react
npm install
```
