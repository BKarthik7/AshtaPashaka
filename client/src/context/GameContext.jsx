import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';

const GameContext = createContext(null);

export function GameProvider({ children }) {
    const ws = useWebSocket();

    // Player state
    const [playerName, setPlayerName] = useState('');
    const [isSpectator, setIsSpectator] = useState(false);

    // Room state
    const [roomId, setRoomId] = useState(null);
    const [players, setPlayers] = useState([]);
    const [spectators, setSpectators] = useState([]);
    const [isHost, setIsHost] = useState(false);

    // Game state
    const [gameStarted, setGameStarted] = useState(false);
    const [gameState, setGameState] = useState(null);
    const [diceValue, setDiceValue] = useState(null);
    const [validMoves, setValidMoves] = useState([]);
    const [currentTurnPlayerId, setCurrentTurnPlayerId] = useState(null);
    const [winner, setWinner] = useState(null);

    // UI state
    const [toast, setToast] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Show toast notification
    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    // Create room
    const createRoom = useCallback((name) => {
        if (!name.trim()) {
            showToast('Please enter your name', 'error');
            return false;
        }
        setPlayerName(name.trim());
        ws.send('CREATE_ROOM', { playerName: name.trim() });
        setIsLoading(true);
        return true;
    }, [ws, showToast]);

    // Join room
    const joinRoom = useCallback((code, name) => {
        if (!code.trim() || !name.trim()) {
            showToast('Please enter room code and your name', 'error');
            return false;
        }
        setPlayerName(name.trim());
        ws.send('JOIN_ROOM', { roomId: code.trim().toUpperCase(), playerName: name.trim() });
        setIsLoading(true);
        return true;
    }, [ws, showToast]);

    // Leave room
    const leaveRoom = useCallback(() => {
        ws.send('LEAVE_ROOM');
        setRoomId(null);
        setPlayers([]);
        setSpectators([]);
        setGameStarted(false);
        setGameState(null);
        setIsSpectator(false);
        setIsHost(false);
        setWinner(null);
    }, [ws]);

    // Start game
    const startGame = useCallback(() => {
        if (players.length < 2) {
            showToast('Need at least 2 players to start', 'error');
            return;
        }
        ws.send('START_GAME');
    }, [ws, players.length, showToast]);

    // Roll dice
    const rollDice = useCallback(() => {
        if (currentTurnPlayerId !== ws.playerId) {
            showToast('Not your turn!', 'error');
            return;
        }
        ws.send('ROLL_DICE');
    }, [ws, currentTurnPlayerId, showToast]);

    // Move piece
    const movePiece = useCallback((tokenId) => {
        if (currentTurnPlayerId !== ws.playerId) {
            showToast('Not your turn!', 'error');
            return;
        }
        ws.send('MOVE_PIECE', { tokenId });
    }, [ws, currentTurnPlayerId, showToast]);

    // Check if it's my turn
    const isMyTurn = currentTurnPlayerId === ws.playerId;

    // Get my player info
    const myPlayer = players.find(p => p.id === ws.playerId);

    // Handle WebSocket messages
    useEffect(() => {
        const unsubscribers = [];

        // Room created
        unsubscribers.push(ws.on('ROOM_CREATED', (msg) => {
            setRoomId(msg.roomId);
            setPlayers(msg.players || []);
            setIsHost(true);
            setIsLoading(false);
            showToast(`Room created: ${msg.roomId}`, 'success');
        }));

        // Room joined
        unsubscribers.push(ws.on('ROOM_JOINED', (msg) => {
            setRoomId(msg.roomId);
            setPlayers(msg.players || []);
            setSpectators(msg.spectators || []);
            setIsSpectator(false);
            setIsHost(msg.players?.find(p => p.id === ws.playerId)?.isHost || false);
            setIsLoading(false);
            showToast('Joined room!', 'success');
        }));

        // Joined as spectator
        unsubscribers.push(ws.on('JOINED_AS_SPECTATOR', (msg) => {
            setRoomId(msg.roomId);
            setPlayers(msg.players || []);
            setSpectators(msg.spectators || []);
            setIsSpectator(true);
            setIsLoading(false);
            showToast('Joined as spectator (room is full or game started)', 'info');
        }));

        // Room state update
        unsubscribers.push(ws.on('ROOM_STATE', (msg) => {
            setPlayers(msg.players || []);
            setSpectators(msg.spectators || []);
            setGameStarted(msg.gameStarted || false);
        }));

        // Player joined
        unsubscribers.push(ws.on('PLAYER_JOINED', (msg) => {
            setPlayers(msg.players || []);
            setSpectators(msg.spectators || []);
        }));

        // Player left
        unsubscribers.push(ws.on('PLAYER_LEFT', (msg) => {
            setPlayers(msg.players || []);
            setSpectators(msg.spectators || []);
            // Check if I'm now host
            const me = msg.players?.find(p => p.id === ws.playerId);
            if (me?.isHost) setIsHost(true);
        }));

        // Left room
        unsubscribers.push(ws.on('LEFT_ROOM', () => {
            setRoomId(null);
            setPlayers([]);
            setSpectators([]);
            setGameStarted(false);
            setGameState(null);
        }));

        // Game started
        unsubscribers.push(ws.on('GAME_STARTED', (msg) => {
            setGameStarted(true);
            setGameState(msg);
            setPlayers(msg.players || []);
            setCurrentTurnPlayerId(msg.currentPlayerId);
            showToast('Game started!', 'success');
        }));

        // Dice rolled
        unsubscribers.push(ws.on('DICE_ROLLED', (msg) => {
            setDiceValue(msg.diceValue);
            setValidMoves(msg.validMoves || []);
            setGameState(prev => ({ ...prev, ...msg }));
            setCurrentTurnPlayerId(msg.currentPlayerId);

            if (msg.skipped && msg.playerId !== ws.playerId) {
                showToast(`${players.find(p => p.id === msg.playerId)?.name || 'Player'} has no valid moves, turn skipped`, 'info');
            }
        }));

        // Piece moved
        unsubscribers.push(ws.on('PIECE_MOVED', (msg) => {
            setGameState(prev => ({ ...prev, ...msg }));
            setCurrentTurnPlayerId(msg.currentPlayerId);
            setDiceValue(msg.diceValue);
            setValidMoves([]);

            if (msg.captured) {
                const capturedPlayerName = players.find(p => p.id === msg.captured.playerId)?.name || 'Player';
                showToast(`${capturedPlayerName}'s piece was captured!`, 'info');
            }

            if (msg.gameOver) {
                setWinner(msg.winner);
                const winnerName = players.find(p => p.id === msg.winner)?.name || 'Someone';
                showToast(`🎉 ${winnerName} wins!`, 'success');
            }
        }));

        // Game state update
        unsubscribers.push(ws.on('GAME_STATE', (msg) => {
            setGameState(msg);
            setCurrentTurnPlayerId(msg.currentPlayerId);
            setDiceValue(msg.diceValue);
        }));

        // Player disconnected
        unsubscribers.push(ws.on('PLAYER_DISCONNECTED', (msg) => {
            setGameState(prev => ({ ...prev, ...msg }));
            setPlayers(msg.players || players.filter(p => p.id !== msg.playerId));
            if (msg.gameOver) {
                setWinner(msg.winner);
            }
        }));

        // Error
        unsubscribers.push(ws.on('ERROR', (msg) => {
            showToast(msg.message, 'error');
            setIsLoading(false);
        }));

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [ws, showToast, players]);

    const value = {
        // Connection
        isConnected: ws.isConnected,
        playerId: ws.playerId,
        connectionError: ws.error,

        // Player
        playerName,
        isSpectator,
        isHost,
        myPlayer,

        // Room
        roomId,
        players,
        spectators,

        // Game
        gameStarted,
        gameState,
        diceValue,
        validMoves,
        currentTurnPlayerId,
        isMyTurn,
        winner,

        // Actions
        createRoom,
        joinRoom,
        leaveRoom,
        startGame,
        rollDice,
        movePiece,

        // UI
        toast,
        isLoading,
        showToast
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

export default GameContext;
