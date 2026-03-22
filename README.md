# ⚽ BetSave - Assistente de Apostas Esportivas

Assistente digital que analisa jogos de futebol usando dados reais da API BetsAPI, gerando previsões, probabilidades e recomendações.

![BetSave](https://img.shields.io/badge/Status-Em%20Desenvolvimento-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🎯 Funcionalidades

- **📺 Jogos Ao Vivo** - Acompanhe partidas acontecendo agora
- **📅 Jogos Futuros** - Veja jogos programados por data
- **🇧🇷 Jogos do Brasil** - Filtro especial para partidas brasileiras
- **📊 Estatísticas** - Comparação detalhada de times e jogadores
- **🎯 Previsões** - Probabilidades de escanteios, cartões e faltas
- **📈 Análise de Risco** - Classificação Alto/Médio/Baixo
- **💡 Insights** - Explicações das recomendações

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Token da BetsAPI (obtenha em https://betsapi.com)

### Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd EdScript

# Instale as dependências
npm install

# Configure o token da API
# Edite o arquivo: code/server/server.js
# Linha 8: const API_TOKEN = 'SEU_TOKEN_AQUI';
```

### Execução

```bash
# Opção 1: Script Windows
start.bat

# Opção 2: Manual
cd code/server
node server.js
```

### Acesse
- **Dashboard principal**: http://localhost:3000
- **Jogos do Brasil**: http://localhost:3000/brazil

## 📁 Estrutura do Projeto

```
EdScript/
├── code/                    # Código fonte principal
│   ├── server/             # Servidor Node.js
│   │   └── server.js       # API + Backend
│   ├── api/                # Cliente BetsAPI
│   │   ├── api_client.js
│   │   └── access_api.js
│   ├── engine/             # Motor de análise
│   │   └── real_analysis.js
│   └── utils/             # Utilitários
│       ├── data_loader.js
│       └── mock_data.js
│
├── dashboard/              # Frontend
│   ├── dashboard.html      # Dashboard principal
│   └── brazil.html         # Página jogos do Brasil
│
├── workflow/               # Automação n8n
│   └── n8n_workflow.json
│
├── tests/                  # Testes
│   └── test_analysis.js
│
├── docs/                   # Documentação
│   └── documentacao/
│
├── data/                   # Dados (não versionado)
│   ├── players_stats/      # Dataset Kaggle
│   └── statsbomb/         # Dataset StatsBomb
│
├── package.json
├── start.bat               # Script iniciar
├── README.md
└── .gitignore
```

## 🔌 API Endpoints

| Endpoint | Descrição |
|----------|-----------|
| `GET /` | Dashboard principal |
| `GET /brazil` | Página jogos do Brasil |
| `GET /api/live` | Jogos ao vivo |
| `GET /api/matches` | Jogos futuros |
| `GET /api/brazil` | Jogos brasileiros |
| `GET /api/analyze?home=X&away=Y` | Análise completa |
| `GET /api/teams` | Lista de times |
| `GET /api/health` | Status do servidor |

## 📈 Classificação de Risco

| Risco | Probabilidade | Recomendação |
|-------|--------------|--------------|
| 🔴 Alto | 0% - 40% | Evitar aposta |
| 🟡 Médio | 41% - 70% | Apostar com cautela |
| 🟢 Baixo | 71% - 100% | Boa oportunidade |

## 🔧 Configuração

### Variáveis de Ambiente

1. Copie o arquivo de exemplo:
```bash
cp env.example .env
```

2. Edite o `.env` com suas credenciais:
```env
API_TOKEN=seu_token_da_betsapi
PORT=3000
```

3. Obtendo o token:
   - Cadastre-se em https://betsapi.com
   - Vá em "My Account" > "API Token"
   - Cole o token no arquivo `.env`

### Datasets

Os datasets são carregados automaticamente:
- **Players Stats 2025-2026**: 2.148 jogadores
- **StatsBomb**: Competições e eventos históricos

## 📝 API BetsAPI

Este projeto usa a API BetsAPI. Para usar:

1. Cadastre-se em https://betsapi.com
2. Obtenha seu token
3. Cole o token no arquivo `code/server/server.js` linha 8

**Endpoints usados:**
- `/v1/events/inplay` - Jogos ao vivo
- `/v1/events/upcoming` - Jogos futuros
- `/v2/event/odds` - Odds e estatísticas

## 👥 Equipe

**Hackathon EdScript - Esporte da Sorte**

## 📄 Licença

MIT License - sinta-se livre para usar e modificar.

---

⭐ Se este projeto foi útil, deixe uma estrela!
