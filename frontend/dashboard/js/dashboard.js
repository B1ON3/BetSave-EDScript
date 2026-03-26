/* ================================================
   BETSAVE - DASHBOARD MAIN MODULE
   ================================================ */

const Dashboard = {
    init() {
        this.bindEvents();
        this.loadInitialData();
        this.startAutoRefresh();
        this.setupParentCommunication();
    },
    
    setupParentCommunication() {
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'analyzeMatch') {
                this.analyzeMatchFromParent(event.data.home, event.data.away);
            } else if (event.data && event.data.type === 'switchTab') {
                this.switchTabFromParent(event.data.tab);
            }
        });
    },
    
    async analyzeMatchFromParent(home, away) {
        console.log(`🔍 Analisando: ${home} vs ${away}`);
        
        // Search for the match in the dashboard
        const matches = document.querySelectorAll('.match-card');
        for (const card of matches) {
            const teams = card.querySelectorAll('.team-name');
            if (teams.length === 2) {
                const homeName = teams[0].textContent;
                const awayName = teams[1].textContent;
                if (homeName.includes(home.split(' ')[0]) || home.includes(homeName.split(' ')[0])) {
                    card.click();
                    break;
                }
            }
        }
        
        // Also call the analyze API directly
        try {
            const data = await API.analyze(home, away);
            if (data && data.success) {
                this.displayMatchAnalysis(data);
            }
        } catch (e) {
            console.log('Erro ao analisar:', e);
        }
    },
    
    switchTabFromParent(tab) {
        if (tab === 'dashboard') {
            // Stay on main dashboard
        } else if (tab === 'analyze') {
            // Focus on analyze section
            document.querySelector('.search-box input')?.focus();
        } else if (tab === 'standings') {
            this.loadStandings();
        }
    },
    
    bindEvents() {
        document.getElementById('teamSearch').addEventListener('input', (e) => {
            this.handleTeamSearch(e.target.value);
        });
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-box')) {
                this.closeAutocomplete();
            }
            if (e.target.id === 'analysisModal') {
                this.closeModal();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeAutocomplete();
            }
        });
        
        document.getElementById('esportsToggle').addEventListener('change', (e) => {
            this.toggleEsports(e.target.checked);
        });
        
        document.getElementById('esportsChipToggle').addEventListener('change', (e) => {
            this.toggleEsports(e.target.checked);
        });
        
        document.getElementById('esportsUpcomingToggle').addEventListener('change', (e) => {
            this.toggleEsports(e.target.checked);
        });
    },
    
    async loadInitialData() {
        this.showLoading();
        
        const [teams, liveData, upcomingData] = await Promise.all([
            API.getTeams(),
            API.getLiveMatches(),
            API.getUpcomingMatches()
        ]);
        
        State.teams = teams;
        State.allLiveRaw = liveData;
        State.allUpcomingRaw = upcomingData;
        State.resetMatches();
        
        this.updateCounters();
        this.updateMatchCounts();
        this.renderLiveMatches();
        this.renderUpcomingMatches();
        this.updateLastRefresh();
    },
    
    showLoading() {
        document.getElementById('liveMatches').innerHTML = Components.loadingState('Carregando jogos ao vivo...');
        document.getElementById('upcomingMatches').innerHTML = Components.loadingState('Carregando próximas partidas...');
    },
    
    startAutoRefresh() {
        setInterval(() => this.loadInitialData(), 60000);
    },
    
    updateCounters() {
        const esportsCount = State.allLiveRaw.filter(m => State.isEsportsMatch(m)).length +
                           State.allUpcomingRaw.filter(m => State.isEsportsMatch(m)).length;
        
        document.getElementById('liveCount').textContent = State.liveMatches.length;
        document.getElementById('upcomingCount').textContent = State.upcomingMatches.length;
        document.getElementById('esportsCount').textContent = esportsCount;
    },
    
    updateLastRefresh() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = 
            `Atualizado ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    },
    
    toggleEsports(checked) {
        State.filters.showEsports = checked;
        State.applyEsportsFilter();
        
        document.getElementById('esportsToggle').checked = checked;
        document.getElementById('esportsChipToggle').checked = checked;
        document.getElementById('esportsUpcomingToggle').checked = checked;
        
        this.renderLiveMatches();
        this.renderUpcomingMatches();
    },
    
    setLiveFilter(filter, btn) {
        State.filters.liveFilter = filter;
        document.querySelectorAll('#liveFilters .chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this.renderLiveMatches();
    },
    
    setUpcomingFilter(filter, btn) {
        State.filters.upcomingFilter = filter;
        document.querySelectorAll('#upcomingFilters .chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this.renderUpcomingMatches();
    },
    
    renderLiveMatches() {
        const container = document.getElementById('liveMatches');
        let filtered = this.filterLiveMatches();
        
        if (filtered.length === 0) {
            const suggestion = !State.filters.showEsports && State.allLiveRaw.length > 0 
                ? 'Ative E-Sports para ver mais jogos' : '';
            container.innerHTML = Components.emptyState(
                `Nenhum jogo ao vivo encontrado`,
                suggestion
            );
            return;
        }
        
        if (State.filters.liveFilter !== 'all') {
            filtered = filtered.slice(0, 6);
        }
        
        container.innerHTML = '<div class="matches-grid">' + 
            filtered.map(m => Components.matchCard(m, true)).join('') + 
            '</div>';
    },
    
    filterLiveMatches() {
        const filter = State.filters.liveFilter;
        const leagueFilters = ['brasil', 'premier', 'laliga', 'bundesliga', 'champions'];
        
        if (!leagueFilters.includes(filter)) return State.liveMatches;
        
        return State.liveMatches.filter(m => {
            const league = (m.league || '').toLowerCase();
            const home = (m.home || '').toLowerCase();
            const away = (m.away || '').toLowerCase();
            
            switch (filter) {
                case 'brasil':
                    return home.includes('flamengo') || home.includes('palmeiras') || 
                           home.includes('corinthians') || home.includes('grêmio') ||
                           home.includes('atlético') || home.includes('cruzeiro') ||
                           away.includes('flamengo') || away.includes('palmeiras');
                case 'premier':
                    return league.includes('premier');
                case 'laliga':
                    return league.includes('laliga') || home.includes('real madrid') || 
                           home.includes('barcelona');
                case 'bundesliga':
                    return league.includes('bundesliga');
                case 'champions':
                    return league.includes('champions') || league.includes('uefa');
                default:
                    return true;
            }
        });
    },
    
    async renderUpcomingMatches() {
        const container = document.getElementById('upcomingMatches');
        let filtered = this.filterUpcomingMatches();
        
        if (filtered.length === 0) {
            container.innerHTML = Components.emptyState(
                'Nenhum jogo encontrado para este período',
                'Tente outro filtro ou volte mais tarde'
            );
            return;
        }
        
        const html = [];
        for (const match of filtered.slice(0, 10)) {
            const prediction = await this.getMatchPrediction(match);
            html.push(Components.upcomingCard(match, prediction));
        }
        
        container.innerHTML = html.join('');
    },
    
    filterUpcomingMatches() {
        const filter = State.filters.upcomingFilter;
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        
        let filtered = State.upcomingMatches;
        
        switch (filter) {
            case 'today':
                filtered = State.upcomingMatches.filter(m => 
                    new Date(m.date).toDateString() === today.toDateString()
                );
                break;
            case 'tomorrow':
                filtered = State.upcomingMatches.filter(m => 
                    new Date(m.date).toDateString() === tomorrow.toDateString()
                );
                break;
            case 'week':
                filtered = State.upcomingMatches.filter(m => {
                    const d = new Date(m.date);
                    return d >= today && d <= weekEnd;
                });
                break;
        }
        
        return filtered;
    },
    
    async getMatchPrediction(match) {
        try {
            const data = await API.getMatchAnalysis(match.home, match.away);
            
            if (data?.markets) {
                const wdw = data.markets.find(m => m.type.includes('VITÓRIA'));
                const draw = data.markets.find(m => m.type === 'EMPATE');
                
                const homeProb = wdw?.probability || 0.33;
                const drawProb = draw?.probability || 0.33;
                
                let winner, confidence;
                if (homeProb > 0.4) {
                    winner = match.home;
                    confidence = Math.round(homeProb * 100);
                } else if (1 - homeProb - drawProb > 0.3) {
                    winner = match.away;
                    confidence = Math.round((1 - homeProb - drawProb) * 100);
                } else {
                    winner = 'Empate';
                    confidence = Math.round(drawProb * 100);
                }
                
                return { winner, confidence };
            }
            
            if (data?.probabilities) {
                const homeProb = parseFloat(data.probabilities.home);
                const awayProb = parseFloat(data.probabilities.away);
                
                let winner, confidence;
                if (homeProb > 0.45) {
                    winner = match.home;
                    confidence = Math.round(homeProb * 100);
                } else if (awayProb > 0.35) {
                    winner = match.away;
                    confidence = Math.round(awayProb * 100);
                } else {
                    winner = 'Empate';
                    confidence = Math.round((1 - homeProb - awayProb) * 100);
                }
                
                return { winner, confidence };
            }
        } catch (e) {
            console.error('Prediction error:', e);
        }
        return null;
    },
    
    updateMatchCounts() {
        const counts = {
            'brasileirao-a': 0, 'brasileirao-b': 0, 'brasileirao-c': 0, 'brasileirao-d': 0,
            'premier': 0, 'laliga': 0, 'bundesliga': 0, 'seriea': 0, 'ligue1': 0,
            'champions': 0, 'libertadores': 0
        };
        
        State.liveMatches.forEach(m => {
            const league = (m.league || '').toLowerCase();
            if (league.includes('premier')) counts['premier']++;
            if (league.includes('laliga')) counts['laliga']++;
            if (league.includes('bundesliga')) counts['bundesliga']++;
            if (league.includes('champions')) counts['champions']++;
        });
        
        document.querySelectorAll('.filter-btn .count').forEach(span => {
            const btn = span.closest('.filter-btn');
            const text = (btn.textContent || '').toLowerCase();
            
            Object.entries(counts).forEach(([key, val]) => {
                if (text.includes(key.replace('-', ' '))) {
                    span.textContent = val;
                }
            });
        });
    },
    
    handleTeamSearch(query) {
        const autocomplete = document.getElementById('autocomplete');
        
        if (query.length < 2) {
            autocomplete.classList.remove('show');
            return;
        }
        
        const matches = State.teams
            .filter(t => t.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 8);
        
        if (matches.length === 0) {
            autocomplete.classList.remove('show');
            return;
        }
        
        autocomplete.innerHTML = matches.map(t => `
            <div class="autocomplete-item" onclick="Dashboard.selectTeam('${t}')">
                <div class="team-name">${t}</div>
            </div>
        `).join('');
        
        autocomplete.classList.add('show');
    },
    
    selectTeam(teamName) {
        document.getElementById('teamSearch').value = teamName;
        this.closeAutocomplete();
        this.openTeamAnalysis(teamName);
    },
    
    closeAutocomplete() {
        document.getElementById('autocomplete').classList.remove('show');
    },
    
    async openAnalysis(home, away, league) {
        State.ui.currentModalTab = 'match';
        document.getElementById('modalTitle').innerHTML = `${home} <span style="color:var(--text-muted)">VS</span> ${away}`;
        document.getElementById('modalLeague').textContent = league;
        document.getElementById('modalContent').innerHTML = Components.loadingState('Carregando análise...');
        document.getElementById('analysisModal').classList.add('active');
        
        const [analysisData, h2hData] = await Promise.all([
            API.getMatchAnalysis(home, away),
            API.getHeadToHead(home, away)
        ]);
        
        if (analysisData) {
            this.displayMatchAnalysis(analysisData, h2hData);
        } else {
            document.getElementById('modalContent').innerHTML = 
                Components.emptyState('Erro ao carregar análise');
        }
    },
    
    displayMatchAnalysis(data, h2hData) {
        if (data.error) {
            document.getElementById('modalContent').innerHTML = 
                Components.emptyState(data.error);
            return;
        }
        
        const homeName = data.teams?.home?.name || 'Time A';
        const awayName = data.teams?.away?.name || 'Time B';
        
        const wdwMarkets = data.markets?.filter(m => 
            m.type.includes('VITÓRIA') || m.type === 'EMPATE'
        ) || [];
        
        const homeMarket = wdwMarkets.find(m => m.type.includes(homeName.toUpperCase()));
        const drawMarket = wdwMarkets.find(m => m.type === 'EMPATE');
        const awayMarket = wdwMarkets.find(m => m.type.includes(awayName.toUpperCase()));
        
        const homeProb = homeMarket?.probability || 0.33;
        const drawProb = drawMarket?.probability || 0.33;
        const awayProb = awayMarket?.probability || 0.33;
        
        const homeRisk = homeMarket ? { level: homeMarket.risk, emoji: homeMarket.emoji, riskLabel: homeMarket.riskLabel } : this.getRiskLevel(homeProb);
        const drawRisk = drawMarket ? { level: drawMarket.risk, emoji: drawMarket.emoji, riskLabel: drawMarket.riskLabel } : this.getRiskLevel(drawProb);
        const awayRisk = awayMarket ? { level: awayMarket.risk, emoji: awayMarket.emoji, riskLabel: awayMarket.riskLabel } : this.getRiskLevel(awayProb);
        
        const otherMarkets = data.markets?.filter(m => 
            !m.type.includes('VITÓRIA') && m.type !== 'EMPATE'
        ) || [];
        
        const recsHtml = otherMarkets.map(m => 
            `<div class="rec-item">
                <span class="icon">${m.emoji || '🔴'}</span>
                <div class="info">
                    <div class="type">${m.type}</div>
                    <div class="risk">${m.riskLabel || 'Risco Alto'} - Odds: ${m.odds}</div>
                </div>
                <div class="odd">${m.probability * 100}%</div>
            </div>`
        ).join('') || '<div class="empty">Nenhuma recomendação</div>';
        
        let h2hHtml = '';
        if (data.summary?.h2h || (h2hData && !h2hData.error && h2hData.matches?.length > 0)) {
            const h2h = data.summary?.h2h || h2hData;
            const matches = h2h.recentMatches || h2hData?.matches?.slice(0, 5) || [];
            
            const h2hMatches = matches.map(m => {
                const score = `${m.homeScore}-${m.awayScore}`;
                return `<div class="h2h-match">
                    <span class="h2h-date">${m.date?.slice(0,4) || ''}</span>
                    <span class="h2h-teams">${m.home || m.teams?.split(' vs ')[0]} ${score} ${m.away || m.teams?.split(' vs ')[1]}</span>
                    <span class="h2h-league">${m.league || ''}</span>
                </div>`;
            }).join('');
            
            h2hHtml = `
                <div class="card h2h-section">
                    <h3>⚔️ Confronto Direto</h3>
                    <div class="h2h-summary">
                        <div class="h2h-stat">
                            <div class="h2h-val">${h2h.summary?.split(' ')[0] || '0'}</div>
                            <div class="h2h-lbl">${homeName}</div>
                        </div>
                        <div class="h2h-divider">VS</div>
                        <div class="h2h-stat">
                            <div class="h2h-val">${h2h.summary?.split(' ')[2] || '0'}</div>
                            <div class="h2h-lbl">${awayName}</div>
                        </div>
                        <div class="h2h-divider"></div>
                        <div class="h2h-stat">
                            <div class="h2h-val">${h2h.summary?.split(' ')[1] || '0'}</div>
                            <div class="h2h-lbl">Empates</div>
                        </div>
                    </div>
                    <div class="h2h-matches">${h2hMatches}</div>
                </div>
            `;
        }
        
        document.getElementById('modalContent').innerHTML = `
            <div class="tabs">
                <button class="tab active">Análise do Jogo</button>
                <button class="tab" onclick="Dashboard.openTeamAnalysis('${homeName}')">${homeName}</button>
                <button class="tab" onclick="Dashboard.openTeamAnalysis('${awayName}')">${awayName}</button>
            </div>
            
            ${data.summary ? `
            <div class="card" style="margin-top:0; background: linear-gradient(135deg, var(--primary-light), rgba(0,212,255,0.05))">
                <h3>📊 ${data.summary.tendency || 'Análise do jogo'}</h3>
                <p style="color:var(--text-secondary); font-size:0.9rem">
                    Confiança: ${data.summary.confidence || 0}% | 
                    Gols esperados: ${data.summary.totalGoalsExpected || 0} |
                    Dados: ${data.summary.dataSource === 'real' ? '✅ Reais' : '⚠️ Estimados'}
                </p>
            </div>
            ` : ''}
            
            <div class="card">
                <h3>📈 1X2 - Vitórias</h3>
                <div class="prob-grid">
                    ${Components.probabilityCard(homeName, homeProb, homeRisk)}
                    ${Components.probabilityCard('Empate', drawProb, drawRisk)}
                    ${Components.probabilityCard(awayName, awayProb, awayRisk)}
                </div>
            </div>
            
            ${h2hHtml}
            
            <div class="card">
                <h3>📋 Mercados Disponíveis</h3>
                <div class="markets-list">
                    ${otherMarkets.map(m => `
                        <div class="market-item ${(m.risk || 'ALTO').toLowerCase()}">
                            <span class="icon">${m.emoji || '🔴'}</span>
                            <div class="market-info">
                                <span class="market-type">${m.type}</span>
                                <span class="market-insight">${m.insight || ''}</span>
                            </div>
                            <div class="market-prob">${Math.round(m.probability * 100)}%</div>
                            <div class="market-odds">@ ${m.odds}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${data.best_bet ? `
            <div class="recommendations">
                <h3>⭐ Melhor Aposta</h3>
                <div class="rec-item best">
                    <span class="icon">🎯</span>
                    <div class="info">
                        <div class="type">${data.best_bet.type}</div>
                        <div class="risk">${data.best_bet.reason || ''}</div>
                    </div>
                    <div class="odd">${data.best_bet.confidence}% @ ${data.best_bet.odds}</div>
                </div>
            </div>
            ` : ''}
        `;
    },
    
    async openTeamAnalysis(teamName) {
        State.ui.currentModalTab = 'team';
        document.getElementById('modalTitle').textContent = teamName;
        document.getElementById('modalLeague').textContent = 'Perfil e Métricas do Time';
        document.getElementById('modalContent').innerHTML = Components.loadingState('Carregando perfil...');
        document.getElementById('analysisModal').classList.add('active');
        
        const [profileData, statsData, matchesData] = await Promise.all([
            API.getTeamProfile(teamName),
            API.getTeamStats(teamName),
            API.getTeamMatches(teamName, 10)
        ]);
        
        if (statsData && !statsData.error) {
            this.displayTeamProfile(statsData, matchesData);
        } else if (profileData && !profileData.error) {
            this.displayTeamProfile(profileData, matchesData);
        } else {
            this.displayTeamProfile({ name: teamName, error: 'Time não encontrado nos dados' }, null);
        }
    },
    
    displayTeamProfile(data, matchesData) {
        if (data.error) {
            document.getElementById('modalContent').innerHTML = 
                Components.emptyState(data.error);
            return;
        }
        
        const ratings = data.ratings || {};
        const attackRating = ratings.attack || 0;
        const defenseRating = ratings.defense || 0;
        const disciplineRating = ratings.discipline || 0;
        
        const squad = data.squad || [];
        
        const squadByPosition = {
            'GK': squad.filter(p => p.position?.includes('GK')),
            'DF': squad.filter(p => p.position?.includes('DF')),
            'MF': squad.filter(p => p.position?.includes('MF')),
            'FW': squad.filter(p => p.position?.includes('FW'))
        };
        
        const renderSquadPosition = (players, title, color) => {
            if (!players || players.length === 0) return '';
            return `
                <div class="squad-position">
                    <div class="position-title" style="border-color:${color}">${title}</div>
                    <div class="squad-players">
                        ${players.map(p => `
                            <div class="squad-player" onclick="Dashboard.showPlayerStats('${p.name}', '${data.name}')">
                                <div class="player-name">${p.name}</div>
                                <div class="player-stats-mini">${p.goals}G / ${p.assists}A</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };
        
        const squadHtml = `
            ${renderSquadPosition(squadByPosition['GK'], 'Goleiros', 'var(--warning)')}
            ${renderSquadPosition(squadByPosition['DF'], 'Defensores', 'var(--secondary)')}
            ${renderSquadPosition(squadByPosition['MF'], 'Meio-Campistas', 'var(--primary)')}
            ${renderSquadPosition(squadByPosition['FW'], 'Atacantes', 'var(--danger)')}
        `;
        
        const recentMatchesHtml = matchesData?.matches?.slice(0, 5).map(m => {
            const isHome = m.home.toLowerCase().includes((data.name || '').toLowerCase());
            const score = `${m.homeScore} - ${m.awayScore}`;
            const result = m.homeScore > m.awayScore ? (isHome ? 'V' : 'D') : 
                          m.homeScore < m.awayScore ? (isHome ? 'D' : 'V') : 'E';
            const resultClass = result === 'V' ? 'win' : result === 'D' ? 'loss' : 'draw';
            return `<div class="recent-match ${resultClass}">
                <span class="date">${m.date?.slice(0,4) || ''}</span>
                <span class="teams">${m.home} ${score} ${m.away}</span>
                <span class="result">${result}</span>
            </div>`;
        }).join('') || '<div class="empty">Sem jogos recentes</div>';
        
        document.getElementById('modalContent').innerHTML = `
            <div class="team-profile">
                <h3>📊 Ratings do Time</h3>
                <div class="ratings-grid">
                    <div class="rating-item">
                        <div class="rating-label">Ataque</div>
                        <div class="rating-bar"><div class="fill attack" style="width:${attackRating}%"></div></div>
                        <div class="rating-value">${attackRating}</div>
                    </div>
                    <div class="rating-item">
                        <div class="rating-label">Defesa</div>
                        <div class="rating-bar"><div class="fill defense" style="width:${defenseRating}%"></div></div>
                        <div class="rating-value">${defenseRating}</div>
                    </div>
                    <div class="rating-item">
                        <div class="rating-label">Disciplina</div>
                        <div class="rating-bar"><div class="fill discipline" style="width:${disciplineRating}%"></div></div>
                        <div class="rating-value">${disciplineRating}</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h3>📈 Estatísticas</h3>
                <div class="stats-grid">
                    <div class="stat-box"><div class="val">${data.stats?.goals || ratings.goals || 0}</div><div class="lbl">Gols</div></div>
                    <div class="stat-box"><div class="val">${data.stats?.assists || ratings.assists || 0}</div><div class="lbl">Assist.</div></div>
                    <div class="stat-box"><div class="val">${data.stats?.xg || (ratings.shots * 0.12).toFixed(1) || 0}</div><div class="lbl">xG</div></div>
                    <div class="stat-box"><div class="val">${data.players || '?'}</div><div class="lbl">Jogadores</div></div>
                </div>
            </div>
            
            <div class="card">
                <h3>🏆 ${data.league || 'Liga'}</h3>
            </div>
            
            <div class="card">
                <h3>⚽ Escalação (${squad.length} jogadores)</h3>
                <div class="squad-container">
                    ${squadHtml || '<div class="empty">Sem dados de escalação</div>'}
                </div>
            </div>
            
            <div class="card">
                <h3>📅 Jogos Recentes</h3>
                <div class="recent-matches">${recentMatchesHtml}</div>
            </div>
        `;
    },
    
    async showPlayerStats(playerName, teamName) {
        try {
            const response = await fetch(`/api/player?name=${encodeURIComponent(playerName)}&team=${encodeURIComponent(teamName)}`);
            const data = await response.json();
            
            if (data.error) {
                alert(data.error);
                return;
            }
            
            const stats = data.stats || {};
            
            document.getElementById('modalTitle').textContent = data.name;
            document.getElementById('modalLeague').textContent = `${data.position} - ${data.team}`;
            document.getElementById('modalContent').innerHTML = `
                <div class="player-profile">
                    <div class="player-header">
                        <div class="player-avatar">${data.name.split(' ').map(n => n[0]).join('').slice(0,2)}</div>
                        <div class="player-info">
                            <h3>${data.name}</h3>
                            <p>${data.league} | ${data.nationality || 'N/A'}</p>
                        </div>
                    </div>
                    
                    <div class="card" style="margin-top:20px">
                        <h3>📊 Estatísticas</h3>
                        <div class="stats-grid">
                            <div class="stat-box">
                                <div class="val">${stats.matches || 0}</div>
                                <div class="lbl">Jogos</div>
                            </div>
                            <div class="stat-box">
                                <div class="val">${stats.goals || 0}</div>
                                <div class="lbl">Gols</div>
                            </div>
                            <div class="stat-box">
                                <div class="val">${stats.assists || 0}</div>
                                <div class="lbl">Assist.</div>
                            </div>
                            <div class="stat-box">
                                <div class="val">${stats.goalsPerMatch || 0}</div>
                                <div class="lbl">G/J</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="card">
                        <h3>📈 Métricas Detalhadas</h3>
                        <div class="player-metrics">
                            <div class="metric-row">
                                <span>Finalizações</span>
                                <span>${stats.shots || 0}</span>
                            </div>
                            <div class="metric-row">
                                <span>Finalizações no Alvo</span>
                                <span>${stats.shotsOnTarget || 0}</span>
                            </div>
                            <div class="metric-row">
                                <span>Desarmes</span>
                                <span>${stats.tackles || 0}</span>
                            </div>
                            <div class="metric-row">
                                <span>Interceptações</span>
                                <span>${stats.interceptions || 0}</span>
                            </div>
                            <div class="metric-row">
                                <span>Faltas</span>
                                <span>${stats.fouls || 0}</span>
                            </div>
                            <div class="metric-row">
                                <span>Cartões Amarelos</span>
                                <span style="color:var(--warning)">${stats.yellowCards || 0}</span>
                            </div>
                            <div class="metric-row">
                                <span>Cartões Vermelhos</span>
                                <span style="color:var(--danger)">${stats.redCards || 0}</span>
                            </div>
                        </div>
                    </div>
                    
                    <button class="btn-back" onclick="Dashboard.openTeamAnalysis('${teamName}')">
                        ← Voltar ao Time
                    </button>
                </div>
            `;
            document.getElementById('analysisModal').classList.add('active');
        } catch (e) {
            console.error('Erro ao carregar jogador:', e);
            alert('Erro ao carregar estatísticas do jogador');
        }
    },
    
    closeModal() {
        document.getElementById('analysisModal').classList.remove('active');
    },
    
    analyzeTeam(teamName) {
        document.getElementById('teamSearch').value = teamName;
        this.closeAutocomplete();
        this.openTeamAnalysis(teamName);
    },
    
    async compareTeams(team1, team2) {
        State.ui.currentModalTab = 'compare';
        document.getElementById('modalTitle').innerHTML = `<span style="color:var(--primary)">${team1}</span> <span style="color:var(--text-muted)">VS</span> <span style="color:var(--secondary)">${team2}</span>`;
        document.getElementById('modalLeague').textContent = 'Comparação de Times';
        document.getElementById('modalContent').innerHTML = Components.loadingState('Carregando comparação...');
        document.getElementById('analysisModal').classList.add('active');
        
        const [stats1, stats2, h2hData] = await Promise.all([
            API.getTeamStats(team1),
            API.getTeamStats(team2),
            API.getHeadToHead(team1, team2)
        ]);
        
        this.displayTeamComparison(team1, stats1, team2, stats2, h2hData);
    },
    
    displayTeamComparison(t1, s1, t2, s2, h2h) {
        const ratings1 = s1?.ratings || {};
        const ratings2 = s2?.ratings || {};
        
        const compareStat = (v1, v2, higher = true) => {
            const val1 = parseFloat(v1) || 0;
            const val2 = parseFloat(v2) || 0;
            if (val1 === val2) return 'equal';
            return (val1 > val2) === higher ? 'winner' : 'loser';
        };
        
        const players1 = (s1?.topScorers || []).slice(0, 3);
        const players2 = (s2?.topScorers || []).slice(0, 3);
        
        let h2hHtml = '';
        if (h2h && !h2h.error) {
            h2hHtml = `
                <div class="h2h-summary compact">
                    <div class="h2h-stat">
                        <div class="h2h-val">${h2h.wins?.[t1] || 0}</div>
                        <div class="h2h-lbl">${t1.slice(0,10)}</div>
                    </div>
                    <div class="h2h-divider">${h2h.wins?.draws || 0} E</div>
                    <div class="h2h-stat">
                        <div class="h2h-val">${h2h.wins?.[t2] || 0}</div>
                        <div class="h2h-lbl">${t2.slice(0,10)}</div>
                    </div>
                </div>
            `;
        }
        
        document.getElementById('modalContent').innerHTML = `
            ${h2hHtml}
            
            <div class="comparison-grid">
                <div class="comparison-team left">
                    <h3 style="color:var(--primary)">${t1}</h3>
                    <div class="comp-stats">
                        <div class="comp-row ${compareStat(ratings1.attack, ratings2.attack)}">
                            <span>Ataque</span>
                            <span>${ratings1.attack || 0}</span>
                        </div>
                        <div class="comp-row ${compareStat(ratings1.defense, ratings2.defense)}">
                            <span>Defesa</span>
                            <span>${ratings1.defense || 0}</span>
                        </div>
                        <div class="comp-row ${compareStat(ratings1.discipline, ratings2.discipline)}">
                            <span>Disciplina</span>
                            <span>${ratings1.discipline || 0}</span>
                        </div>
                        <div class="comp-row ${compareStat(ratings1.goals, ratings2.goals)}">
                            <span>Gols</span>
                            <span>${ratings1.goals || 0}</span>
                        </div>
                        <div class="comp-row ${compareStat(ratings1.assists, ratings2.assists)}">
                            <span>Assistências</span>
                            <span>${ratings1.assists || 0}</span>
                        </div>
                    </div>
                    <div class="comp-players">
                        <h4>Top 3</h4>
                        ${players1.map(p => `<div class="player-item"><span>${p.name}</span><span>${p.goals}G</span></div>`).join('')}
                    </div>
                </div>
                
                <div class="comparison-divider">VS</div>
                
                <div class="comparison-team right">
                    <h3 style="color:var(--secondary)">${t2}</h3>
                    <div class="comp-stats">
                        <div class="comp-row ${compareStat(ratings2.attack, ratings1.attack)}">
                            <span>Ataque</span>
                            <span>${ratings2.attack || 0}</span>
                        </div>
                        <div class="comp-row ${compareStat(ratings2.defense, ratings1.defense)}">
                            <span>Defesa</span>
                            <span>${ratings2.defense || 0}</span>
                        </div>
                        <div class="comp-row ${compareStat(ratings2.discipline, ratings1.discipline)}">
                            <span>Disciplina</span>
                            <span>${ratings2.discipline || 0}</span>
                        </div>
                        <div class="comp-row ${compareStat(ratings2.goals, ratings1.goals)}">
                            <span>Gols</span>
                            <span>${ratings2.goals || 0}</span>
                        </div>
                        <div class="comp-row ${compareStat(ratings2.assists, ratings1.assists)}">
                            <span>Assistências</span>
                            <span>${ratings2.assists || 0}</span>
                        </div>
                    </div>
                    <div class="comp-players">
                        <h4>Top 3</h4>
                        ${players2.map(p => `<div class="player-item"><span>${p.name}</span><span>${p.goals}G</span></div>`).join('')}
                    </div>
                </div>
            </div>
            
            <div class="card" style="margin-top:20px">
                <h3>💡 Análise Comparativa</h3>
                <div class="insights-list">
                    ${this.generateComparisonInsights(ratings1, ratings2, t1, t2)}
                </div>
            </div>
        `;
    },
    
    generateComparisonInsights(r1, r2, t1, t2) {
        const insights = [];
        
        if (r1.attack > r2.attack + 10) {
            insights.push({ text: `${t1} tem ataque superior (+${r1.attack - r2.attack} pontos)` });
        } else if (r2.attack > r1.attack + 10) {
            insights.push({ text: `${t2} tem ataque superior (+${r2.attack - r1.attack} pontos)` });
        }
        
        if (r1.defense > r2.defense + 10) {
            insights.push({ text: `${t1} tem defesa mais sólida` });
        } else if (r2.defense > r1.defense + 10) {
            insights.push({ text: `${t2} tem defesa mais sólida` });
        }
        
        if (r1.discipline > r2.discipline + 15) {
            insights.push({ text: `${t1} tem melhor disciplina` });
        }
        
        const total1 = (r1.attack || 0) + (r1.defense || 0) + (r1.discipline || 0);
        const total2 = (r2.attack || 0) + (r2.defense || 0) + (r2.discipline || 0);
        
        if (total1 > total2) {
            insights.push({ text: `${t1} tem overall superior (${total1} vs ${total2})` });
        } else if (total2 > total1) {
            insights.push({ text: `${t2} tem overall superior (${total2} vs ${total1})` });
        }
        
        if (insights.length === 0) {
            insights.push({ text: 'Times com desempenhos semelhantes' });
        }
        
        return insights.map((ins, i) => `
            <div class="insight-item">
                <div class="num">${i + 1}</div>
                <div>${ins.text}</div>
            </div>
        `).join('');
    },
    
    getRiskLevel(prob) {
        if (prob >= 0.71) return { level: 'BAIXO', emoji: '🟢', riskLabel: 'Risco Baixo' };
        if (prob >= 0.41) return { level: 'MEDIO', emoji: '🟡', riskLabel: 'Risco Médio' };
        return { level: 'ALTO', emoji: '🔴', riskLabel: 'Risco Alto' };
    },
    
    formatDate(dateStr) {
        if (!dateStr) return 'Hoje';
        
        const date = new Date(dateStr);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) return 'Hoje';
        if (date.toDateString() === tomorrow.toDateString()) return 'Amanhã';
        
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    },
    
    toggleExpandable(id, btn) {
        const container = btn.closest('.expandable-filter');
        const isExpanded = container.classList.contains('expanded');
        
        if (isExpanded) {
            container.classList.remove('expanded');
        } else {
            container.classList.add('expanded');
            if (!State.standingsLoaded) {
                this.loadStandings();
            }
        }
    },
    
    async loadStandings() {
        if (State.standingsLoaded) return;
        
        try {
            State.standings = await API.getBrazilStandings();
            
            Object.entries(State.standings).forEach(([league, teams]) => {
                const key = league.toLowerCase().replace(/ /g, '-');
                const container = document.getElementById(`expand-${key}`);
                
                if (container && teams.length > 0) {
                    container.innerHTML = teams.map(t => Components.standingsRow(t)).join('');
                }
            });
            
            State.standingsLoaded = true;
        } catch (error) {
            console.error('Erro ao carregar classificações:', error);
        }
    },
    
    toggleFilter(filterId, filterName, btn) {
        const filters = State.filters.activeLeagueFilters;
        
        if (filters.has(filterId)) {
            filters.delete(filterId);
            btn.classList.remove('active');
        } else {
            filters.add(filterId);
            btn.classList.add('active');
        }
        
        this.updateActiveFilters();
    },
    
    removeFilter(filterId) {
        State.filters.activeLeagueFilters.delete(filterId);
        document.querySelectorAll('.filter-btn').forEach(btn => {
            if (btn.textContent.includes(filterId)) {
                btn.classList.remove('active');
            }
        });
        this.updateActiveFilters();
    },
    
    updateActiveFilters() {
        const container = document.getElementById('activeFilters');
        const tags = document.getElementById('activeTags');
        const filters = State.filters.activeLeagueFilters;
        
        if (filters.size === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.style.display = 'block';
        tags.innerHTML = '';
        
        filters.forEach(id => {
            tags.innerHTML += `
                <span class="active-tag" onclick="Dashboard.removeFilter('${id}')">
                    ${id} <span class="remove">✕</span>
                </span>
            `;
        });
    },
    
    async loadStandings() {
        document.getElementById('standingsSection').style.display = 'block';
        document.getElementById('standingsContent').innerHTML = Components.loadingState('Carregando tabelas...');
        
        try {
            const response = await fetch('/api/brazil-standings');
            const data = await response.json();
            
            if (data.standings) {
                State.standings = data.standings;
                State.standingsLoaded = true;
                
                document.getElementById('btn-brasileirao-a').click();
            }
        } catch (e) {
            console.error('Erro ao carregar tabelas:', e);
            document.getElementById('standingsContent').innerHTML = 
                Components.emptyState('Erro ao carregar tabelas');
        }
    },
    
    showStandings(type, btn) {
        if (!State.standingsLoaded) return;
        
        document.querySelectorAll('#standingsFilters .chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        
        let html = '';
        
        switch(type) {
            case 'brasileirao-a':
                html = this.renderStandingsTable(State.standings['Brasileirão A'] || [], 'Brasileirão Série A');
                break;
            case 'brasileirao-b':
                html = this.renderStandingsTable(State.standings['Brasileirão B'] || [], 'Brasileirão Série B');
                break;
            case 'brasileirao-c':
                html = this.renderStandingsTable(State.standings['Brasileirão C'] || [], 'Brasileirão Série C');
                break;
            case 'brasileirao-d':
                html = this.renderStandingsTable(State.standings['Brasileirão D'] || [], 'Brasileirão Série D');
                break;
            case 'copa-nordeste':
                html = this.renderMockStandings('Copa do Nordeste', [
                    {pos:1,name:'Fortaleza',pts:16,p:6,w:5,d:1,l:0,gp:12,gc:3,sg:9},
                    {pos:2,name:'Sport',pts:14,p:6,w:4,d:2,l:0,gp:10,gc:4,sg:6},
                    {pos:3,name:'Bahia',pts:13,p:6,w:4,d:1,l:1,gp:11,gc:5,sg:6},
                    {pos:4,name:'Ceará',pts:11,p:6,w:3,d:2,l:1,gp:8,gc:5,sg:3},
                    {pos:5,name:'Náutico',pts:10,p:6,w:3,d:1,l:2,gp:7,gc:6,sg:1}
                ]);
                break;
            case 'copa-brasil':
                html = this.renderMockStandings('Copa do Brasil 2025', [
                    {pos:1,name:'Flamengo',pts:0,p:2,w:2,d:0,l:0,gp:5,gc:1,sg:4},
                    {pos:2,name:'Palmeiras',pts:0,p:2,w:2,d:0,l:0,gp:4,gc:1,sg:3},
                    {pos:3,name:'Grêmio',pts:0,p:2,w:1,d:1,l:0,gp:3,gc:2,sg:1},
                    {pos:4,name:'São Paulo',pts:0,p:2,w:1,d:1,l:0,gp:2,gc:1,sg:1}
                ]);
                break;
            default:
                html = Components.emptyState('Tabela não disponível');
        }
        
        document.getElementById('standingsContent').innerHTML = html;
    },
    
    renderStandingsTable(teams, title) {
        if (!teams || teams.length === 0) {
            return Components.emptyState('Nenhum dado disponível');
        }
        
        const rows = teams.map(t => {
            const zone = t.pos <= 4 ? 'relegation-zone' : t.pos >= 17 ? 'danger' : '';
            return `
                <tr class="${zone}">
                    <td class="pos">${t.pos}</td>
                    <td class="team">${t.name}</td>
                    <td>${t.p}</td>
                    <td>${t.w}</td>
                    <td>${t.d}</td>
                    <td>${t.l}</td>
                    <td>${t.gp}</td>
                    <td>${t.gc}</td>
                    <td class="sg">${t.sg > 0 ? '+' : ''}${t.sg}</td>
                    <td class="pts">${t.pts}</td>
                </tr>
            `;
        }).join('');
        
        return `
            <div class="standings-table">
                <h3>${title}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Time</th>
                            <th>P</th>
                            <th>V</th>
                            <th>E</th>
                            <th>D</th>
                            <th>GP</th>
                            <th>GC</th>
                            <th>SG</th>
                            <th>Pts</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    },
    
    renderMockStandings(title, teams) {
        return this.renderStandingsTable(teams, title);
    }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
