# BetSave-EDScript - Documentação do Desenvolvimento

## Processo de Construção (25/03/2026)

Este documento descreve como o projeto BetSave-EDScript foi desenvolvido, documentando cada etapa do processo de codificação para referência futura.

---

## 1. Estrutura de Dados

### 1.1 Pasta `data/`

A pasta de dados foi organizada da seguinte forma:

```
data/
├── players_stats/
│   ├── players_data-2025_2026.csv      # Estatísticas completas de jogadores
│   └── players_data_light-2025_2026.csv
└── statsbomb/
    └── data/
        ├── competitions.json          # Competições e temporadas
        ├── events/                     # Eventos de cada partida
        ├── matches/                    # Partidas por competição
        ├── lineups/                    # Escalações
        └── three-sixty/                # Dados espaciais 360
```

### 1.2 Downloads Realizados

**Players Stats:**
- Dataset: Football Players Stats 2025-2026
- Fonte: Kaggle
- 2718 jogadores carregados
- 96 times únicos
- 5 ligas principais

**StatsBomb Data:**
- Dataset: StatsBomb Football Data
- Fonte: GitHub (open-data)
- 3464 jogos carregados
- Competições internacionais

---

## 2. Módulos Criados

### 2.1 `data_loader.js` - Carregador Central

**Propósito:** Carregar e processar dados dos datasets.

**Funcionalidades:**
- Parse de CSV com suporte a aspas
- Cache de dados em memória
- Busca por jogador e time
- Carregamento de matches StatsBomb

**Estrutura do jogador processado:**
```javascript
{
    id, name, nation, position, team, league, age,
    goals, assists, matches, minutes,
    yellowCards, redCards, shots, shotsOnTarget,
    tackles, interceptions, fouls, crosses, etc.
}
```

### 2.2 `player_analysis.js` - Análise de Jogadores

**Propósito:** Analisar desempenho individual de jogadores.

**Funcionalidades:**

1. **Performance Score (0-100)**
   - Calculado com base em gols, assistências e minutos jogados
   - Peso maior para finalizações

2. **Rankings**
   - Posição no time (por gols)
   - Posição na liga (por gols)

3. **Recomendações**
   - Risco calculado (Baixo/Médio/Alto)
   - Odds estimada
   - Recomendação de aposta

**Exemplo de uso:**
```bash
node player_analysis.js Haaland
```

**Output:**
```
══════════════════════════════════════
⚽ ANÁLISE DE JOGADOR
══════════════════════════════════════

👤 Erling Haaland
🏠 Manchester City | eng Premier League
📍 FW | 25 anos

──────────────────────────────────────
📊 DESEMPENHO
──────────────────────────────────────
Gols: 22 | Assistências: 7
Partidas: 29 | Minutos: 2413
Gols/Jogo: 0.76 | Assists/Jogo: 0.24

──────────────────────────────────────
🏆 RANKINGS
──────────────────────────────────────
No time: 1º de 27
Na liga: 1º de 535
Score: 76/100

──────────────────────────────────────
🎯 APOSTA
──────────────────────────────────────
🟡 Risco: MEDIO (68%)
📈 Odds estimada: 1.47
💡 Recomendação: APOSTA SEGURA
```

### 2.3 `head_to_head.js` - Confrontos Diretos

**Propósito:** Analisar histórico de confrontos entre dois times.

**Funcionalidades:**

1. **Histórico de Jogos**
   - Busca em StatsBomb matches
   - Ordenado por data (mais recente primeiro)
   - Últimos 10 jogos

2. **Estatísticas H2H**
   - Vitórias mandante/visitante
   - Empates
   - Total de gols
   - Média de gols por jogo

3. **Probabilidades**
   - Baseadas em histórico
   - Ajuste por vantagem mandante (+15%)

4. **Recommendations**
   - Odds calculadas
   - Nível de risco

**Exemplo de uso:**
```bash
node head_to_head.js "Manchester City" "Liverpool"
```

### 2.4 `advanced_metrics.js` - Métricas Avançadas

**Propósito:** Calcular métricas avançadas de análise de futebol.

**Funcionalidades:**

1. **xG (Expected Goals)**
   ```javascript
   xG = (chutes * 0.12) + (chutes_no_gol * 0.38)
   ```
   - Estima probabilidade de gol baseado na qualidade da finalização

2. **Métricas de Pressão**
   - Desarmes (tackles)
   - Interceptações
   - Faltas cometidas
   - Score de pressão

3. **Métricas de Posse**
   - Por posição (atacante/meia/zagueiro)
   - Rating de posse
   - Estilo de jogo

4. **Comparação de Times**
   - Ataque (gols, chutes, xG)
   - Defesa (desarmes, interceptações)
   - Disciplina (cartões, faltas)
   - Overall power score

**Exemplo de uso:**
```bash
node advanced_metrics.js team "Manchester City"
node advanced_metrics.js compare "Manchester City" "Liverpool"
```

### 2.5 `insights.js` - Rankings e Insights

**Propósito:** Gerar insights sobre times e ligas.

**Funcionalidades:**

1. **Rankings Globais**
   - Top ataques (por gols e xG)
   - Top defesas (por ações defensivas)
   - Times mais disciplinados
   - Times mais agressivos

2. **Insights por Liga**
   - Total de gols
   - Média por time
   - Melhor ataque
   - Melhor defesa
   - Melhor time geral
   - Top artilheiros

3. **Insights de Jogo**
   - Comparação direta
   - Probabilidades
   - Recommendations

**Exemplo de uso:**
```bash
node insights.js attacks 5
node insights.js defenses
node insights.js league "eng Premier League"
node insights.js match "Manchester City" "Liverpool"
```

---

## 3. Classificação de Risco

O sistema utiliza três níveis de risco:

| Classificação | Probabilidade | Emoji |
|--------------|---------------|-------|
| Baixo Risco | 71% - 100% | 🟢 |
| Médio Risco | 41% - 70% | 🟡 |
| Alto Risco | 0% - 40% | 🔴 |

### Cálculo de Odds

```javascript
odds = 1 / probabilidade
```

Exemplo: 68% de chance = 1/0.68 = 1.47 odds

---

## 4. Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│                    DADOS BRUTOS                          │
├─────────────────────────────────────────────────────────┤
│  players_data-2025_2026.csv  │  StatsBomb JSON files   │
└──────────────┬────────────────┴─────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│               DATA_LOADER.JS                            │
│  • Parse CSV                                            │
│  • Cache em memória                                     │
│  • Normalização de campos                               │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│               MÓDULOS DE ANÁLISE                        │
├─────────────────────────────────────────────────────────┤
│  player_analysis.js    → Análise individual             │
│  head_to_head.js       → Confrontos diretos             │
│  advanced_metrics.js   → Métricas avançadas             │
│  insights.js           → Rankings e insights             │
└──────────────┬──────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────┐
│               OUTPUT                                     │
│  • Probabilidades                                       │
│  • Recomendações                                        │
│  • Odds                                                │
│  • Nível de risco                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Comandos de Teste

### Carregar dados
```bash
cd code/engine
node -e "const {loadPlayersData} = require('../utils/data_loader'); console.log(loadPlayersData().length);"
```

### Verificar times
```bash
cd code/engine
node -e "const {loadPlayersData} = require('../utils/data_loader'); const p = loadPlayersData(); const teams = [...new Set(p.map(pl => pl.team))]; console.log(teams.length, 'times');"
```

### Verificar ligas
```bash
cd code/engine
node -e "const {loadPlayersData} = require('../utils/data_loader'); const p = loadPlayersData(); const leagues = [...new Set(p.map(pl => pl.league))]; console.log(leagues);"
```

### Testar módulos
```bash
cd code/engine
node player_analysis.js Haaland
node head_to_head.js "Manchester City" "Liverpool"
node advanced_metrics.js compare "Manchester City" "Liverpool"
node insights.js attacks 5
node insights.js league "eng Premier League"
```

---

## 6. Lições Aprendidas

### 6.1 Parsing de CSV
- CSV com aspas requer parser especial
- Campos podem conter vírgulas dentro de aspas
- Usar lógica de estado (inQuotes)

### 6.2 Nomes de Campos
- Dados podem vir com nomes diferentes (Squad/team, Comp/league)
- Sempre verificar estrutura real dos dados
- Criar alias para compatibilidade

### 6.3 Cache de Dados
- Carregar CSV é custoso
- Manter dados em memória acelera consultas
- Implementar cache simples com variável global

### 6.4 Match de Times
- Nomes podem variar entre datasets
- Usar includes() para fuzzy match
- Ex: "Manchester City" vs "Man City"

---

## 7. Próximos Passos

1. **Integração com API BetsAPI**
   - Buscar jogos futuros
   - Obter odds em tempo real
   - Combinar com análise histórica

2. **Workflow n8n**
   - Automatizar pipeline de análise
   - Agendar atualizações

3. **Interface Frontend**
   - Dashboard web
   - Visualização de dados
   - Recomendações em tempo real

---

## 8. Referências

- [BetsAPI Documentation](https://betsapi.com/docs/)
- [StatsBomb Open Data](https://github.com/statsbomb/open-data)
- [Football Players Stats 2025-2026](https://www.kaggle.com/datasets/hubertsidorowicz/football-players-stats-2025-2026)

---

*Documento gerado em 25/03/2026*
*BetSave-EDScript - Betting Assistant*
