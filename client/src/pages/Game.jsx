import { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import GameBoard from '../components/GameBoard';
import Dice from '../components/Dice';
import PlayerList from '../components/PlayerList';
import './Game.css';

function Game() {
    const {
        gameState,
        players,
        spectators,
        isSpectator,
        currentTurnPlayerId,
        playerId,
        isMyTurn,
        diceValue,
        validMoves,
        winner,
        rollDice,
        movePiece,
        leaveRoom,
        roomId
    } = useGame();

    const [isRolling, setIsRolling] = useState(false);
    const [timeLeft, setTimeLeft] = useState(10);

    // Turn timer countdown
    useEffect(() => {
        if (!gameState?.turnStartedAt || winner) {
            setTimeLeft(10);
            return;
        }

        const updateTimer = () => {
            const elapsed = Date.now() - gameState.turnStartedAt;
            const remaining = Math.max(0, Math.ceil((10000 - elapsed) / 1000));
            setTimeLeft(remaining);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 200);

        return () => clearInterval(interval);
    }, [gameState?.turnStartedAt, gameState?.currentPlayerId, winner]);

    const handleRollDice = () => {
        if (!isMyTurn || isRolling) return;
        setIsRolling(true);
        rollDice();
        setTimeout(() => setIsRolling(false), 1000);
    };

    const handlePieceClick = (tokenId) => {
        movePiece(tokenId);
    };

    const currentPlayer = players.find(p => p.id === currentTurnPlayerId);

    // Game over screen
    if (winner) {
        const winnerPlayer = players.find(p => p.id === winner);
        const isWinnerMe = winner === playerId;

        return (
            <div className="game-over-screen">
                <div className="game-over-content card">
                    <div className="trophy">🏆</div>
                    <h1>{isWinnerMe ? 'You Win!' : `${winnerPlayer?.name} Wins!`}</h1>
                    <p className="winner-message">
                        {isWinnerMe
                            ? 'Congratulations! You got all your pieces home!'
                            : 'Better luck next time!'}
                    </p>
                    <div className="winner-color-badge" style={{ background: winnerPlayer?.color?.hex }}>
                        {winnerPlayer?.name}
                    </div>
                    <button className="btn btn-primary btn-large" onClick={leaveRoom}>
                        Back to Lobby
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="game-page">
            {/* Header */}
            <header className="game-header">
                <button className="btn btn-secondary leave-btn" onClick={leaveRoom}>
                    ← Leave Game
                </button>
                <div className="room-info">
                    <span className="room-label">Room</span>
                    <span className="room-code">{roomId}</span>
                </div>

                {/* Timer Display */}
                <div className={`turn-timer ${timeLeft <= 3 ? 'urgent' : ''} ${isMyTurn ? 'my-turn' : ''}`}>
                    <span className="timer-value">{timeLeft}</span>
                    <span className="timer-label">sec</span>
                </div>

                <div className="turn-display">
                    {currentPlayer && (
                        <>
                            <div
                                className="current-player-color"
                                style={{ background: currentPlayer.color?.hex }}
                            ></div>
                            <span>
                                {currentPlayer.id === playerId ? "Your turn!" : `${currentPlayer.name}'s turn`}
                            </span>
                        </>
                    )}
                </div>
            </header>

            {/* Main Game Area */}
            <main className="game-main">
                {/* Game Board */}
                <div className="board-section">
                    <GameBoard
                        gameState={gameState}
                        validMoves={validMoves}
                        onPieceClick={handlePieceClick}
                        currentPlayerId={currentTurnPlayerId}
                        myPlayerId={playerId}
                        isMyTurn={isMyTurn && validMoves.length > 0}
                    />
                </div>

                {/* Side Panel */}
                <aside className="side-panel">
                    {/* Dice Section */}
                    {!isSpectator && (
                        <div className="dice-section card">
                            <Dice
                                value={diceValue}
                                isRolling={isRolling}
                                onRoll={handleRollDice}
                                disabled={gameState?.diceRolled || !isMyTurn}
                                isMyTurn={isMyTurn}
                            />

                            {diceValue && isMyTurn && validMoves.length > 0 && (
                                <div className="move-hint">
                                    Click a highlighted piece to move
                                </div>
                            )}
                        </div>
                    )}

                    {/* Player List */}
                    <PlayerList
                        players={players}
                        currentTurnPlayerId={currentTurnPlayerId}
                        myPlayerId={playerId}
                        gameState={gameState}
                        spectators={spectators}
                        isSpectator={isSpectator}
                    />
                </aside>
            </main>
        </div>
    );
}

export default Game;
