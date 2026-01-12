import './PlayerList.css';

function PlayerList({
    players,
    currentTurnPlayerId,
    myPlayerId,
    gameState,
    spectators = [],
    isSpectator
}) {
    // Calculate pieces info for each player
    const getPlayerProgress = (playerId) => {
        const pieces = gameState?.pieces?.[playerId];
        if (!pieces) return { home: 4, onTrack: 0, finished: 0 };

        let home = 0, onTrack = 0, finished = 0;
        pieces.tokens.forEach(token => {
            if (token.position === 'home') home++;
            else if (token.position === 'finished') finished++;
            else onTrack++;
        });

        return { home, onTrack, finished };
    };

    return (
        <div className="player-list-container">
            <h3 className="player-list-title">Players</h3>

            <div className="player-list">
                {players.map((player, index) => {
                    const isCurrentTurn = player.id === currentTurnPlayerId;
                    const isMe = player.id === myPlayerId;
                    const progress = getPlayerProgress(player.id);

                    return (
                        <div
                            key={player.id}
                            className={`player-item ${isCurrentTurn ? 'current-turn' : ''} ${isMe ? 'is-me' : ''}`}
                            style={{ '--player-color': player.color?.hex }}
                        >
                            <div className="player-color-indicator" style={{ background: player.color?.hex }}>
                                {isCurrentTurn && <span className="turn-indicator">🎲</span>}
                            </div>

                            <div className="player-details">
                                <div className="player-name-row">
                                    <span className="player-name">{player.name}</span>
                                    {isMe && <span className="you-tag">You</span>}
                                </div>

                                <div className="player-progress">
                                    <div className="progress-item" title="Pieces at home">
                                        <span className="progress-icon">🏠</span>
                                        <span>{progress.home}</span>
                                    </div>
                                    <div className="progress-item" title="Pieces on track">
                                        <span className="progress-icon">🏃</span>
                                        <span>{progress.onTrack}</span>
                                    </div>
                                    <div className="progress-item" title="Pieces finished">
                                        <span className="progress-icon">⭐</span>
                                        <span>{progress.finished}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Spectators */}
            {spectators.length > 0 && (
                <div className="spectators-section">
                    <h4 className="spectators-title">
                        👁️ Spectators ({spectators.length})
                    </h4>
                    <div className="spectators-list">
                        {spectators.map(spec => (
                            <span key={spec.id} className="spectator-tag">
                                {spec.name}
                                {spec.id === myPlayerId && ' (You)'}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Spectator mode indicator */}
            {isSpectator && (
                <div className="spectator-mode-notice">
                    <span className="notice-icon">👁️</span>
                    <span>You are watching this game</span>
                </div>
            )}
        </div>
    );
}

export default PlayerList;
