import { PLAYER_COLORS } from './RoomManager.js';

// Board configuration for 8-player Ludo
// Each player has:
// - 4 pieces in their home base
// - A starting position on the main track
// - A home stretch leading to the center

// The main track has positions for all players to move around
// Each player's pieces start at their designated position and move clockwise

class GameManager {
    constructor() {
        // Active games: roomId -> GameState
        this.games = new Map();
    }

    // Initialize a new game
    initializeGame(room) {
        const playerCount = room.players.length;

        // Each player gets 4 pieces
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
            phase: 'ROLL_DICE', // ROLL_DICE, SELECT_PIECE, GAME_OVER
            winner: null,
            turnHistory: [],
            startedAt: Date.now()
        };

        this.games.set(room.id, gameState);
        return gameState;
    }

    // Get game state
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

        // Roll the dice (1-6)
        const diceValue = Math.floor(Math.random() * 6) + 1;
        game.diceValue = diceValue;
        game.diceRolled = true;
        game.phase = 'SELECT_PIECE';

        // Check if player has any valid moves
        const validMoves = this.getValidMoves(roomId, playerId);

        if (validMoves.length === 0) {
            // No valid moves, skip to next player
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
    getValidMoves(roomId, playerId) {
        const game = this.games.get(roomId);
        if (!game) return [];

        const playerPieces = game.pieces[playerId];
        if (!playerPieces) return [];

        const validMoves = [];
        const diceValue = game.diceValue;

        playerPieces.tokens.forEach(token => {
            if (token.position === 'home') {
                // Can only leave home with a 6
                if (diceValue === 6) {
                    validMoves.push({ tokenId: token.id, canMove: true, type: 'EXIT_HOME' });
                }
            } else if (token.position === 'finished') {
                // Already finished, can't move
            } else {
                // On the track, can always move forward
                validMoves.push({ tokenId: token.id, canMove: true, type: 'MOVE' });
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
                // Move out of home to starting position
                const startPos = playerPieces.colorIndex * 13; // Each player starts 13 positions apart
                token.position = startPos;
                moved = true;
            }
        } else if (typeof token.position === 'number') {
            // Calculate new position
            const playerColorIndex = playerPieces.colorIndex;
            const mainTrackLength = 104; // 8 players * 13 positions each
            const homeStretchStart = (playerColorIndex * 13 + 12) % mainTrackLength; // Position before home stretch

            let newPosition = token.position + diceValue;

            // Check if entering home stretch
            // For simplicity, we'll use a linear track with home stretch
            // Each player's home stretch is after their section of the main track

            if (newPosition >= mainTrackLength) {
                // Entering home stretch or finished
                const homeStretchPos = newPosition - mainTrackLength;
                if (homeStretchPos >= 4) {
                    token.position = 'finished';
                } else {
                    token.position = `home_stretch_${homeStretchPos}`;
                }
            } else {
                token.position = newPosition;

                // Check for captures
                captured = this.checkCapture(game, playerId, newPosition);
            }
            moved = true;
        } else if (typeof token.position === 'string' && token.position.startsWith('home_stretch_')) {
            // In home stretch
            const currentStretchPos = parseInt(token.position.split('_')[2]);
            const newStretchPos = currentStretchPos + diceValue;

            if (newStretchPos >= 4) {
                token.position = 'finished';
            } else {
                token.position = `home_stretch_${newStretchPos}`;
            }
            moved = true;
        }

        if (!moved) {
            return { success: false, error: 'Invalid move' };
        }

        // Record move history
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

    // Check if a move captures an opponent's piece
    checkCapture(game, movingPlayerId, position) {
        for (const [playerId, playerPieces] of Object.entries(game.pieces)) {
            if (playerId === movingPlayerId) continue;

            for (const token of playerPieces.tokens) {
                if (token.position === position) {
                    // Capture! Send back to home
                    token.position = 'home';
                    return { playerId, tokenId: token.id };
                }
            }
        }
        return null;
    }

    // Move to next player's turn
    nextTurn(roomId) {
        const game = this.games.get(roomId);
        if (!game) return;

        game.currentTurnIndex = (game.currentTurnIndex + 1) % game.playerCount;
        game.currentPlayerId = game.players[game.currentTurnIndex].id;
        game.diceRolled = false;
        game.diceValue = null;
        game.phase = 'ROLL_DICE';
    }

    // Get sanitized game state for broadcasting
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
            winner: game.winner
        };
    }

    // Handle player disconnect during game
    handleDisconnect(roomId, playerId) {
        const game = this.games.get(roomId);
        if (!game) return null;

        // For now, if a player disconnects, their turn is skipped
        if (game.currentPlayerId === playerId) {
            this.nextTurn(roomId);
        }

        // Remove player from game
        const playerIndex = game.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            game.players.splice(playerIndex, 1);
            game.playerCount--;
            delete game.pieces[playerId];

            // Adjust current turn index if needed
            if (game.currentTurnIndex >= game.playerCount) {
                game.currentTurnIndex = 0;
            }
            if (game.players.length > 0) {
                game.currentPlayerId = game.players[game.currentTurnIndex].id;
            }
        }

        // If only one player left, they win
        if (game.playerCount <= 1) {
            game.phase = 'GAME_OVER';
            if (game.players.length > 0) {
                game.winner = game.players[0].id;
            }
            return { gameOver: true, game: this.getGameState(roomId) };
        }

        return { gameOver: false, game: this.getGameState(roomId) };
    }

    // Delete game
    deleteGame(roomId) {
        this.games.delete(roomId);
    }
}

export default GameManager;
