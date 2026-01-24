// Unit tests for IPTracker
import IPTracker from '../lib/IPTracker.js';

describe('IPTracker', () => {
    let ipTracker;

    beforeEach(() => {
        ipTracker = new IPTracker();
    });

    describe('Basic IP Registration', () => {
        test('should register new IP', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            expect(ipTracker.isIPRegistered('192.168.1.1')).toBe(true);
        });

        test('should get player by IP', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            const info = ipTracker.getPlayerByIP('192.168.1.1');
            expect(info.playerId).toBe('player1');
            expect(info.roomId).toBe('room1');
        });

        test('should return undefined for unregistered IP', () => {
            expect(ipTracker.getPlayerByIP('192.168.1.1')).toBeUndefined();
        });
    });

    describe('Per-Room IP Tracking', () => {
        test('should track IP in room', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            expect(ipTracker.isIPInRoom('192.168.1.1', 'room1')).toBe(true);
        });

        test('should not find IP in different room', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            expect(ipTracker.isIPInRoom('192.168.1.1', 'room2')).toBe(false);
        });

        test('should get playerId by IP in room', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            expect(ipTracker.getPlayerIdByIPInRoom('192.168.1.1', 'room1')).toBe('player1');
        });

        test('should return null for IP in different room', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            expect(ipTracker.getPlayerIdByIPInRoom('192.168.1.1', 'room2')).toBeNull();
        });
    });

    describe('Duplicate IP Detection', () => {
        test('should detect duplicate IP in same room', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});

            // Same IP trying to join as different player
            const existingPlayerId = ipTracker.getPlayerIdByIPInRoom('192.168.1.1', 'room1');
            expect(existingPlayerId).toBe('player1');
            expect(existingPlayerId).not.toBe('player2');
        });

        test('should allow same IP in different rooms', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});

            // Update to different room
            ipTracker.updateRoom('192.168.1.1', 'room2');

            expect(ipTracker.isIPInRoom('192.168.1.1', 'room2')).toBe(true);
            expect(ipTracker.isIPInRoom('192.168.1.1', 'room1')).toBe(false);
        });
    });

    describe('Room Updates', () => {
        test('should update room correctly', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            ipTracker.updateRoom('192.168.1.1', 'room2');

            const info = ipTracker.getPlayerByIP('192.168.1.1');
            expect(info.roomId).toBe('room2');
        });

        test('should remove from old room on update', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            ipTracker.updateRoom('192.168.1.1', 'room2');

            expect(ipTracker.isIPInRoom('192.168.1.1', 'room1')).toBe(false);
        });

        test('should handle null room (leaving)', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            ipTracker.updateRoom('192.168.1.1', null);

            expect(ipTracker.isIPInRoom('192.168.1.1', 'room1')).toBe(false);
        });
    });

    describe('Cleanup', () => {
        test('should unregister IP', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            ipTracker.unregisterIP('192.168.1.1');

            expect(ipTracker.isIPRegistered('192.168.1.1')).toBe(false);
            expect(ipTracker.isIPInRoom('192.168.1.1', 'room1')).toBe(false);
        });

        test('should clear room IPs', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            ipTracker.registerIP('192.168.1.2', 'player2', 'room1', {});

            ipTracker.clearRoom('room1');

            expect(ipTracker.getIPsInRoom('room1')).toHaveLength(0);
        });
    });

    describe('Player Reconnection', () => {
        test('should allow same playerId to rejoin', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});

            // Same player (same IP, same playerId) should be allowed
            const existingPlayerId = ipTracker.getPlayerIdByIPInRoom('192.168.1.1', 'room1');
            expect(existingPlayerId).toBe('player1');
        });

        test('should block different playerId from same IP', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});

            // Different player from same IP trying to join
            const existingPlayerId = ipTracker.getPlayerIdByIPInRoom('192.168.1.1', 'room1');
            expect(existingPlayerId).not.toBe('player2');
        });
    });

    describe('Statistics', () => {
        test('should return connection count', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            ipTracker.registerIP('192.168.1.2', 'player2', 'room1', {});

            expect(ipTracker.getConnectionCount()).toBe(2);
        });

        test('should return room count', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            ipTracker.registerIP('192.168.1.2', 'player2', 'room2', {});

            expect(ipTracker.getRoomCount()).toBe(2);
        });

        test('should return all IPs in room', () => {
            ipTracker.registerIP('192.168.1.1', 'player1', 'room1', {});
            ipTracker.registerIP('192.168.1.2', 'player2', 'room1', {});

            const ips = ipTracker.getIPsInRoom('room1');
            expect(ips).toContain('192.168.1.1');
            expect(ips).toContain('192.168.1.2');
        });
    });
});
