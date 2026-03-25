/* ================================================
   BETSAVE - COMPONENTS
   ================================================ */

const Components = {
    matchCard(match, isLive = false) {
        const score = match.score || '-';
        const isEsports = State.isEsportsMatch(match);
        
        return `
            <div class="match-card ${isLive ? 'live' : ''} ${isEsports ? 'esports' : ''}" 
                 onclick="Dashboard.openAnalysis('${match.home}', '${match.away}', '${match.league}')">
                <div class="match-league">${isEsports ? '🎮 ' : ''}${match.league}</div>
                <div class="match-teams">
                    <span class="match-team">${match.home}</span>
                    <span class="match-score ${isLive ? 'live' : ''}">${score}</span>
                    <span class="match-team away">${match.away}</span>
                </div>
                <div class="match-time">${isLive ? '🔴 AO VIVO' : match.time}</div>
            </div>
        `;
    },
    
    upcomingCard(match, prediction = null) {
        const isEsports = State.isEsportsMatch(match);
        const dateStr = Dashboard.formatDate(match.date);
        
        let predHtml = '';
        if (prediction) {
            const riskClass = prediction.confidence >= 71 ? 'low' : 
                              prediction.confidence >= 41 ? 'medium' : 'high';
            predHtml = `
                <div class="upcoming-prediction">
                    <span class="pred-label">Previsão:</span>
                    <span class="pred-result">${prediction.winner}</span>
                    <span class="pred-confidence ${riskClass}">${prediction.confidence}% certeza</span>
                </div>
            `;
        }
        
        return `
            <div class="upcoming-card" 
                 onclick="Dashboard.openAnalysis('${match.home}', '${match.away}', '${match.league}')">
                <div class="upcoming-header">
                    <span class="upcoming-date">📅 ${dateStr} às ${match.time || '--:--'}</span>
                    <span class="upcoming-league">${isEsports ? '🎮 ' : ''}${match.league}</span>
                </div>
                <div class="upcoming-teams">
                    <span class="home">${match.home}</span>
                    <span class="vs">VS</span>
                    <span class="away">${match.away}</span>
                </div>
                ${predHtml}
            </div>
        `;
    },
    
    standingsRow(team) {
        const posClass = team.pos <= 4 ? 'top4' : team.pos > 16 ? 'relegation' : 'normal';
        const sg = team.sg > 0 ? `+${team.sg}` : team.sg;
        
        return `
            <div class="standings-row" onclick="Dashboard.analyzeTeam('${team.name}')">
                <span class="pos ${posClass}">${team.pos}º</span>
                <span class="team-name">${team.name}</span>
                <span class="pts">${team.pts}pts</span>
                <span class="sg">${sg}</span>
            </div>
        `;
    },
    
    emptyState(message, suggestion = '') {
        return `
            <div class="empty">
                ⚽ ${message}
                ${suggestion ? `<br><small style="color:var(--text-muted)">${suggestion}</small>` : ''}
            </div>
        `;
    },
    
    loadingState(message = 'Carregando...') {
        return `
            <div class="loading">
                <div class="spinner"></div>
                ${message}
            </div>
        `;
    },
    
    teamStats(stats) {
        return `
            <div class="team-stats">
                <div class="team-stat">
                    <div class="value">${stats.goals || 0}</div>
                    <div class="label">Gols</div>
                </div>
                <div class="team-stat">
                    <div class="value">${stats.assists || 0}</div>
                    <div class="label">Assistências</div>
                </div>
                <div class="team-stat">
                    <div class="value">${stats.shots || 0}</div>
                    <div class="label">Finalizações</div>
                </div>
                <div class="team-stat">
                    <div class="value">${stats.xg || '0'}</div>
                    <div class="label">xG</div>
                </div>
                <div class="team-stat">
                    <div class="value">${stats.tackles || 0}</div>
                    <div class="label">Desarmes</div>
                </div>
                <div class="team-stat">
                    <div class="value">${stats.interceptions || 0}</div>
                    <div class="label">Interceptações</div>
                </div>
                <div class="team-stat">
                    <div class="value">${stats.performance || 0}</div>
                    <div class="label">Performance</div>
                </div>
                <div class="team-stat">
                    <div class="value">${stats.avgAge || '0'}</div>
                    <div class="label">Idade Média</div>
                </div>
            </div>
        `;
    },
    
    probabilityCard(label, value, riskLevel) {
        const level = riskLevel?.level || riskLevel || 'ALTO';
        const emoji = riskLevel?.emoji || '🔴';
        const riskLabel = riskLevel?.riskLabel || 'Risco Alto';
        
        return `
            <div class="prob-card ${level.toLowerCase()}">
                <div class="label">${label}</div>
                <div class="value">${(value * 100).toFixed(0)}%</div>
                <span class="risk-badge ${level.toLowerCase()}">
                    ${emoji} ${riskLabel.replace('Risco ', '')}
                </span>
            </div>
        `;
    },
    
    recommendation(rec) {
        const emoji = rec.emoji || (rec.risk?.emoji) || '🔴';
        const riskLabel = rec.riskLabel || rec.risk?.riskLabel || 'Risco Alto';
        
        return `
            <div class="rec-item">
                <span class="icon">${emoji}</span>
                <div class="info">
                    <div class="type">${rec.type}</div>
                    <div class="risk">${riskLabel}</div>
                </div>
                <span class="odd">${rec.odds || rec.odd}</span>
            </div>
        `;
    },
    
    insightItem(text, index) {
        return `
            <div class="insight-item">
                <span class="num">${index}</span>
                <span>${text}</span>
            </div>
        `;
    },
    
    playerItem(player) {
        return `
            <div class="player-item">
                <div>
                    <div class="name">${player.name}</div>
                    <div class="pos">${player.position || '?'}</div>
                </div>
                <div class="stats">${player.goals}G / ${player.assists}A</div>
            </div>
        `;
    }
};
