export const API = 'http://localhost:3000';

export function classifyRisk(prob) {
    if (prob >= 0.71) return { level: 'BAIXO', emoji: '🟢', color: '#00ff88' };
    if (prob >= 0.41) return { level: 'MEDIO', emoji: '🟡', color: '#feca57' };
    return { level: 'ALTO', emoji: '🔴', color: '#ff5252' };
}

export function formatTime(timestamp) {
    if (!timestamp) return '--:--';
    if (typeof timestamp === 'string' && timestamp.includes(':')) return timestamp;
    const ts = parseInt(timestamp);
    if (isNaN(ts)) return timestamp;
    return new Date(ts * 1000).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function formatDate(timestamp) {
    if (!timestamp) return '';
    const ts = parseInt(timestamp);
    if (isNaN(ts)) return timestamp;
    return new Date(ts * 1000).toLocaleDateString('pt-BR');
}
