
import GameManager from '../lib/GameManager.js';
import { PLAYER_COLORS } from '../lib/RoomManager.js';
import { jest } from '@jest/globals';

describe('GameManager', () => {
    let gameManager;
    let mockRoom;
    let mockRoom3Players;

    beforeEach(() => {
        gameManager = new GameManager();
        mockRoom = {
            id: 'TEST_ROOM',
            players: [
                { id: 'p1', name: 'Player1', colorIndex: 0 },
                { id: 'p2', name: 'Player2', colorIndex: 1 }
            ]
        };
        mockRoom3Players = {
            id: 'TEST_ROOM_3',
            players: [
                { id: 'p1', name: 'Player1', colorIndex: 0 },
                { id: 'p2', name: 'Player2', colorIndex: 1 },
                { id: 'p3', name: 'Player3', colorIndex: 2 }
            ]
        };
    });

    describe('Game Initialization', () => {
        test('should initialize game correctly', () => {
            const game = gameManager.initializeGame(mockRoom);

            expect(game.roomId).toBe('TEST_ROOM');
            expect(game.players).toHaveLength(2);
            expect(game.phase).toBe('ROLL_DICE');
            expect(game.currentPlayerId).toBe('p1');
            expect(game.pieces['p1']).toBeDefined();
            expect(game.pieces['p2']).toBeDefined();
            expect(game.pieces['p1'].tokens).toHaveLength(4);
        });

        test('should get game state', () => {
            gameManager.initializeGame(mockRoom);
            const state = gameManager.getGameState('TEST_ROOM');

            expect(state).not.toBeNull();
            expect(state.roomId).toBe('TEST_ROOM');
            expect(state.currentPlayerId).toBe('p1');
        });

        test('should return null for non-existent game', () => {
            expect(gameManager.getGame('NON_EXISTENT')).toBeUndefined();
            expect(gameManager.getGameState('NON_EXISTENT')).toBeNull();
        });
    });

    describe('Dice Rolling', () => {
        beforeEach(() => {
            gameManager.initializeGame(mockRoom);
            // Mock random to always return 0.9 (which * 6 = 5.4 -> floor 5 -> +1 = 6)
            // Rolling 6 allows exit home, so turns won't auto-skip
            jest.spyOn(Math, 'random').mockReturnValue(0.9);
        });

        afterEach(() => {
            jest.spyOn(Math, 'random').mockRestore();
        });

        test('should allow current player to roll dice', () => {
            const result = gameManager.rollDice('TEST_ROOM', 'p1');

            expect(result.success).toBe(true);
            expect(result.diceValue).toBe(6);
            expect(result.game.diceRolled).toBe(true);
        });

        test('should not allow non-current player to roll', () => {
            const result = gameManager.rollDice('TEST_ROOM', 'p2');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Not your turn');
        });

        test('should not allow rolling twice', () => {
            gameManager.rollDice('TEST_ROOM', 'p1');
            const result = gameManager.rollDice('TEST_ROOM', 'p1');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Already rolled');
        });
    });

    describe('Movement Logic', () => {
        beforeEach(() => {
            gameManager.initializeGame(mockRoom);
        });

        test('should calculate valid moves for 6 (exit home)', () => {
            // Mock dice roll to 6
            const game = gameManager.getGame('TEST_ROOM');
            game.diceValue = 6;
            game.diceRolled = true;
            game.phase = 'SELECT_PIECE';

            const moves = gameManager.getValidMoves('TEST_ROOM', 'p1');

            // All 4 pieces are at home, so all should be valid to exit
            expect(moves).toHaveLength(4);
            expect(moves[0].type).toBe('EXIT_HOME');
        });

        test('should have no valid moves for non-6 when all at home', () => {
            // Mock dice roll to 5
            const game = gameManager.getGame('TEST_ROOM');
            game.diceValue = 5;
            game.diceRolled = true;
            game.phase = 'SELECT_PIECE';

            const moves = gameManager.getValidMoves('TEST_ROOM', 'p1');
            expect(moves).toHaveLength(0);
        });

        test('should move piece out of home on 6', () => {
            // Mock dice roll to 6
            const game = gameManager.getGame('TEST_ROOM');
            game.diceValue = 6;
            game.diceRolled = true;

            // Move token 0
            const result = gameManager.movePiece('TEST_ROOM', 'p1', 0);

            expect(result.success).toBe(true);
            expect(game.pieces['p1'].tokens[0].position).toBe(0); // Start pos for p1
            // Should get another turn on 6
            expect(game.currentPlayerId).toBe('p1');
            expect(game.phase).toBe('ROLL_DICE');
        });

        test('should move piece on track', () => {
            // Setup: Piece 0 is already out at position 0
            const game = gameManager.getGame('TEST_ROOM');
            game.pieces['p1'].tokens[0].position = 0;

            // Roll 4
            game.diceValue = 4;
            game.diceRolled = true;

            const result = gameManager.movePiece('TEST_ROOM', 'p1', 0);

            expect(result.success).toBe(true);
            expect(game.pieces['p1'].tokens[0].position).toBe(4);
            // Turn should pass to p2
            expect(game.currentPlayerId).toBe('p2');
        });
    });

    describe('Capture Logic', () => {
        beforeEach(() => {
            gameManager.initializeGame(mockRoom);
        });

        test('should capture opponent piece', () => {
            const game = gameManager.getGame('TEST_ROOM');

            // P1 token at pos 10
            game.pieces['p1'].tokens[0].position = 10;

            // P2 token at pos 5
            game.pieces['p2'].tokens[0].position = 5;

            // P2's turn to move from 5 to 10 (roll 5)
            game.currentPlayerId = 'p2';
            game.diceValue = 5;
            game.diceRolled = true;

            const result = gameManager.movePiece('TEST_ROOM', 'p2', 0);

            expect(result.success).toBe(true);
            expect(result.captured).not.toBeNull();
            expect(result.captured.playerId).toBe('p1');

            // P1 token should be sent home
            expect(game.pieces['p1'].tokens[0].position).toBe('home');
            // P2 token should be at 10
            expect(game.pieces['p2'].tokens[0].position).toBe(10);
        });
    });

    describe('Turn Management', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            gameManager.initializeGame(mockRoom);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should switch turn on nextTurn', () => {
            gameManager.nextTurn('TEST_ROOM');
            const game = gameManager.getGame('TEST_ROOM');
            expect(game.currentPlayerId).toBe('p2');
        });

        test('should handle turn timeout', () => {
            const onTimeUp = jest.fn();
            gameManager.startTurnTimer('TEST_ROOM', onTimeUp);

            jest.advanceTimersByTime(11000); // > 10s limit

            expect(onTimeUp).toHaveBeenCalled();
            const game = gameManager.getGame('TEST_ROOM');
            expect(game.currentPlayerId).toBe('p2'); // Turn switched
        });

        test('should clear timer', () => {
            const onTimeUp = jest.fn();
            gameManager.startTurnTimer('TEST_ROOM', onTimeUp);
            gameManager.clearTurnTimer('TEST_ROOM');

            jest.advanceTimersByTime(11000);
            expect(onTimeUp).not.toHaveBeenCalled();
        });
    });

    describe('Disconnect Handling', () => {
        beforeEach(() => {
            // No default init here, done in tests
        });

        test('should handle current player disconnect (pass turn)', () => {
            gameManager.initializeGame(mockRoom3Players); // 3 players

            // p1 is current
            const result = gameManager.handleDisconnect('TEST_ROOM_3', 'p1');

            expect(result.gameOver).toBe(false);
            const game = gameManager.getGame('TEST_ROOM_3');

            // p1 removed, p2 should be current (bug fixed)
            expect(game.players).toHaveLength(2);
            expect(game.currentPlayerId).toBe('p2');
        });

        test('should end game if only 1 player left', () => {
            gameManager.initializeGame(mockRoom); // 2 players

            const result = gameManager.handleDisconnect('TEST_ROOM', 'p2');

            expect(result.gameOver).toBe(true);
            expect(result.game.winner).toBe('p1');
        });
    });
});
