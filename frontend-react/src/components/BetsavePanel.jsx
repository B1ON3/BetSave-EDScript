import PredictionPanel from './PredictionPanel';

export default function BetsavePanel({ match, onClose, onMinimize, isOpen, liveMatches }) {
    return (
        <PredictionPanel 
            match={match}
            onClose={onClose}
            onMinimize={onMinimize}
            isOpen={isOpen}
            liveMatches={liveMatches}
        />
    );
}

export { PredictionPanel };
