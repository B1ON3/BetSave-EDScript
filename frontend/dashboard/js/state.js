/* ================================================
   BETSAVE - STATE MANAGEMENT
   ================================================ */

const State = {
    teams: [],
    liveMatches: [],
    upcomingMatches: [],
    allLiveRaw: [],
    allUpcomingRaw: [],
    standings: {},
    standingsLoaded: false,
    
    filters: {
        showEsports: false,
        liveFilter: 'all',
        upcomingFilter: 'all',
        activeLeagueFilters: new Set()
    },
    
    ui: {
        modalOpen: false,
        currentModalTab: 'match'
    },
    
    resetMatches() {
        this.applyEsportsFilter();
    },
    
    isEsportsMatch(match) {
        const league = (match.league || '').toLowerCase();
        const keywords = ['e-sports', 'esports', 'esport'];
        return keywords.some(k => league.includes(k));
    },
    
    applyEsportsFilter() {
        if (this.filters.showEsports) {
            this.liveMatches = [...this.allLiveRaw];
            this.upcomingMatches = [...this.allUpcomingRaw];
        } else {
            this.liveMatches = this.allLiveRaw.filter(m => !this.isEsportsMatch(m));
            this.upcomingMatches = this.allUpcomingRaw.filter(m => !this.isEsportsMatch(m));
        }
    },
    
    toggleEsports() {
        this.filters.showEsports = !this.filters.showEsports;
        this.applyEsportsFilter();
    }
};
