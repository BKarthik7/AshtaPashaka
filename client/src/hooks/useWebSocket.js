import { useState, useEffect, useCallback, useRef } from 'react';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://10.20.19.137:3001';

export function useWebSocket() {
    const [isConnected, setIsConnected] = useState(false);
    const [playerId, setPlayerId] = useState(null);
    const [error, setError] = useState(null);
    const wsRef = useRef(null);
    const messageHandlersRef = useRef(new Map());
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            wsRef.current = new WebSocket(WS_URL);

            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                setError(null);
                reconnectAttemptsRef.current = 0;
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);

                // Attempt to reconnect
                if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current++;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
                    console.log(`Reconnecting in ${delay}ms... (attempt ${reconnectAttemptsRef.current})`);
                    reconnectTimeoutRef.current = setTimeout(connect, delay);
                } else {
                    setError('Connection lost. Please refresh the page.');
                }
            };

            wsRef.current.onerror = (e) => {
                console.error('WebSocket error:', e);
                setError('Connection error');
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('Received:', message.type, message);

                    // Handle connection messages
                    if (message.type === 'CONNECTED' || message.type === 'RECONNECTED') {
                        setPlayerId(message.playerId);
                    }

                    // Call registered handlers
                    const handlers = messageHandlersRef.current.get(message.type) || [];
                    handlers.forEach(handler => handler(message));

                    // Call wildcard handlers
                    const wildcardHandlers = messageHandlersRef.current.get('*') || [];
                    wildcardHandlers.forEach(handler => handler(message));
                } catch (err) {
                    console.error('Failed to parse message:', err);
                }
            };
        } catch (err) {
            console.error('Failed to connect:', err);
            setError('Failed to connect to server');
        }
    }, []);

    // Disconnect
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    // Send message
    const send = useCallback((type, data = {}) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            const message = { type, ...data };
            console.log('Sending:', type, message);
            wsRef.current.send(JSON.stringify(message));
            return true;
        }
        console.warn('WebSocket not connected');
        return false;
    }, []);

    // Register message handler
    const on = useCallback((type, handler) => {
        if (!messageHandlersRef.current.has(type)) {
            messageHandlersRef.current.set(type, []);
        }
        messageHandlersRef.current.get(type).push(handler);

        // Return unsubscribe function
        return () => {
            const handlers = messageHandlersRef.current.get(type);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        };
    }, []);

    // Remove all handlers for a type
    const off = useCallback((type) => {
        messageHandlersRef.current.delete(type);
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        playerId,
        error,
        send,
        on,
        off,
        connect,
        disconnect
    };
}

export default useWebSocket;
