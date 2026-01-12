import { useState } from 'react';
import { useGame } from '../context/GameContext';
import './LandingPage.css';

function LandingPage() {
    const { createRoom, joinRoom, isConnected, isLoading } = useGame();
    const [mode, setMode] = useState(null); // 'create' or 'join'
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        createRoom(playerName);
    };

    const handleJoin = (e) => {
        e.preventDefault();
        joinRoom(roomCode, playerName);
    };

    return (
        <div className="landing-page">
            <div className="landing-content">
                {/* Logo and Title */}
                <div className="landing-header animate-slide-up">
                    <div className="logo-container">
                        <div className="logo">
                            <span className="logo-icon">🎲</span>
                        </div>
                    </div>
                    <h1 className="game-title">AshtaPashaka</h1>
                    <p className="game-subtitle">8-Player Multiplayer Board Game</p>
                </div>

                {/* Connection Status */}
                <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                    <span className="status-dot"></span>
                    {isConnected ? 'Connected to server' : 'Connecting...'}
                </div>

                {/* Main Card */}
                <div className="landing-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                    {!mode ? (
                        // Mode Selection
                        <div className="mode-selection">
                            <h2>Play Now</h2>
                            <p className="text-muted mb-lg">Choose how you want to play</p>

                            <div className="mode-buttons">
                                <button
                                    className="mode-btn create-btn"
                                    onClick={() => setMode('create')}
                                    disabled={!isConnected}
                                >
                                    <span className="mode-icon">➕</span>
                                    <span className="mode-title">Create Room</span>
                                    <span className="mode-desc">Start a new game</span>
                                </button>

                                <button
                                    className="mode-btn join-btn"
                                    onClick={() => setMode('join')}
                                    disabled={!isConnected}
                                >
                                    <span className="mode-icon">🔗</span>
                                    <span className="mode-title">Join Room</span>
                                    <span className="mode-desc">Enter a room code</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // Name Entry Form
                        <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="entry-form">
                            <button
                                type="button"
                                className="back-btn"
                                onClick={() => setMode(null)}
                            >
                                ← Back
                            </button>

                            <h2>{mode === 'create' ? 'Create a Room' : 'Join a Room'}</h2>

                            <div className="form-group">
                                <label htmlFor="playerName">Your Name</label>
                                <input
                                    type="text"
                                    id="playerName"
                                    className="input"
                                    placeholder="Enter your name..."
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    maxLength={20}
                                    autoFocus
                                    required
                                />
                            </div>

                            {mode === 'join' && (
                                <div className="form-group">
                                    <label htmlFor="roomCode">Room Code</label>
                                    <input
                                        type="text"
                                        id="roomCode"
                                        className="input room-code-input"
                                        placeholder="Enter 6-digit code..."
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                        maxLength={6}
                                        required
                                    />
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary btn-large submit-btn"
                                disabled={isLoading || !isConnected}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner small"></span>
                                        {mode === 'create' ? 'Creating...' : 'Joining...'}
                                    </>
                                ) : (
                                    mode === 'create' ? 'Create Room' : 'Join Room'
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Game Info */}
                <div className="game-info animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <div className="info-item">
                        <span className="info-icon">👥</span>
                        <span>2-8 Players</span>
                    </div>
                    <div className="info-item">
                        <span className="info-icon">👁️</span>
                        <span>Spectator Mode</span>
                    </div>
                    <div className="info-item">
                        <span className="info-icon">🌐</span>
                        <span>Real-time Multiplayer</span>
                    </div>
                </div>
            </div>

            {/* Background decoration */}
            <div className="bg-decoration">
                <div className="floating-piece piece-1">🔵</div>
                <div className="floating-piece piece-2">🔴</div>
                <div className="floating-piece piece-3">🟢</div>
                <div className="floating-piece piece-4">🟡</div>
                <div className="floating-piece piece-5">🟣</div>
                <div className="floating-piece piece-6">⚫</div>
            </div>
        </div>
    );
}

export default LandingPage;
