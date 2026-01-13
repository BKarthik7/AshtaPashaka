import { useMemo } from 'react';
import './GameBoard.css';

// Player colors (8 positions around the board)
const PLAYER_COLORS = [
    { name: 'Blue', hex: '#3B82F6', light: '#DBEAFE' },
    { name: 'Red', hex: '#EF4444', light: '#FEE2E2' },
    { name: 'Purple', hex: '#8B5CF6', light: '#EDE9FE' },
    { name: 'Green', hex: '#22C55E', light: '#DCFCE7' },
    { name: 'Yellow', hex: '#EAB308', light: '#FEF9C3' },
    { name: 'Black', hex: '#374151', light: '#E5E7EB' },
    { name: 'Orange', hex: '#F97316', light: '#FFEDD5' },
    { name: 'Pink', hex: '#EC4899', light: '#FCE7F3' }
];

const CELLS_PER_PLAYER = 13;
const TOTAL_TRACK_CELLS = CELLS_PER_PLAYER * 8;

function GameBoard({
    gameState,
    validMoves = [],
    onPieceClick,
    currentPlayerId,
    myPlayerId,
    isMyTurn
}) {
    // INCREASED board size to fit everything
    const boardSize = 800;
    const center = boardSize / 2;

    const boardLayout = useMemo(() => {
        const playerCount = gameState?.playerCount || 8;
        const homeBases = [];
        const trackCells = [];
        const homeStretchCells = [];

        // Home base positions - PUSHED FURTHER OUT into corners
        const homePositions = [
            { x: center, y: 50 },           // Top (Blue)
            { x: 700, y: 115 },             // Top-right (Red)
            { x: 750, y: center },          // Right (Purple)
            { x: 700, y: 685 },             // Bottom-right (Green)
            { x: center, y: 750 },          // Bottom (Yellow)
            { x: 100, y: 685 },             // Bottom-left (Black)
            { x: 50, y: center },           // Left (Orange)
            { x: 100, y: 115 }              // Top-left (Pink)
        ];

        for (let i = 0; i < 8; i++) {
            const pos = homePositions[i];
            const color = PLAYER_COLORS[i];
            const isActive = i < playerCount;

            homeBases.push({
                playerIndex: i,
                x: pos.x,
                y: pos.y,
                color,
                isActive
            });
        }

        // Main track - WAVY PATTERN with 8 waves (one per player section)
        const baseRadius = 260;
        const waveAmplitude = 40; // How much the wave goes in/out
        const whiteCells = [];
        const coloredCells = [];

        for (let cellId = 0; cellId < TOTAL_TRACK_CELLS; cellId++) {
            const playerSection = Math.floor(cellId / CELLS_PER_PLAYER);
            const localIndex = cellId % CELLS_PER_PLAYER;

            // Angle for this cell (evenly distributed)
            const anglePerCell = 360 / TOTAL_TRACK_CELLS;
            const angle = -90 + cellId * anglePerCell;
            const angleRad = (angle * Math.PI) / 180;

            // Create 8 waves around the circle (one wave per player section)
            const waveAngle = cellId * (2 * Math.PI / CELLS_PER_PLAYER);
            const waveOffset = Math.sin(waveAngle) * waveAmplitude;
            const currentRadius = baseRadius + waveOffset;

            const x = center + Math.cos(angleRad) * currentRadius;
            const y = center + Math.sin(angleRad) * currentRadius;

            const isStart = localIndex === 0;
            const cell = {
                id: cellId,
                playerSection,
                localIndex,
                x,
                y,
                isStart,
                color: isStart ? PLAYER_COLORS[playerSection] : null
            };

            if (isStart) {
                coloredCells.push(cell);
            } else {
                whiteCells.push(cell);
            }
        }

        // Combine: white first (bottom), colored on top
        trackCells.push(...whiteCells, ...coloredCells);

        // Home stretch cells - from track toward center
        for (let playerIdx = 0; playerIdx < 8; playerIdx++) {
            const color = PLAYER_COLORS[playerIdx];
            const playerAngle = -90 + playerIdx * 45;
            const angleRad = (playerAngle * Math.PI) / 180;

            for (let stretchIdx = 0; stretchIdx < 4; stretchIdx++) {
                // Start at 185 (inside the wave trough), go toward diamond
                const stretchRadius = 185 - stretchIdx * 35;
                const x = center + Math.cos(angleRad) * stretchRadius;
                const y = center + Math.sin(angleRad) * stretchRadius;

                homeStretchCells.push({
                    id: `stretch_${playerIdx}_${stretchIdx}`,
                    playerIndex: playerIdx,
                    stretchPos: stretchIdx,
                    x,
                    y,
                    color
                });
            }
        }

        return { homeBases, trackCells, homeStretchCells };
    }, [gameState?.playerCount]);

    // Calculate finished pieces count per player
    const finishedCounts = useMemo(() => {
        const counts = {};
        if (gameState?.pieces) {
            Object.entries(gameState.pieces).forEach(([playerId, playerPieces]) => {
                const finished = playerPieces.tokens.filter(t => t.position === 'finished').length;
                counts[playerId] = { count: finished, colorIndex: playerPieces.colorIndex };
            });
        }
        return counts;
    }, [gameState?.pieces]);

    const getPiecePosition = (token, playerColorIndex) => {
        if (token.position === 'home') {
            const homeBase = boardLayout.homeBases[playerColorIndex];
            if (!homeBase) return null;

            const offsets = [[-18, -18], [18, -18], [-18, 18], [18, 18]];
            const [ox, oy] = offsets[token.homePosition] || [0, 0];
            return { x: homeBase.x + ox, y: homeBase.y + oy, inHome: true };
        }

        if (token.position === 'finished') {
            return null;
        }

        if (typeof token.position === 'string' && token.position.startsWith('home_stretch_')) {
            const stretchPos = parseInt(token.position.split('_')[2]);
            const stretchCell = boardLayout.homeStretchCells.find(
                c => c.playerIndex === playerColorIndex && c.stretchPos === stretchPos
            );
            if (stretchCell) return { x: stretchCell.x, y: stretchCell.y };
        }

        if (typeof token.position === 'number') {
            const cell = boardLayout.trackCells.find(c => c.id === token.position);
            if (cell) return { x: cell.x, y: cell.y };
        }

        return null;
    };

    const canMoveToken = (playerId, tokenId) => {
        return validMoves.some(m => m.tokenId === tokenId) &&
            playerId === myPlayerId &&
            isMyTurn;
    };

    const handlePieceClick = (playerId, tokenId) => {
        if (canMoveToken(playerId, tokenId)) {
            onPieceClick?.(tokenId);
        }
    };

    return (
        <div className="game-board-wrapper">
            <svg viewBox={`0 0 ${boardSize} ${boardSize}`} className="game-board-svg">
                {/* Background */}
                <rect x="15" y="15" width={boardSize - 30} height={boardSize - 30} rx="20" fill="#FEF9C3" />

                {/* Border */}
                <rect
                    x="25" y="25"
                    width={boardSize - 50} height={boardSize - 50}
                    rx="15" fill="none" stroke="#65A30D" strokeWidth="8"
                />

                {/* Home Bases */}
                {boardLayout.homeBases.map((base, i) => (
                    <g key={`home-${i}`} opacity={base.isActive ? 1 : 0.25}>
                        <rect
                            x={base.x - 42}
                            y={base.y - 42}
                            width={84}
                            height={84}
                            rx="14"
                            fill={base.color.light}
                            stroke={base.color.hex}
                            strokeWidth="3"
                        />
                        {[[-16, -16], [16, -16], [-16, 16], [16, 16]].map(([ox, oy], slotIdx) => (
                            <circle
                                key={`slot-${i}-${slotIdx}`}
                                cx={base.x + ox}
                                cy={base.y + oy}
                                r="12"
                                fill={base.color.hex}
                                opacity="0.3"
                                stroke={base.color.hex}
                                strokeWidth="2"
                            />
                        ))}
                    </g>
                ))}

                {/* Main Track - White cells (bottom layer) */}
                {boardLayout.trackCells.filter(c => !c.isStart).map((cell) => (
                    <circle
                        key={`track-${cell.id}`}
                        cx={cell.x}
                        cy={cell.y}
                        r="8"
                        fill="#FFFFFF"
                        stroke="#1F2937"
                        strokeWidth="1.5"
                    />
                ))}

                {/* Home Stretch Cells - Colored */}
                {boardLayout.homeStretchCells.map((cell) => (
                    <circle
                        key={cell.id}
                        cx={cell.x}
                        cy={cell.y}
                        r="10"
                        fill={cell.color.hex}
                        stroke="#1F2937"
                        strokeWidth="2"
                    />
                ))}

                {/* Main Track - Colored start cells (top layer) */}
                {boardLayout.trackCells.filter(c => c.isStart).map((cell) => (
                    <circle
                        key={`track-start-${cell.id}`}
                        cx={cell.x}
                        cy={cell.y}
                        r="10"
                        fill={cell.color.hex}
                        stroke="#1F2937"
                        strokeWidth="2"
                    />
                ))}

                {/* Center Diamond */}
                <g transform={`translate(${center}, ${center})`}>
                    <polygon points="0,-50 50,0 0,50 -50,0" fill="#FFFFFF" stroke="#1F2937" strokeWidth="3" />
                    <polygon points="0,-36 36,0 0,36 -36,0" fill="#FEF9C3" stroke="#1F2937" strokeWidth="2" />

                    {/* Finished pieces display */}
                    {gameState?.pieces && Object.entries(finishedCounts).map(([playerId, data]) => {
                        if (data.count === 0) return null;

                        const color = PLAYER_COLORS[data.colorIndex];
                        const angle = (-90 + data.colorIndex * 45) * Math.PI / 180;
                        const radius = 20;
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;

                        return (
                            <g key={`finished-${playerId}`}>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="11"
                                    fill={color.hex}
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                />
                                <text
                                    x={x}
                                    y={y + 4}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="bold"
                                    fill="#FFFFFF"
                                >
                                    {data.count}
                                </text>
                            </g>
                        );
                    })}
                </g>

                {/* Game Pieces */}
                {gameState?.pieces && Object.entries(gameState.pieces).map(([playerId, playerPieces]) => (
                    playerPieces.tokens.map(token => {
                        const pos = getPiecePosition(token, playerPieces.colorIndex);
                        if (!pos) return null;

                        const isMovable = canMoveToken(playerId, token.id);
                        const color = PLAYER_COLORS[playerPieces.colorIndex];

                        return (
                            <g
                                key={`piece-${playerId}-${token.id}`}
                                className={`game-piece ${isMovable ? 'movable' : ''}`}
                                onClick={() => handlePieceClick(playerId, token.id)}
                                style={{ pointerEvents: isMovable ? 'auto' : 'none' }}
                            >
                                <circle
                                    cx={pos.x + 1}
                                    cy={pos.y + 2}
                                    r={pos.inHome ? 10 : 11}
                                    fill="rgba(0,0,0,0.2)"
                                />
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r={pos.inHome ? 10 : 11}
                                    fill={color.hex}
                                    stroke="#FFFFFF"
                                    strokeWidth="2.5"
                                />
                                <circle
                                    cx={pos.x - 2}
                                    cy={pos.y - 2}
                                    r={2}
                                    fill="rgba(255,255,255,0.5)"
                                />
                                {isMovable && (
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={pos.inHome ? 14 : 15}
                                        fill="none"
                                        stroke="#FFD700"
                                        strokeWidth="2.5"
                                        strokeDasharray="4 2"
                                    />
                                )}
                            </g>
                        );
                    })
                ))}
            </svg>
        </div>
    );
}

export default GameBoard;
