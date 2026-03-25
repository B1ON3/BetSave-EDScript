/* ================================================
   BETSAVE - API CLIENT
   ================================================ */

const API = {
    baseUrl: '',
    
    async get(endpoint) {
        try {
            const res = await fetch(this.baseUrl + endpoint);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            return null;
        }
    },
    
    async getTeams() {
        const data = await this.get('/api/teams');
        return data?.teams || [];
    },
    
    async getLiveMatches() {
        const data = await this.get('/api/live');
        return data?.matches || [];
    },
    
    async getUpcomingMatches() {
        const data = await this.get('/api/matches');
        return data?.matches || [];
    },
    
    async getBrazilStandings() {
        const data = await this.get('/api/brazil-standings');
        return data?.standings || {};
    },
    
    async getTeamProfile(teamName) {
        return await this.get(`/api/team-profile?team=${encodeURIComponent(teamName)}`);
    },
    
    async getTeamStats(teamName) {
        return await this.get(`/api/team-stats?team=${encodeURIComponent(teamName)}`);
    },
    
    async getMatchAnalysis(home, away) {
        return await this.get(`/api/analyze?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`);
    },
    
    async getHeadToHead(team1, team2) {
        return await this.get(`/api/head-to-head?team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`);
    },
    
    async getTeamMatches(teamName, limit = 15) {
        return await this.get(`/api/team-matches?team=${encodeURIComponent(teamName)}&limit=${limit}`);
    }
};
