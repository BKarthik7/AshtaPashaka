import { useGame } from '../context/GameContext';
import './Lobby.css';

function Lobby() {
    const {
        roomId,
        players,
        spectators,
        isHost,
        playerName,
        startGame,
        leaveRoom,
        playerId
    } = useGame();

    const copyRoomCode = () => {
        navigator.clipboard.writeText(roomId);
    };

    const canStart = players.length >= 2;

    return (
        <div className="lobby-page">
            <div className="lobby-container">
                {/* Header */}
                <div className="lobby-header">
                    <button className="btn btn-secondary leave-btn" onClick={leaveRoom}>
                        ← Leave
                    </button>
                    <div className="room-code-display" onClick={copyRoomCode} title="Click to copy">
                        <span className="room-code-label">Room Code</span>
                        <span className="room-code-value">{roomId}</span>
                        <span className="copy-hint">📋 Click to copy</span>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lobby-content">
                    {/* Players List */}
                    <div className="players-section card">
                        <h2>
                            Players ({players.length}/8)
                            {players.length < 2 && <span className="min-players-hint">Min 2 to start</span>}
                        </h2>

                        <div className="players-grid">
                            {players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`player-slot filled ${player.id === playerId ? 'is-me' : ''}`}
                                    style={{ '--player-color': player.color?.hex || '#6366f1' }}
                                >
                                    <div className="player-color-badge" style={{ background: player.color?.hex }}></div>
                                    <div className="player-info">
                                        <span className="player-name">
                                            {player.name}
                                            {player.id === playerId && <span className="you-badge">You</span>}
                                        </span>
                                        {player.isHost && <span className="host-badge">Host</span>}
                                    </div>
                                    <div className="player-pieces">
                                        {[0, 1, 2, 3].map(i => (
                                            <div
                                                key={i}
                                                className="mini-piece"
                                                style={{ background: player.color?.hex }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Empty slots */}
                            {Array.from({ length: 8 - players.length }).map((_, i) => (
                                <div key={`empty-${i}`} className="player-slot empty">
                                    <div className="player-color-badge"></div>
                                    <span className="waiting-text">Waiting for player...</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Spectators */}
                    {spectators.length > 0 && (
                        <div className="spectators-section card">
                            <h3>👁️ Spectators ({spectators.length})</h3>
                            <div className="spectators-list">
                                {spectators.map(spec => (
                                    <span key={spec.id} className="spectator-badge">
                                        {spec.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Game Rules Summary */}
                    <div className="rules-section card">
                        <h3>📜 Quick Rules</h3>
                        <ul className="rules-list">
                            <li>🎲 Roll a <strong>6</strong> to move a piece out of home</li>
                            <li>🏃 Move your pieces around the board to reach the center</li>
                            <li>⚔️ Land on an opponent's piece to send it back home</li>
                            <li>🔄 Roll a 6? You get an extra turn!</li>
                            <li>🏆 First to get all 4 pieces to the center wins!</li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="lobby-footer">
                    {isHost ? (
                        <button
                            className={`btn btn-primary btn-large start-btn ${canStart ? 'animate-glow' : ''}`}
                            onClick={startGame}
                            disabled={!canStart}
                        >
                            {canStart ? '🎮 Start Game' : `Waiting for players (${players.length}/2 min)`}
                        </button>
                    ) : (
                        <div className="waiting-for-host">
                            <div className="spinner"></div>
                            <span>Waiting for host to start the game...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Lobby;
