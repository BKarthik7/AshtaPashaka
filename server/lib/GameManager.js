import { PLAYER_COLORS } from './RoomManager.js';

// Board configuration for 8-player Ludo
// Each player has 4 pieces, 13 cells per player section = 104 total track cells
// Turn timer: 10 seconds per move
// IMPORTANT: Exact roll required to finish (no overshooting)

const TURN_TIME_LIMIT = 10000; // 10 seconds in milliseconds
const CELLS_PER_PLAYER = 13;
const TOTAL_TRACK_CELLS = CELLS_PER_PLAYER * 8; // 104
const HOME_STRETCH_LENGTH = 4; // 4 cells in home stretch before center

class GameManager {
    constructor() {
        this.games = new Map();
        this.turnTimers = new Map();
    }

    // Initialize a new game
    initializeGame(room) {
        const playerCount = room.players.length;

        const pieces = {};
        room.players.forEach((player, index) => {
            pieces[player.id] = {
                playerId: player.id,
                colorIndex: index,
                color: PLAYER_COLORS[index],
                tokens: [
                    { id: 0, position: 'home', homePosition: 0 },
                    { id: 1, position: 'home', homePosition: 1 },
                    { id: 2, position: 'home', homePosition: 2 },
                    { id: 3, position: 'home', homePosition: 3 }
                ]
            };
        });

        const gameState = {
            roomId: room.id,
            playerCount: playerCount,
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                color: PLAYER_COLORS[p.colorIndex],
                colorIndex: p.colorIndex
            })),
            pieces: pieces,
            currentTurnIndex: 0,
            currentPlayerId: room.players[0].id,
            diceValue: null,
            diceRolled: false,
            phase: 'ROLL_DICE',
            winner: null,
            turnHistory: [],
            startedAt: Date.now(),
            turnStartedAt: Date.now(),
            turnTimeLimit: TURN_TIME_LIMIT
        };

        this.games.set(room.id, gameState);
        return gameState;
    }

    // Start turn timer
    startTurnTimer(roomId, onTimeUp) {
        this.clearTurnTimer(roomId);

        const game = this.games.get(roomId);
        if (!game) return;

        game.turnStartedAt = Date.now();

        const timer = setTimeout(() => {
            this.handleTurnTimeout(roomId, onTimeUp);
        }, TURN_TIME_LIMIT);

        this.turnTimers.set(roomId, timer);
    }

    // Clear turn timer
    clearTurnTimer(roomId) {
        const timer = this.turnTimers.get(roomId);
        if (timer) {
            clearTimeout(timer);
            this.turnTimers.delete(roomId);
        }
    }

    // Handle turn timeout
    handleTurnTimeout(roomId, onTimeUp) {
        const game = this.games.get(roomId);
        if (!game || game.phase === 'GAME_OVER') return;

        console.log(`Turn timeout in room ${roomId}`);
        this.nextTurn(roomId);

        if (onTimeUp) {
            onTimeUp(roomId, this.getGameState(roomId));
        }
    }

    getGame(roomId) {
        return this.games.get(roomId);
    }

    // Roll dice (1-6)
    rollDice(roomId, playerId) {
        const game = this.games.get(roomId);
        if (!game) return { success: false, error: 'Game not found' };

        if (game.currentPlayerId !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        if (game.diceRolled) {
            return { success: false, error: 'Already rolled' };
        }

        const diceValue = Math.floor(Math.random() * 6) + 1;
        game.diceValue = diceValue;
        game.diceRolled = true;
        game.phase = 'SELECT_PIECE';

        const validMoves = this.getValidMoves(roomId, playerId);

        if (validMoves.length === 0) {
            this.nextTurn(roomId);
            return {
                success: true,
                diceValue,
                validMoves: [],
                skipped: true,
                game: this.getGameState(roomId)
            };
        }

        return {
            success: true,
            diceValue,
            validMoves,
            skipped: false,
            game: this.getGameState(roomId)
        };
    }

    // Get valid moves for current dice roll
    // IMPORTANT: Exact roll required to finish - can't overshoot
    getValidMoves(roomId, playerId) {
        const game = this.games.get(roomId);
        if (!game) return [];

        const playerPieces = game.pieces[playerId];
        if (!playerPieces) return [];

        const validMoves = [];
        const diceValue = game.diceValue;
        const playerColorIndex = playerPieces.colorIndex;

        playerPieces.tokens.forEach(token => {
            if (token.position === 'home') {
                // Can only leave home with a 6
                if (diceValue === 6) {
                    validMoves.push({ tokenId: token.id, canMove: true, type: 'EXIT_HOME' });
                }
            } else if (token.position === 'finished') {
                // Already finished, can't move
            } else if (typeof token.position === 'string' && token.position.startsWith('home_stretch_')) {
                // In home stretch - check if exact roll to finish
                const currentStretchPos = parseInt(token.position.split('_')[2]);
                const stepsToFinish = HOME_STRETCH_LENGTH - currentStretchPos;

                // Can only move if dice value doesn't overshoot
                if (diceValue <= stepsToFinish) {
                    validMoves.push({ tokenId: token.id, canMove: true, type: 'MOVE' });
                }
            } else if (typeof token.position === 'number') {
                // On main track - check if entering home stretch would overshoot
                const startPos = playerColorIndex * CELLS_PER_PLAYER;
                const distanceFromStart = (token.position - startPos + TOTAL_TRACK_CELLS) % TOTAL_TRACK_CELLS;
                const newDistanceFromStart = distanceFromStart + diceValue;

                if (newDistanceFromStart >= TOTAL_TRACK_CELLS) {
                    // Would enter home stretch - check if overshooting
                    const homeStretchPos = newDistanceFromStart - TOTAL_TRACK_CELLS;
                    if (homeStretchPos <= HOME_STRETCH_LENGTH) {
                        validMoves.push({ tokenId: token.id, canMove: true, type: 'MOVE' });
                    }
                    // If overshooting, don't add to valid moves
                } else {
                    // Normal movement on track
                    validMoves.push({ tokenId: token.id, canMove: true, type: 'MOVE' });
                }
            }
        });

        return validMoves;
    }

    // Move a piece
    movePiece(roomId, playerId, tokenId) {
        const game = this.games.get(roomId);
        if (!game) return { success: false, error: 'Game not found' };

        if (game.currentPlayerId !== playerId) {
            return { success: false, error: 'Not your turn' };
        }

        if (!game.diceRolled) {
            return { success: false, error: 'Roll dice first' };
        }

        const playerPieces = game.pieces[playerId];
        const token = playerPieces.tokens.find(t => t.id === tokenId);

        if (!token) {
            return { success: false, error: 'Token not found' };
        }

        const diceValue = game.diceValue;
        let moved = false;
        let captured = null;

        if (token.position === 'home') {
            if (diceValue === 6) {
                const startPos = playerPieces.colorIndex * CELLS_PER_PLAYER;
                token.position = startPos;
                moved = true;
            }
        } else if (typeof token.position === 'number') {
            const playerColorIndex = playerPieces.colorIndex;
            const startPos = playerColorIndex * CELLS_PER_PLAYER;
            const distanceFromStart = (token.position - startPos + TOTAL_TRACK_CELLS) % TOTAL_TRACK_CELLS;
            const newDistanceFromStart = distanceFromStart + diceValue;

            if (newDistanceFromStart >= TOTAL_TRACK_CELLS) {
                // Entering home stretch
                const homeStretchPos = newDistanceFromStart - TOTAL_TRACK_CELLS;
                if (homeStretchPos === HOME_STRETCH_LENGTH) {
                    // Exact roll to finish!
                    token.position = 'finished';
                } else if (homeStretchPos < HOME_STRETCH_LENGTH) {
                    token.position = `home_stretch_${homeStretchPos}`;
                }
                // If overshooting, move shouldn't happen (validated in getValidMoves)
            } else {
                // Normal movement on track
                const newPosition = (token.position + diceValue) % TOTAL_TRACK_CELLS;
                token.position = newPosition;
                captured = this.checkCapture(game, playerId, newPosition);
            }
            moved = true;
        } else if (typeof token.position === 'string' && token.position.startsWith('home_stretch_')) {
            const currentStretchPos = parseInt(token.position.split('_')[2]);
            const newStretchPos = currentStretchPos + diceValue;

            if (newStretchPos === HOME_STRETCH_LENGTH) {
                // Exact roll to finish!
                token.position = 'finished';
            } else if (newStretchPos < HOME_STRETCH_LENGTH) {
                token.position = `home_stretch_${newStretchPos}`;
            }
            // If overshooting, move shouldn't happen (validated in getValidMoves)
            moved = true;
        }

        if (!moved) {
            return { success: false, error: 'Invalid move' };
        }

        game.turnHistory.push({
            playerId,
            tokenId,
            diceValue,
            captured,
            timestamp: Date.now()
        });

        // Check for win
        const allFinished = playerPieces.tokens.every(t => t.position === 'finished');
        if (allFinished) {
            game.phase = 'GAME_OVER';
            game.winner = playerId;
            this.clearTurnTimer(roomId);
            return {
                success: true,
                moved: true,
                captured,
                gameOver: true,
                winner: playerId,
                game: this.getGameState(roomId)
            };
        }

        // If rolled 6, player gets another turn
        if (diceValue === 6) {
            game.diceRolled = false;
            game.diceValue = null;
            game.phase = 'ROLL_DICE';
            game.turnStartedAt = Date.now();
        } else {
            this.nextTurn(roomId);
        }

        return {
            success: true,
            moved: true,
            captured,
            gameOver: false,
            game: this.getGameState(roomId)
        };
    }

    checkCapture(game, movingPlayerId, position) {
        for (const [playerId, playerPieces] of Object.entries(game.pieces)) {
            if (playerId === movingPlayerId) continue;

            for (const token of playerPieces.tokens) {
                if (token.position === position) {
                    token.position = 'home';
                    return { playerId, tokenId: token.id };
                }
            }
        }
        return null;
    }

    nextTurn(roomId) {
        const game = this.games.get(roomId);
        if (!game) return;

        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.playerCount;
        game.currentPlayerId = game.players[game.currentTurnIndex].id;
        game.diceRolled = false;
        game.diceValue = null;
        game.phase = 'ROLL_DICE';
        game.turnStartedAt = Date.now();
    }

    getGameState(roomId) {
        const game = this.games.get(roomId);
        if (!game) return null;

        return {
            roomId: game.roomId,
            players: game.players,
            pieces: game.pieces,
            currentTurnIndex: game.currentTurnIndex,
            currentPlayerId: game.currentPlayerId,
            diceValue: game.diceValue,
            diceRolled: game.diceRolled,
            phase: game.phase,
            winner: game.winner,
            turnStartedAt: game.turnStartedAt,
            turnTimeLimit: TURN_TIME_LIMIT
        };
    }

    handleDisconnect(roomId, playerId) {
        const game = this.games.get(roomId);
        if (!game) return null;

        if (game.currentPlayerId === playerId) {
            this.nextTurn(roomId);
        }

        const playerIndex = game.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            game.players.splice(playerIndex, 1);
            game.playerCount--;
            delete game.pieces[playerId];

            if (game.currentTurnIndex >= game.playerCount) {
                game.currentTurnIndex = 0;
            }
            if (game.players.length > 0) {
                game.currentPlayerId = game.players[game.currentTurnIndex].id;
            }
        }

        if (game.playerCount <= 1) {
            game.phase = 'GAME_OVER';
            this.clearTurnTimer(roomId);
            if (game.players.length > 0) {
                game.winner = game.players[0].id;
            }
            return { gameOver: true, game: this.getGameState(roomId) };
        }

        return { gameOver: false, game: this.getGameState(roomId) };
    }

    deleteGame(roomId) {
        this.clearTurnTimer(roomId);
        this.games.delete(roomId);
    }
}

export default GameManager;
