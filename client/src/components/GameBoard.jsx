import { useMemo } from 'react';
import './GameBoard.css';

// Player colors (8 positions around the board)
const PLAYER_COLORS = [
    { name: 'Blue', hex: '#3B82F6', light: '#DBEAFE' },    // Top
    { name: 'Red', hex: '#EF4444', light: '#FEE2E2' },     // Top-right  
    { name: 'Purple', hex: '#8B5CF6', light: '#EDE9FE' },  // Right
    { name: 'Green', hex: '#22C55E', light: '#DCFCE7' },   // Bottom-right
    { name: 'Yellow', hex: '#EAB308', light: '#FEF9C3' },  // Bottom
    { name: 'Black', hex: '#374151', light: '#E5E7EB' },   // Bottom-left
    { name: 'Orange', hex: '#F97316', light: '#FFEDD5' },  // Left
    { name: 'Pink', hex: '#EC4899', light: '#FCE7F3' }     // Top-left
];

// Positions for each player (angle in degrees, 0=right, 90=bottom)
const PLAYER_POSITIONS = [
    { angle: 270, homeX: 350, homeY: 60 },    // Top (Blue)
    { angle: 315, homeX: 590, homeY: 110 },   // Top-right (Red)
    { angle: 0, homeX: 640, homeY: 350 },     // Right (Purple)
    { angle: 45, homeX: 590, homeY: 590 },    // Bottom-right (Green)
    { angle: 90, homeX: 350, homeY: 640 },    // Bottom (Yellow)
    { angle: 135, homeX: 110, homeY: 590 },   // Bottom-left (Black)
    { angle: 180, homeX: 60, homeY: 350 },    // Left (Orange)
    { angle: 225, homeX: 110, homeY: 110 }    // Top-left (Pink)
];

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
        const connections = [];

        for (let i = 0; i < 8; i++) {
            const pos = PLAYER_POSITIONS[i];
            const color = PLAYER_COLORS[i];
            const isActive = i < playerCount;
            const angleRad = (pos.angle * Math.PI) / 180;

            // Home base
            homeBases.push({
                playerIndex: i,
                x: pos.homeX,
                y: pos.homeY,
                angle: pos.angle,
                color,
                isActive
            });

            // Main track - 5 cells per player forming the outer ring
            // Each cell curves around to connect to the next player's section
            const trackRadius = 190;
            const cellSpacing = 8; // degrees between cells
            const sectionStart = pos.angle - 16; // Center the section on the player angle

            for (let j = 0; j < 5; j++) {
                const cellAngle = sectionStart + j * cellSpacing;
                const cellAngleRad = (cellAngle * Math.PI) / 180;
                const x = center + Math.cos(cellAngleRad) * trackRadius;
                const y = center + Math.sin(cellAngleRad) * trackRadius;

                const cellId = i * 5 + j;
                trackCells.push({
                    id: cellId,
                    playerSection: i,
                    localIndex: j,
                    x,
                    y,
                    isStart: j === 2, // Middle cell is the start
                    isEntry: j === 2, // Entry to home stretch
                    color: j === 2 ? color : null
                });

                // Connection to next cell
                if (j < 4) {
                    const nextAngle = sectionStart + (j + 1) * cellSpacing;
                    const nextAngleRad = (nextAngle * Math.PI) / 180;
                    const nextX = center + Math.cos(nextAngleRad) * trackRadius;
                    const nextY = center + Math.sin(nextAngleRad) * trackRadius;
                    connections.push({ x1: x, y1: y, x2: nextX, y2: nextY });
                }
            }

            // Connect to previous player's last cell
            if (i > 0 || playerCount === 8) {
                const prevIdx = i === 0 ? 7 : i - 1;
                const prevPos = PLAYER_POSITIONS[prevIdx];
                const prevSectionStart = prevPos.angle - 16;
                const prevLastAngle = prevSectionStart + 4 * cellSpacing;
                const prevAngleRad = (prevLastAngle * Math.PI) / 180;
                const prevX = center + Math.cos(prevAngleRad) * trackRadius;
                const prevY = center + Math.sin(prevAngleRad) * trackRadius;

                const firstAngle = sectionStart;
                const firstAngleRad = (firstAngle * Math.PI) / 180;
                const firstX = center + Math.cos(firstAngleRad) * trackRadius;
                const firstY = center + Math.sin(firstAngleRad) * trackRadius;

                connections.push({ x1: prevX, y1: prevY, x2: firstX, y2: firstY, curved: true });
            }

            // Home stretch - 4 colored cells leading to center
            for (let j = 0; j < 4; j++) {
                const stretchRadius = 140 - j * 32;
                const x = center + Math.cos(angleRad) * stretchRadius;
                const y = center + Math.sin(angleRad) * stretchRadius;

                homeStretchCells.push({
                    id: `stretch_${i}_${j}`,
                    playerIndex: i,
                    stretchPos: j,
                    x,
                    y,
                    color
                });

                // Connection between stretch cells
                if (j > 0) {
                    const prevRadius = 140 - (j - 1) * 32;
                    const prevX = center + Math.cos(angleRad) * prevRadius;
                    const prevY = center + Math.sin(angleRad) * prevRadius;
                    connections.push({ x1: prevX, y1: prevY, x2: x, y2: y });
                }
            }

            // Connection from track entry to first stretch cell
            const entryCell = trackCells.find(c => c.playerSection === i && c.isEntry);
            if (entryCell) {
                const firstStretch = homeStretchCells.find(c => c.playerIndex === i && c.stretchPos === 0);
                if (firstStretch) {
                    connections.push({ x1: entryCell.x, y1: entryCell.y, x2: firstStretch.x, y2: firstStretch.y });
                }
            }
        }

        return { homeBases, trackCells, homeStretchCells, connections };
    }, [gameState?.playerCount]);

    const getPiecePosition = (token, playerColorIndex) => {
        if (token.position === 'home') {
            const homeBase = boardLayout.homeBases[playerColorIndex];
            if (!homeBase) return null;

            const offsets = [[-18, -18], [18, -18], [-18, 18], [18, 18]];
            const [ox, oy] = offsets[token.homePosition] || [0, 0];
            return { x: homeBase.x + ox, y: homeBase.y + oy, inHome: true };
        }

        if (token.position === 'finished') {
            const pos = PLAYER_POSITIONS[playerColorIndex];
            const angleRad = (pos.angle * Math.PI) / 180;
            const finishedRadius = 20 + token.id * 10;
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

                {/* Connection lines between cells */}
                {boardLayout.connections.map((conn, idx) => (
                    <line
                        key={`conn-${idx}`}
                        x1={conn.x1}
                        y1={conn.y1}
                        x2={conn.x2}
                        y2={conn.y2}
                        stroke="#1F2937"
                        strokeWidth="3"
                        strokeLinecap="round"
                    />
                ))}

                {/* Home Bases */}
                {boardLayout.homeBases.map((base, i) => (
                    <g key={`home-${i}`} opacity={base.isActive ? 1 : 0.25}>
                        <rect
                            x={base.x - 50}
                            y={base.y - 50}
                            width={100}
                            height={100}
                            rx="18"
                            fill={base.color.light}
                            stroke={base.color.hex}
                            strokeWidth="4"
                        />
                        {[[-22, -22], [22, -22], [-22, 22], [22, 22]].map(([ox, oy], slotIdx) => (
                            <circle
                                key={`slot-${i}-${slotIdx}`}
                                cx={base.x + ox}
                                cy={base.y + oy}
                                r="16"
                                fill={base.color.hex}
                                opacity="0.35"
                                stroke={base.color.hex}
                                strokeWidth="2"
                            />
                        ))}
                    </g>
                ))}

                {/* Track Cells */}
                {boardLayout.trackCells.map((cell) => (
                    <circle
                        key={`track-${cell.id}`}
                        cx={cell.x}
                        cy={cell.y}
                        r="15"
                        fill={cell.color?.hex || '#FFFFFF'}
                        stroke="#1F2937"
                        strokeWidth="2.5"
                    />
                ))}

                {/* Home Stretch Cells */}
                {boardLayout.homeStretchCells.map((cell) => (
                    <circle
                        key={cell.id}
                        cx={cell.x}
                        cy={cell.y}
                        r="15"
                        fill={cell.color.hex}
                        stroke="#1F2937"
                        strokeWidth="2.5"
                    />
                ))}

                {/* Center Diamond */}
                <g transform={`translate(${center}, ${center})`}>
                    <polygon points="0,-45 45,0 0,45 -45,0" fill="#FFFFFF" stroke="#1F2937" strokeWidth="3" />
                    <polygon points="0,-32 32,0 0,32 -32,0" fill="#FEF9C3" stroke="#1F2937" strokeWidth="2" />
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
                                style={{ cursor: isMovable ? 'pointer' : 'default' }}
                            >
                                <circle cx={pos.x + 2} cy={pos.y + 3} r={pos.inHome ? 11 : 13} fill="rgba(0,0,0,0.25)" />
                                <circle cx={pos.x} cy={pos.y} r={pos.inHome ? 11 : 13} fill={color.hex} stroke="#FFF" strokeWidth="3" />
                                <circle cx={pos.x - 4} cy={pos.y - 4} r={3} fill="rgba(255,255,255,0.6)" />
                                {isMovable && (
                                    <circle cx={pos.x} cy={pos.y} r="20" fill="none" stroke="#FFF" strokeWidth="3" className="pulse-ring" />
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
