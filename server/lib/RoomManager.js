import { v4 as uuidv4 } from 'uuid';

// Player colors for up to 8 players
const PLAYER_COLORS = [
    { name: 'Blue', hex: '#3B82F6' },
    { name: 'Red', hex: '#EF4444' },
    { name: 'Purple', hex: '#8B5CF6' },
    { name: 'Green', hex: '#22C55E' },
    { name: 'Yellow', hex: '#EAB308' },
    { name: 'Black', hex: '#1F2937' },
    { name: 'Orange', hex: '#F97316' },
    { name: 'Pink', hex: '#EC4899' }
];

class RoomManager {
    constructor() {
        // Map: roomId -> Room object
        this.rooms = new Map();
    }

    // Generate a short room code
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }

    // Create a new room
    createRoom(hostId, hostName, hostWs) {
        let roomCode = this.generateRoomCode();
        // Ensure unique code
        while (this.rooms.has(roomCode)) {
            roomCode = this.generateRoomCode();
        }

        const room = {
            id: roomCode,
            hostId: hostId,
            players: [{
                id: hostId,
                name: hostName,
                color: PLAYER_COLORS[0],
                colorIndex: 0,
                ws: hostWs,
                isHost: true,
                isReady: false
            }],
            spectators: [],
            gameStarted: false,
            gameState: null,
            createdAt: Date.now()
        };

        this.rooms.set(roomCode, room);
        return room;
    }

    // Get room by ID
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    // Join a room
    joinRoom(roomId, playerId, playerName, playerWs) {
        const room = this.rooms.get(roomId);

        if (!room) {
            return { success: false, error: 'Room not found' };
        }

        // Check if game already started
        if (room.gameStarted) {
            // Add as spectator
            room.spectators.push({
                id: playerId,
                name: playerName,
                ws: playerWs
            });
            return { success: true, isSpectator: true, room };
        }

        // Check if room is full (8 players max)
        if (room.players.length >= 8) {
            // Add as spectator
            room.spectators.push({
                id: playerId,
                name: playerName,
                ws: playerWs
            });
            return { success: true, isSpectator: true, room };
        }

        // Add as player
        const colorIndex = room.players.length;
        room.players.push({
            id: playerId,
            name: playerName,
            color: PLAYER_COLORS[colorIndex],
            colorIndex: colorIndex,
            ws: playerWs,
            isHost: false,
            isReady: false
        });

        return { success: true, isSpectator: false, room };
    }

    // Remove player from room
    removePlayer(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        // Check if player
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);

            // If host left and game hasn't started, assign new host
            if (room.players.length > 0 && !room.gameStarted) {
                // Reassign colors
                room.players.forEach((p, i) => {
                    p.color = PLAYER_COLORS[i];
                    p.colorIndex = i;
                });
                room.players[0].isHost = true;
                room.hostId = room.players[0].id;
            }

            // Delete room if empty
            if (room.players.length === 0) {
                this.rooms.delete(roomId);
                return null;
            }

            return room;
        }

        // Check if spectator
        const spectatorIndex = room.spectators.findIndex(s => s.id === playerId);
        if (spectatorIndex !== -1) {
            room.spectators.splice(spectatorIndex, 1);
            return room;
        }

        return room;
    }

    // Check if player can start game (minimum 2 players)
    canStartGame(roomId) {
        const room = this.rooms.get(roomId);
        return room && room.players.length >= 2;
    }

    // Start the game
    startGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.length < 2) {
            return { success: false, error: 'Not enough players' };
        }

        room.gameStarted = true;
        return { success: true, room };
    }

    // Get room state for broadcasting
    getRoomState(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        return {
            id: room.id,
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                colorIndex: p.colorIndex,
                isHost: p.isHost,
                isReady: p.isReady
            })),
            spectators: room.spectators.map(s => ({
                id: s.id,
                name: s.name
            })),
            gameStarted: room.gameStarted,
            playerCount: room.players.length,
            spectatorCount: room.spectators.length
        };
    }

    // Broadcast to all in room (players + spectators)
    broadcast(roomId, message, excludeId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const data = JSON.stringify(message);

        room.players.forEach(p => {
            if (p.id !== excludeId && p.ws && p.ws.readyState === 1) {
                p.ws.send(data);
            }
        });

        room.spectators.forEach(s => {
            if (s.id !== excludeId && s.ws && s.ws.readyState === 1) {
                s.ws.send(data);
            }
        });
    }

    // Broadcast to players only
    broadcastToPlayers(roomId, message, excludeId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const data = JSON.stringify(message);

        room.players.forEach(p => {
            if (p.id !== excludeId && p.ws && p.ws.readyState === 1) {
                p.ws.send(data);
            }
        });
    }
}

export { RoomManager, PLAYER_COLORS };
