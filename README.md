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
