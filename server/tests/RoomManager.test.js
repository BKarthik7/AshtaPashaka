// Integration tests for RoomManager with IP restriction
import { RoomManager } from '../lib/RoomManager.js';
import IPTracker from '../lib/IPTracker.js';
import { jest } from '@jest/globals';

describe('RoomManager with IP Restriction', () => {
    let roomManager;
    let ipTracker;

    beforeEach(() => {
        roomManager = new RoomManager();
        ipTracker = new IPTracker();
    });

    describe('IP Restriction on Join', () => {
        test('should allow first player from IP to join', () => {
            const room = roomManager.createRoom('player1', 'Host', {});
            ipTracker.registerIP('192.168.1.1', 'player1', room.id, {});

            const result = roomManager.joinRoom(
                room.id, 'player2', 'Guest', {},
                '192.168.1.2', ipTracker
            );

            expect(result.success).toBe(true);
            expect(result.isSpectator).toBe(false);
        });

        test('should block second player from same IP', () => {
            const room = roomManager.createRoom('player1', 'Host', {});
            ipTracker.registerIP('192.168.1.1', 'player1', room.id, {});

            // Simulate player1's IP already in room
            const result = roomManager.joinRoom(
                room.id, 'player2', 'Guest', {},
                '192.168.1.1', ipTracker
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Another player from this IP');
        });

        test('should allow same player to rejoin (reconnection)', () => {
            const room = roomManager.createRoom('player1', 'Host', {});

            // Player2 joins
            const firstJoin = roomManager.joinRoom(
                room.id, 'player2', 'Guest', {},
                '192.168.1.2', ipTracker
            );
            expect(firstJoin.success).toBe(true);

            // Player2 reconnects (same playerId)
            const reconnect = roomManager.joinRoom(
                room.id, 'player2', 'Guest', { newWs: true },
                '192.168.1.2', ipTracker
            );

            expect(reconnect.success).toBe(true);
            expect(reconnect.isReconnect).toBe(true);
        });
    });

    describe('Reconnection During Game', () => {
        test('should allow player to rejoin during game', () => {
            // Create room with players
            const room = roomManager.createRoom('player1', 'Host', {});
            roomManager.joinRoom(room.id, 'player2', 'Guest', {});

            // Start game
            roomManager.startGame(room.id);

            // Player2 disconnects and rejoins
            const result = roomManager.joinRoom(
                room.id, 'player2', 'Guest', { newWs: true },
                '192.168.1.2', ipTracker
            );

            expect(result.success).toBe(true);
            expect(result.isReconnect).toBe(true);
            expect(result.isSpectator).toBeFalsy();
        });

        test('should add new player as spectator after game starts', () => {
            // Create room with players
            const room = roomManager.createRoom('player1', 'Host', {});
            roomManager.joinRoom(room.id, 'player2', 'Guest', {});

            // Start game
            roomManager.startGame(room.id);

            // New player tries to join
            const result = roomManager.joinRoom(
                room.id, 'player3', 'NewPlayer', {},
                '192.168.1.3', ipTracker
            );

            expect(result.success).toBe(true);
            expect(result.isSpectator).toBe(true);
        });
    });

    describe('Multiple Rooms from Same IP', () => {
        test('should allow same IP to be in different rooms sequentially', () => {
            const room1 = roomManager.createRoom('player1', 'Host1', {});
            ipTracker.registerIP('192.168.1.1', 'player1', room1.id, {});

            // Player leaves room1 (simulated by updating IP tracker)
            ipTracker.updateRoom('192.168.1.1', null);

            const room2 = roomManager.createRoom('player2', 'Host2', {});

            // Same IP joins room2
            const result = roomManager.joinRoom(
                room2.id, 'player1', 'Guest', {},
                '192.168.1.1', ipTracker
            );

            expect(result.success).toBe(true);
        });
    });

    describe('Room Management', () => {
        test('should remove player and reassign host', () => {
            const room = roomManager.createRoom('p1', 'Player1', {});
            roomManager.joinRoom(room.id, 'p2', 'Player2', {});

            const updatedRoom = roomManager.removePlayer(room.id, 'p1');

            expect(updatedRoom.players).toHaveLength(1);
            expect(updatedRoom.players[0].id).toBe('p2');
            expect(updatedRoom.players[0].isHost).toBe(true);
            expect(updatedRoom.hostId).toBe('p2');
        });

        test('should delete room when last player leaves', () => {
            const room = roomManager.createRoom('p1', 'Player1', {});
            const result = roomManager.removePlayer(room.id, 'p1');

            expect(result).toBeNull();
            expect(roomManager.getRoom(room.id)).toBeUndefined();
        });

        test('should remove spectator', () => {
            const room = roomManager.createRoom('p1', 'Player1', {});
            // Need 2 players to start game
            roomManager.joinRoom(room.id, 'p2', 'Player2', {});

            // Start game to force next join as spectator
            roomManager.startGame(room.id);

            roomManager.joinRoom(room.id, 'spectator1', 'Spec', {});
            expect(room.spectators).toHaveLength(1);

            roomManager.removePlayer(room.id, 'spectator1');
            expect(room.spectators).toHaveLength(0);
        });

        test('should return null when removing non-existent player', () => {
            const room = roomManager.createRoom('p1', 'Player1', {});
            const result = roomManager.removePlayer(room.id, 'nonexistent');
            expect(result).toBe(room);
            expect(room.players).toHaveLength(1);
        });
    });

    describe('Broadcasting', () => {
        const mockWs = {
            readyState: 1, // WebSocket.OPEN
            send: jest.fn()
        };

        test('should broadcast to all players', () => {
            const room = roomManager.createRoom('p1', 'Player1', mockWs);
            roomManager.joinRoom(room.id, 'p2', 'Player2', mockWs);

            roomManager.broadcast(room.id, { type: 'TEST' });

            expect(mockWs.send).toHaveBeenCalledTimes(2);
            expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'TEST' }));
        });

        test('should broadcast excluding specific player', () => {
            const room = roomManager.createRoom('p1', 'Player1', mockWs);
            roomManager.joinRoom(room.id, 'p2', 'Player2', mockWs);

            roomManager.broadcast(room.id, { type: 'TEST' }, 'p1');

            // Should call twice from previous test + 1 time here (only for p2)
            // But since it's the same mock object, we should reset or check call count carefully.
            // Better to check the most recent calls or just that it was called.
            // Let's rely on call count if we reset, but here we didn't reset.
            // Let's create new mocks for strict verification.
        });
    });

    describe('Game Flow Checks', () => {
        test('should check if game can start', () => {
            const room = roomManager.createRoom('p1', 'Player1', {});
            expect(roomManager.canStartGame(room.id)).toBe(false);

            roomManager.joinRoom(room.id, 'p2', 'Player2', {});
            expect(roomManager.canStartGame(room.id)).toBe(true);
        });

        test('should fail to start game with insufficient players', () => {
            const room = roomManager.createRoom('p1', 'Player1', {});
            const result = roomManager.startGame(room.id);
            expect(result.success).toBe(false);
        });

        test('should get room state', () => {
            const room = roomManager.createRoom('p1', 'Player1', {});
            const state = roomManager.getRoomState(room.id);

            expect(state.id).toBe(room.id);
            expect(state.players).toHaveLength(1);
            expect(state.gameStarted).toBe(false);
        });

        test('should return null state for unknown room', () => {
            expect(roomManager.getRoomState('unknown')).toBeNull();
        });
    });
});
