// Integration tests for RoomManager with IP restriction
import { RoomManager } from '../lib/RoomManager.js';
import IPTracker from '../lib/IPTracker.js';

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
});
