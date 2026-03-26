// ================================================
// HOMEPAGE - JavaScript
// ================================================

// Current state
let selectedMatch = null;
let currentBetSaveTab = 'dashboard';
const API_BASE = ''; // Same origin

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏠 Homepage carregada');
    
    // Initialize animations
    initAnimations();
    
    // Load real analysis data
    loadMatchAnalyses();
    
    // Add smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeBetSave();
        }
    });
    
    // Add ripple effect to buttons
    document.querySelectorAll('.btn, .betsave-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            createRipple(e, this);
        });
    });
});

// ================================================
// LOAD MATCH ANALYSES FROM API
// ================================================
async function loadMatchAnalyses() {
    const matches = [
        { home: 'Flamengo', away: 'Palmeiras', cardId: 'ai-tip-flamengo-palmeiras' },
        { home: 'Barcelona', away: 'Real Madrid', cardId: 'ai-tip-barcelona-real' },
        { home: 'Manchester City', away: 'Liverpool', cardId: 'ai-tip-manu-liverpool' },
        { home: 'Corinthians', away: 'São Paulo', cardId: 'ai-tip-corinthians-sp' },
        { home: 'Bayern Munich', away: 'Borussia Dortmund', cardId: 'ai-tip-bayern-dortmund' },
        { home: 'Inter Milan', away: 'AC Milan', cardId: 'ai-tip-inter-milan' }
    ];
    
    for (const match of matches) {
        try {
            const response = await fetch(`${API_BASE}/api/analyze?home=${encodeURIComponent(match.home)}&away=${encodeURIComponent(match.away)}`);
            const data = await response.json();
            
            if (data && data.success !== false) {
                const aiTipEl = document.getElementById(match.cardId);
                if (aiTipEl && data.summary && data.summary.confidence) {
                    aiTipEl.querySelector('.odds-value').textContent = data.summary.confidence + '%';
                }
            }
        } catch (e) {
            console.log(`Erro ao carregar análise ${match.home} vs ${match.away}:`, e);
        }
    }
}

// ================================================
// RIPPLE EFFECT
// ================================================
function createRipple(event, element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    
    ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    `;
    
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = event.clientX - rect.left - size / 2 + 'px';
    ripple.style.top = event.clientY - rect.top - size / 2 + 'px';
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// ================================================
// ANIMATIONS
// ================================================
function initAnimations() {
    // Hero animations
    const heroElements = document.querySelectorAll('.hero-badge, .hero-title, .hero-subtitle, .hero-bonus, .hero-actions');
    heroElements.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        setTimeout(() => {
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 200 + (i * 100));
    });
    
    // Stagger match cards
    const matchCards = document.querySelectorAll('.match-card');
    matchCards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease, box-shadow 0.3s ease, border-color 0.3s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 600 + (i * 100));
    });
    
    // Stagger feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 1000 + (i * 150));
    });
    
    // Header animation on scroll
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// ================================================
// BETSAVE FUNCTIONS
// ================================================

function openBetSave() {
    const overlay = document.getElementById('betsaveOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // If there's a selected match, load it
    if (selectedMatch) {
        loadMatchInDashboard(selectedMatch.home, selectedMatch.away);
    }
}

function closeBetSave() {
    const overlay = document.getElementById('betsaveOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset selection
    selectedMatch = null;
}

function openBetSaveWithMatch(home, away) {
    selectedMatch = { home, away };
    
    // Add click animation to card
    const cards = document.querySelectorAll('.match-card');
    cards.forEach(card => {
        const teams = card.querySelectorAll('.team-name');
        if (teams.length === 2) {
            const cardHome = teams[0].textContent;
            const cardAway = teams[1].textContent;
            if (cardHome.includes(home.split(' ')[0]) || home.includes(cardHome.split(' ')[0])) {
                card.classList.add('clicked');
                setTimeout(() => card.classList.remove('clicked'), 300);
            }
        }
    });
    
    openBetSave();
    
    // Small delay to wait for iframe to load
    setTimeout(() => {
        loadMatchInDashboard(home, away);
    }, 500);
}

function loadMatchInDashboard(home, away) {
    const iframe = document.getElementById('betsaveIframe');
    if (iframe && iframe.contentWindow) {
        // Send message to iframe to analyze this match
        iframe.contentWindow.postMessage({
            type: 'analyzeMatch',
            home: home,
            away: away
        }, '*');
    }
}

function switchBetSaveTab(tab, btn) {
    // Update active tab
    document.querySelectorAll('.betsave-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentBetSaveTab = tab;
    
    // Send message to iframe
    const iframe = document.getElementById('betsaveIframe');
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
            type: 'switchTab',
            tab: tab
        }, '*');
    }
}

// ================================================
// MATCHES FILTERING
// ================================================

function filterMatches(filter) {
    // Update active tab
    document.querySelectorAll('.section-tabs .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    const cards = document.querySelectorAll('.match-card');
    
    cards.forEach((card, i) => {
        let show = false;
        if (filter === 'all') {
            show = true;
        } else if (filter === 'live') {
            show = card.classList.contains('live');
        } else if (filter === 'today') {
            show = !card.classList.contains('live');
        } else if (filter === 'tomorrow') {
            show = !card.classList.contains('live');
        }
        
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        if (show) {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
            card.style.display = 'block';
        } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => card.style.display = 'none', 300);
        }
    });
}

// ================================================
// MOBILE MENU
// ================================================

function toggleMobileMenu() {
    const nav = document.querySelector('.nav');
    const btn = document.querySelector('.mobile-menu-btn');
    nav.classList.toggle('open');
    btn.classList.toggle('open');
}

// ================================================
// LIVE MATCHES UPDATE SIMULATION
// ================================================

// Simulate live score updates
setInterval(() => {
    const liveCard = document.querySelector('.match-card.live');
    if (liveCard) {
        const scoreEl = liveCard.querySelector('.score');
        const timeEl = liveCard.querySelector('.match-time');
        
        // Randomly update time
        let time = parseInt(timeEl.textContent);
        if (time < 90) {
            time += 1;
            timeEl.textContent = time + "'";
            
            // Add flash animation
            liveCard.style.boxShadow = '0 0 30px rgba(255, 82, 82, 0.5)';
            setTimeout(() => {
                liveCard.style.boxShadow = '';
            }, 500);
        }
    }
}, 60000); // Update every minute

// ================================================
// DEMO: Log BetSave opens
// ================================================

console.log('📊 BetSave Demo: Clique no botão "BetSave" para abrir a análise IA');
console.log('📊 BetSave Demo: Ou clique diretamente em um card de partida para analisar');
