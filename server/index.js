import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { RoomManager } from './lib/RoomManager.js';
import GameManager from './lib/GameManager.js';
import IPTracker from './lib/IPTracker.js';

const PORT = process.env.PORT || 3001;

// Initialize managers
const roomManager = new RoomManager();
const gameManager = new GameManager();
const ipTracker = new IPTracker();

// Create WebSocket server
const wss = new WebSocketServer({ port: PORT });

console.log(`🎮 AshtaPashaka Server running on port ${PORT}`);

// Helper to get client IP
function getClientIP(req) {
    // Handle proxies
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress;
}

// Helper to send JSON message
function send(ws, message) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(message));
    }
}

// Handle new connections
wss.on('connection', (ws, req) => {
    const clientIP = getClientIP(req);
    let playerId = null;
    let currentRoomId = null;

    console.log(`New connection from ${clientIP}`);

    // Check if this IP is already connected
    const existingPlayer = ipTracker.getPlayerByIP(clientIP);

    if (existingPlayer) {
        // Reconnection - use existing player ID
        playerId = existingPlayer.playerId;
        currentRoomId = existingPlayer.roomId;

        // Update the websocket reference
        ipTracker.registerIP(clientIP, playerId, currentRoomId, ws);

        send(ws, {
            type: 'RECONNECTED',
            playerId: playerId,
            roomId: currentRoomId
        });

        // If in a room, send current state
        if (currentRoomId) {
            const roomState = roomManager.getRoomState(currentRoomId);
            if (roomState) {
                send(ws, { type: 'ROOM_STATE', ...roomState });

                if (roomState.gameStarted) {
                    const gameState = gameManager.getGameState(currentRoomId);
                    if (gameState) {
                        send(ws, { type: 'GAME_STATE', ...gameState });
                    }
                }
            }
        }
    } else {
        // New connection - generate new player ID
        playerId = uuidv4();
        ipTracker.registerIP(clientIP, playerId, null, ws);

        send(ws, {
            type: 'CONNECTED',
            playerId: playerId
        });
    }

    // Store player info on WebSocket
    ws.playerId = playerId;
    ws.clientIP = clientIP;

    // Handle messages
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMessage(ws, message, playerId, clientIP);
        } catch (err) {
            console.error('Invalid message:', err);
            send(ws, { type: 'ERROR', message: 'Invalid message format' });
        }
    });

    // Handle disconnect
    ws.on('close', () => {
        console.log(`Disconnected: ${clientIP} (${playerId})`);
        handleDisconnect(playerId, clientIP, currentRoomId);
    });

    ws.on('error', (err) => {
        console.error(`WebSocket error for ${clientIP}:`, err);
    });
});

// Message handler
function handleMessage(ws, message, playerId, clientIP) {
    const { type } = message;

    switch (type) {
        case 'CREATE_ROOM':
            handleCreateRoom(ws, message, playerId);
            break;

        case 'JOIN_ROOM':
            handleJoinRoom(ws, message, playerId, clientIP);
            break;

        case 'LEAVE_ROOM':
            handleLeaveRoom(ws, playerId, clientIP);
            break;

        case 'START_GAME':
            handleStartGame(ws, playerId);
            break;

        case 'ROLL_DICE':
            handleRollDice(ws, playerId);
            break;

        case 'MOVE_PIECE':
            handleMovePiece(ws, message, playerId);
            break;

        case 'CHAT':
            handleChat(ws, message, playerId);
            break;

        default:
            send(ws, { type: 'ERROR', message: `Unknown message type: ${type}` });
    }
}

// Handler: Create Room
function handleCreateRoom(ws, message, playerId) {
    const { playerName } = message;

    if (!playerName || playerName.trim().length === 0) {
        send(ws, { type: 'ERROR', message: 'Player name is required' });
        return;
    }

    const room = roomManager.createRoom(playerId, playerName.trim(), ws);
    ws.roomId = room.id;

    // Update IP tracker with room
    ipTracker.updateRoom(ws.clientIP, room.id);

    send(ws, {
        type: 'ROOM_CREATED',
        roomId: room.id,
        ...roomManager.getRoomState(room.id)
    });

    console.log(`Room created: ${room.id} by ${playerName}`);
}

// Handler: Join Room
function handleJoinRoom(ws, message, playerId, clientIP) {
    const { roomId, playerName } = message;

    if (!roomId || !playerName || playerName.trim().length === 0) {
        send(ws, { type: 'ERROR', message: 'Room ID and player name are required' });
        return;
    }

    const result = roomManager.joinRoom(roomId.toUpperCase(), playerId, playerName.trim(), ws);

    if (!result.success) {
        send(ws, { type: 'ERROR', message: result.error });
        return;
    }

    ws.roomId = roomId.toUpperCase();
    ipTracker.updateRoom(clientIP, roomId.toUpperCase());

    const roomState = roomManager.getRoomState(roomId.toUpperCase());

    if (result.isSpectator) {
        send(ws, {
            type: 'JOINED_AS_SPECTATOR',
            roomId: roomId.toUpperCase(),
            ...roomState
        });
    } else {
        send(ws, {
            type: 'ROOM_JOINED',
            roomId: roomId.toUpperCase(),
            ...roomState
        });
    }

    // Broadcast to others in room
    roomManager.broadcast(roomId.toUpperCase(), {
        type: 'PLAYER_JOINED',
        ...roomState
    }, playerId);

    // If game already started, send game state to spectator
    if (result.room.gameStarted) {
        const gameState = gameManager.getGameState(roomId.toUpperCase());
        if (gameState) {
            send(ws, { type: 'GAME_STATE', ...gameState });
        }
    }

    console.log(`${playerName} joined room ${roomId}${result.isSpectator ? ' as spectator' : ''}`);
}

// Handler: Leave Room
function handleLeaveRoom(ws, playerId, clientIP) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = roomManager.removePlayer(roomId, playerId);
    ws.roomId = null;
    ipTracker.updateRoom(clientIP, null);

    if (room) {
        const roomState = roomManager.getRoomState(roomId);
        roomManager.broadcast(roomId, {
            type: 'PLAYER_LEFT',
            playerId: playerId,
            ...roomState
        });
    }

    send(ws, { type: 'LEFT_ROOM' });
}

// Handler: Start Game
function handleStartGame(ws, playerId) {
    const roomId = ws.roomId;
    if (!roomId) {
        send(ws, { type: 'ERROR', message: 'Not in a room' });
        return;
    }

    const room = roomManager.getRoom(roomId);
    if (!room) {
        send(ws, { type: 'ERROR', message: 'Room not found' });
        return;
    }

    if (room.hostId !== playerId) {
        send(ws, { type: 'ERROR', message: 'Only host can start the game' });
        return;
    }

    if (!roomManager.canStartGame(roomId)) {
        send(ws, { type: 'ERROR', message: 'Need at least 2 players to start' });
        return;
    }

    const startResult = roomManager.startGame(roomId);
    if (!startResult.success) {
        send(ws, { type: 'ERROR', message: startResult.error });
        return;
    }

    // Initialize game
    const gameState = gameManager.initializeGame(room);

    // Broadcast game started to all
    roomManager.broadcast(roomId, {
        type: 'GAME_STARTED',
        ...gameManager.getGameState(roomId)
    });

    console.log(`Game started in room ${roomId} with ${room.players.length} players`);
}

// Handler: Roll Dice
function handleRollDice(ws, playerId) {
    const roomId = ws.roomId;
    if (!roomId) {
        send(ws, { type: 'ERROR', message: 'Not in a game' });
        return;
    }

    const result = gameManager.rollDice(roomId, playerId);

    if (!result.success) {
        send(ws, { type: 'ERROR', message: result.error });
        return;
    }

    // Broadcast dice result and updated game state
    roomManager.broadcast(roomId, {
        type: 'DICE_ROLLED',
        playerId: playerId,
        diceValue: result.diceValue,
        validMoves: result.validMoves,
        skipped: result.skipped,
        ...result.game
    });
}

// Handler: Move Piece
function handleMovePiece(ws, message, playerId) {
    const { tokenId } = message;
    const roomId = ws.roomId;

    if (!roomId) {
        send(ws, { type: 'ERROR', message: 'Not in a game' });
        return;
    }

    const result = gameManager.movePiece(roomId, playerId, tokenId);

    if (!result.success) {
        send(ws, { type: 'ERROR', message: result.error });
        return;
    }

    // Broadcast move and updated game state
    roomManager.broadcast(roomId, {
        type: 'PIECE_MOVED',
        playerId: playerId,
        tokenId: tokenId,
        captured: result.captured,
        gameOver: result.gameOver,
        winner: result.winner,
        ...result.game
    });

    if (result.gameOver) {
        console.log(`Game over in room ${roomId}. Winner: ${result.winner}`);
    }
}

// Handler: Chat message
function handleChat(ws, message, playerId) {
    const roomId = ws.roomId;
    if (!roomId) return;

    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === playerId) ||
        room.spectators.find(s => s.id === playerId);

    if (!player) return;

    roomManager.broadcast(roomId, {
        type: 'CHAT',
        playerId: playerId,
        playerName: player.name,
        message: message.text,
        timestamp: Date.now()
    });
}

// Handle player disconnect
function handleDisconnect(playerId, clientIP, roomId) {
    // Don't immediately remove - give time for reconnection
    // For now, we'll keep the IP tracked but mark as disconnected

    // If in a game, handle disconnect
    if (roomId) {
        const game = gameManager.getGame(roomId);
        if (game) {
            const result = gameManager.handleDisconnect(roomId, playerId);
            if (result) {
                roomManager.broadcast(roomId, {
                    type: 'PLAYER_DISCONNECTED',
                    playerId: playerId,
                    ...result.game
                });

                if (result.gameOver) {
                    console.log(`Game ended due to disconnection in room ${roomId}`);
                }
            }
        } else {
            // In lobby, remove from room
            const room = roomManager.removePlayer(roomId, playerId);
            if (room) {
                roomManager.broadcast(roomId, {
                    type: 'PLAYER_LEFT',
                    playerId: playerId,
                    ...roomManager.getRoomState(roomId)
                });
            }
        }
    }

    // Clean up IP tracker after a delay (allow reconnection)
    setTimeout(() => {
        const currentInfo = ipTracker.getPlayerByIP(clientIP);
        if (currentInfo && currentInfo.playerId === playerId) {
            // Still the same player, check if they reconnected
            if (!currentInfo.ws || currentInfo.ws.readyState !== 1) {
                ipTracker.unregisterIP(clientIP);
                console.log(`Cleaned up IP: ${clientIP}`);
            }
        }
    }, 30000); // 30 second grace period for reconnection
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    wss.clients.forEach(ws => {
        ws.close();
    });
    wss.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
