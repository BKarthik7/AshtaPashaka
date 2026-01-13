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

// IMPORTANT: Backend uses 13 cells per player = 104 total cells
// We need to match this exactly for proper movement
const CELLS_PER_PLAYER = 13;
const TOTAL_TRACK_CELLS = CELLS_PER_PLAYER * 8; // 104 cells

function GameBoard({
    gameState,
    validMoves = [],
    onPieceClick,
    currentPlayerId,
    myPlayerId,
    isMyTurn
}) {
    const boardSize = 700;
    const center = boardSize / 2;

    const boardLayout = useMemo(() => {
        const playerCount = gameState?.playerCount || 8;
        const homeBases = [];
        const trackCells = [];
        const homeStretchCells = [];

        // Home base positions (in corners/edges)
        const homePositions = [
            { x: center, y: 70 },          // Top (Blue) - player 0
            { x: 590, y: 140 },            // Top-right (Red) - player 1
            { x: 630, y: center },         // Right (Purple) - player 2
            { x: 590, y: 560 },            // Bottom-right (Green) - player 3
            { x: center, y: 630 },         // Bottom (Yellow) - player 4
            { x: 110, y: 560 },            // Bottom-left (Black) - player 5
            { x: 70, y: center },          // Left (Orange) - player 6
            { x: 110, y: 140 }             // Top-left (Pink) - player 7
        ];

        // Create home bases
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

        // Create main track - 104 cells arranged in a circular path
        // The track goes clockwise around the board
        const trackRadius = 200;
        const innerRadius = 150; // For the wavy part of the track

        for (let cellId = 0; cellId < TOTAL_TRACK_CELLS; cellId++) {
            const playerSection = Math.floor(cellId / CELLS_PER_PLAYER);
            const localIndex = cellId % CELLS_PER_PLAYER;

            // Calculate angle for this cell
            // Each player section spans 45 degrees (360/8)
            // Within each section, cells are spread evenly
            const sectionAngle = playerSection * 45; // 0, 45, 90, ...
            const cellAngleOffset = (localIndex - 6) * 3.5; // Spread around section center

            // Start from top (-90 degrees) and go clockwise
            const angle = -90 + sectionAngle + cellAngleOffset;
            const angleRad = (angle * Math.PI) / 180;

            // Vary radius slightly to create the wavy pattern
            const radiusVariation = Math.sin(localIndex * Math.PI / 6) * 15;
            const currentRadius = trackRadius + radiusVariation;

            const x = center + Math.cos(angleRad) * currentRadius;
            const y = center + Math.sin(angleRad) * currentRadius;

            // The start cell for each player is at the beginning of their section
            const isStart = localIndex === 0;

            trackCells.push({
                id: cellId,
                playerSection,
                localIndex,
                x,
                y,
                isStart,
                color: isStart ? PLAYER_COLORS[playerSection] : null
            });
        }

        // Create home stretch cells - 4 cells per player leading to center
        for (let playerIdx = 0; playerIdx < 8; playerIdx++) {
            const color = PLAYER_COLORS[playerIdx];
            // Home stretch goes from track toward center
            // Entry point is at cell index (playerIdx * 13 + 6) - the middle of their section

            const playerAngle = -90 + playerIdx * 45; // Same as section angle
            const angleRad = (playerAngle * Math.PI) / 180;

            for (let stretchIdx = 0; stretchIdx < 4; stretchIdx++) {
                const stretchRadius = 120 - stretchIdx * 25; // Move toward center
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

    // Get visual position for a piece based on its game state position
    const getPiecePosition = (token, playerColorIndex) => {
        if (token.position === 'home') {
            const homeBase = boardLayout.homeBases[playerColorIndex];
            if (!homeBase) return null;

            // 2x2 grid layout in home base
            const offsets = [[-18, -18], [18, -18], [-18, 18], [18, 18]];
            const [ox, oy] = offsets[token.homePosition] || [0, 0];
            return { x: homeBase.x + ox, y: homeBase.y + oy, inHome: true };
        }

        if (token.position === 'finished') {
            // Finished pieces go to center area
            const playerAngle = -90 + playerColorIndex * 45;
            const angleRad = (playerAngle * Math.PI) / 180;
            const finishedRadius = 25 + token.id * 10;
            return {
                x: center + Math.cos(angleRad) * finishedRadius,
                y: center + Math.sin(angleRad) * finishedRadius,
                finished: true
            };
        }

        if (typeof token.position === 'string' && token.position.startsWith('home_stretch_')) {
            const stretchPos = parseInt(token.position.split('_')[2]);
            const stretchCell = boardLayout.homeStretchCells.find(
                c => c.playerIndex === playerColorIndex && c.stretchPos === stretchPos
            );
            if (stretchCell) return { x: stretchCell.x, y: stretchCell.y };
        }

        if (typeof token.position === 'number') {
            // Position is a track cell ID (0-103)
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

                {/* Home Bases - Rounded boxes */}
                {boardLayout.homeBases.map((base, i) => (
                    <g key={`home-${i}`} opacity={base.isActive ? 1 : 0.25}>
                        <rect
                            x={base.x - 45}
                            y={base.y - 45}
                            width={90}
                            height={90}
                            rx="16"
                            fill={base.color.light}
                            stroke={base.color.hex}
                            strokeWidth="3"
                        />
                        {/* 4 piece slots */}
                        {[[-18, -18], [18, -18], [-18, 18], [18, 18]].map(([ox, oy], slotIdx) => (
                            <circle
                                key={`slot-${i}-${slotIdx}`}
                                cx={base.x + ox}
                                cy={base.y + oy}
                                r="14"
                                fill={base.color.hex}
                                opacity="0.3"
                                stroke={base.color.hex}
                                strokeWidth="2"
                            />
                        ))}
                    </g>
                ))}

                {/* Main Track Cells - 104 cells total */}
                {boardLayout.trackCells.map((cell) => (
                    <circle
                        key={`track-${cell.id}`}
                        cx={cell.x}
                        cy={cell.y}
                        r="11"
                        fill={cell.color?.hex || '#FFFFFF'}
                        stroke="#1F2937"
                        strokeWidth="2"
                    />
                ))}

                {/* Home Stretch Cells - Colored paths to center */}
                {boardLayout.homeStretchCells.map((cell) => (
                    <circle
                        key={cell.id}
                        cx={cell.x}
                        cy={cell.y}
                        r="11"
                        fill={cell.color.hex}
                        stroke="#1F2937"
                        strokeWidth="2"
                    />
                ))}

                {/* Center Diamond Goal */}
                <g transform={`translate(${center}, ${center})`}>
                    <polygon points="0,-40 40,0 0,40 -40,0" fill="#FFFFFF" stroke="#1F2937" strokeWidth="3" />
                    <polygon points="0,-28 28,0 0,28 -28,0" fill="#FEF9C3" stroke="#1F2937" strokeWidth="2" />
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
                                {/* Shadow */}
                                <circle
                                    cx={pos.x + 2}
                                    cy={pos.y + 3}
                                    r={pos.inHome ? 10 : 12}
                                    fill="rgba(0,0,0,0.2)"
                                />
                                {/* Main piece */}
                                <circle
                                    cx={pos.x}
                                    cy={pos.y}
                                    r={pos.inHome ? 10 : 12}
                                    fill={color.hex}
                                    stroke="#FFFFFF"
                                    strokeWidth="3"
                                />
                                {/* Highlight */}
                                <circle
                                    cx={pos.x - 3}
                                    cy={pos.y - 3}
                                    r={3}
                                    fill="rgba(255,255,255,0.5)"
                                />
                                {/* Movable border indicator */}
                                {isMovable && (
                                    <circle
                                        cx={pos.x}
                                        cy={pos.y}
                                        r={pos.inHome ? 14 : 16}
                                        fill="none"
                                        stroke="#FFD700"
                                        strokeWidth="3"
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
