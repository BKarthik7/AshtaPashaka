import { useState, useEffect } from 'react';
import './Dice.css';

const DICE_FACES = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 1], [0, 2], [2, 0], [2, 1], [2, 2]]
};

function Dice({ value, isRolling, onRoll, disabled, isMyTurn }) {
    const [displayValue, setDisplayValue] = useState(value || 1);
    const [animating, setAnimating] = useState(false);

    useEffect(() => {
        if (isRolling) {
            setAnimating(true);

            // Animate through random values
            const interval = setInterval(() => {
                setDisplayValue(Math.floor(Math.random() * 6) + 1);
            }, 100);

            // Stop after animation
            setTimeout(() => {
                clearInterval(interval);
                if (value) {
                    setDisplayValue(value);
                }
                setAnimating(false);
            }, 800);

            return () => clearInterval(interval);
        } else if (value) {
            setDisplayValue(value);
        }
    }, [isRolling, value]);

    const handleClick = () => {
        if (!disabled && !isRolling && isMyTurn) {
            onRoll?.();
        }
    };

    const dots = DICE_FACES[displayValue] || [];

    return (
        <div className="dice-container">
            <button
                className={`dice ${animating ? 'rolling' : ''} ${disabled || !isMyTurn ? 'disabled' : ''}`}
                onClick={handleClick}
                disabled={disabled || !isMyTurn}
            >
                <div className="dice-face">
                    {dots.map(([row, col], index) => (
                        <div
                            key={index}
                            className="dice-dot"
                            style={{
                                gridRow: row + 1,
                                gridColumn: col + 1
                            }}
                        />
                    ))}
                </div>
            </button>

            <div className="dice-label">
                {isRolling ? (
                    'Rolling...'
                ) : disabled ? (
                    'Select a piece to move'
                ) : isMyTurn ? (
                    'Click to roll!'
                ) : (
                    'Wait for your turn'
                )}
            </div>
        </div>
    );
}

export default Dice;
