# 🎮 AshtaPashaka - 8-Player Ludo Game

A modern, multiplayer web-based implementation of **AshtaPashaka** (अष्टपाशक), an 8-player variant of the classic board game Ludo. Play with friends in real-time using WebSockets!

## 📋 Table of Contents

- [Overview](#overview)
- [Game Rules](#game-rules)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Setup & Installation](#setup--installation)
- [Running the Game](#running-the-game)
- [Game Controls](#game-controls)
- [Architecture](#architecture)

## 🎯 Overview

**AshtaPashaka** (अष्टपाशक) means "Eight Players" in Sanskrit. This is a digital adaptation of the classic Ludo board game designed for 8 concurrent players. The game features:

- 🌐 Real-time multiplayer gameplay
- 🎲 Dice-based turn-based mechanics
- 🏠 Home bases and home stretches for each player
- 👥 Support for 2-8 players (with spectator mode for extra players)
- ⏱️ Turn time limit system (10 seconds per turn)
- 🎨 Distinct color-coded pieces for each player

## 🎲 Game Rules

### Board Layout
- **8-Player Board**: A circular board with 8 home bases positioned at cardinal and diagonal directions
- **104 Total Track Cells**: 13 cells per player (8 players × 13 = 104 cells)
- **Home Stretch**: 4 cells in the home stretch leading to the center (finish position)

### Player Setup
- **Players**: 2-8 players (each with a unique color)
- **Pieces**: Each player has 4 tokens/pieces
- **Starting Position**: All pieces begin in the home base
- **Turn Limit**: 10 seconds per turn

### Movement Rules

#### Rolling the Dice
- Players roll a virtual dice showing values 1-6
- Players must roll in their turn (if you don't move within 10 seconds, turn passes to the next player)

#### Leaving Home
- A piece can **only exit the home base with a roll of 6**
- When you roll a 6, one of your pieces enters the track
- Rolling a 6 gives you **another turn** (standard Ludo rule)

#### Moving on the Track
- After rolling, you move one of your pieces by the number shown on the dice
- Each piece moves along the circular track
- The track is divided into 8 sections (one per player, 13 cells each)
- After traveling around the main track, a piece enters the **home stretch**

#### Home Stretch Movement
- Once a piece reaches the home stretch (4 cells before center), it moves along the home stretch
- **Important**: You must roll the **exact number** to reach the finish (center)
- You cannot "overshoot" the finish - the move is only valid if it lands exactly on the finish position

#### Capturing Opponent Pieces
- If your piece lands on the same cell as an opponent's piece, the opponent's piece is **captured**
- Captured pieces return to their home base
- **Safe Zones**: Pieces in their own home base cannot be captured

#### Winning
- **First player to get all 4 pieces to the center wins**
- The other players continue if desired

### Special Rules
- **Exact Roll Required to Finish**: Unlike standard Ludo, you must roll the exact number to land on the finish cell. For example, if you're 3 cells away from finish, you must roll a 3.
- **Turn Timer**: If a player doesn't make a move within 10 seconds, their turn automatically passes to the next player
- **Spectator Mode**: When a room is full (8 players), additional players can join as spectators

## ✨ Features

- **Real-Time Multiplayer**: Play with friends using WebSocket connections
- **Room-Based Gameplay**: Create or join rooms with unique room codes
- **Persistent Connection**: Reconnect to your game if your connection drops
- **Turn Timer**: Automatic turn progression with a 10-second countdown
- **Spectator Mode**: Watch active games as a spectator
- **Responsive UI**: Modern, intuitive interface with smooth animations
- **IP-Based Tracking**: Server tracks players by IP for reconnection support
- **Toast Notifications**: Real-time feedback for game events

## 🛠️ Technology Stack

### Frontend
- **React 19.2+**: UI framework
- **Vite 7.2+**: Build tool and dev server
- **JavaScript ES6+**: Core language
- **CSS3**: Styling with CSS variables and Flexbox/Grid

### Backend
- **Node.js**: Runtime environment
- **WebSocket (ws)**: Real-time bidirectional communication
- **UUID**: Unique identifier generation
- **ES6 Modules**: Modern JavaScript modules

### Architecture
- **Client-Server Model**: Real-time bidirectional communication via WebSockets
- **Room-Based State Management**: Each game room has its own state
- **Server-Side Game Logic**: All game rules enforced on the server

## 📦 Setup & Installation

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn** package manager

### Clone the Repository
```bash
git clone https://github.com/BKarthik7/AshtaPashaka.git
cd AshtaPashaka
```

### Install Dependencies

#### Client
```bash
cd client
npm install
```

#### Server
```bash
cd server
npm install
```

## 🚀 Running the Game

### Start the Server
```bash
cd server
npm start
# or for development with auto-reload:
npm run dev
```

The server will start on `http://localhost:3001` by default.

### Start the Client
In a new terminal:
```bash
cd client
npm run dev
```

The client will start on `http://localhost:5173` by default and automatically open in your browser.

### Environment Variables

#### Server (.env or environment)
```
PORT=3001  # WebSocket server port (default: 3001)
```

#### Client (vite.config.js)
The client is configured to connect to `localhost:3001` by default. Modify if your server is on a different host/port.

## 🎮 Game Controls

### Landing Page
1. **Enter Your Name**: Type your player name
2. **Create Room**: Host a new game (generates a unique room code)
3. **Join Room**: Join an existing game with a room code

### Lobby
1. **Wait for Players**: Other players join using your room code
2. **Start Game**: When at least 2 players are ready, the host can start the game
3. **Leave Room**: Exit the lobby and return to landing page

### Game Board
1. **Roll Dice**: Click the dice area when it's your turn (turn timer shows how much time is left)
2. **Select Piece**: After rolling, click on one of your valid pieces to move it
3. **Watch Others**: View other players' moves and piece positions in real-time
4. **Game Over**: When you win, click "Back to Lobby" to return to the lobby

### Game State Indicators
- 🎲 **Turn Timer**: Shows remaining seconds for the current player
- **Valid Moves**: Highlighted pieces that can be moved based on the current dice roll
- **Player Colors**: Each player has a distinct color badge
- **Piece Positions**: Visual representation of all pieces on the board

## 🏗️ Architecture

### Project Structure
```
AshtaPashaka/
├── client/                          # React frontend
│   ├── src/
│   │   ├── pages/                   # Page components
│   │   │   ├── LandingPage.jsx      # Start screen
│   │   │   ├── Lobby.jsx            # Room lobby
│   │   │   └── Game.jsx             # Main game board
│   │   ├── components/              # Reusable components
│   │   │   ├── GameBoard.jsx        # Board visualization
│   │   │   ├── Dice.jsx             # Dice component
│   │   │   └── PlayerList.jsx       # Player list sidebar
│   │   ├── context/                 # React context
│   │   │   └── GameContext.jsx      # Global game state
│   │   ├── hooks/                   # Custom hooks
│   │   │   └── useWebSocket.js      # WebSocket management
│   │   └── styles/                  # Global styles
│   ├── vite.config.js               # Vite configuration
│   └── package.json
│
└── server/                          # Node.js backend
    ├── lib/
    │   ├── GameManager.js           # Game logic & rules
    │   ├── RoomManager.js           # Room management
    │   └── IPTracker.js             # Player IP tracking
    ├── index.js                     # WebSocket server & routing
    └── package.json
```

### Game Flow

1. **Connection**: Player connects to server via WebSocket
2. **Room Creation/Joining**: Player creates new room or joins existing with code
3. **Lobby State**: Players wait in lobby until game is started
4. **Game Start**: All players moved to game board, game state initialized
5. **Turn Cycle**:
   - Player rolls dice
   - Valid moves calculated based on dice value
   - Player selects piece to move
   - Piece moves, captures checked
   - Turn passes to next player
6. **Win Condition**: First player to get all 4 pieces to center wins
7. **Game Over**: Game ends, players can return to lobby

### WebSocket Messages

#### Client → Server
- `CREATE_ROOM`: Create a new game room
- `JOIN_ROOM`: Join an existing room by code
- `START_GAME`: Start the game (host only)
- `ROLL_DICE`: Roll the dice
- `MOVE_PIECE`: Move a specific piece
- `LEAVE_ROOM`: Leave the current room

#### Server → Client
- `CONNECTED`: Initial connection confirmation
- `RECONNECTED`: Reconnection to existing session
- `ROOM_STATE`: Current state of the room
- `GAME_STATE`: Current state of the game
- `GAME_STARTED`: Game has begun
- `TURN_UPDATE`: Turn changed to new player
- `PIECE_MOVED`: A piece has moved (with new state)
- `GAME_OVER`: Game has ended with winner

## 🎨 Visual Design

### Color Scheme
The game uses 8 distinct colors for players:
- 🔵 **Blue** - Player 1
- 🔴 **Red** - Player 2
- 🟣 **Purple** - Player 3
- 🟢 **Green** - Player 4
- 🟡 **Yellow** - Player 5
- ⚫ **Black** - Player 6
- 🟠 **Orange** - Player 7
- 🩷 **Pink** - Player 8

### Board Layout
- Circular board with 8 home bases at cardinal and diagonal positions
- Wavy track pattern representing movement sections
- Clear visual distinction between main track and home stretch
- Animated piece movements and dice rolls

## 🔐 Security & Stability

- **IP-Based Player Tracking**: Server tracks players by IP to prevent multi-accounting
- **Server-Side Validation**: All game moves validated on the server
- **Connection Recovery**: Players can reconnect and resume their game
- **Room Isolation**: Games in separate rooms don't interfere with each other

## 📝 Notes & Tips

- **Exact Roll to Finish**: Remember that you need an exact roll to reach the center. Plan ahead!
- **Time Management**: Keep an eye on the 10-second turn timer
- **Capture Strategy**: Try to capture opponent pieces to send them back home
- **Multiple Pieces**: Having multiple pieces on the track increases your movement flexibility

## 🐛 Known Limitations

- Maximum 8 players per room (by design)
- Spectators cannot participate in the game
- Turn timer is fixed at 10 seconds
- Local IP-based player tracking (may not work across different networks)

## 📄 License

This project is open-source and available for learning and non-commercial use.

## 🤝 Contributing

Feel free to fork, improve, and submit pull requests! Some ideas for enhancement:
- Power-ups and special moves
- Different difficulty levels
- Game statistics and leaderboards
- Mobile app version
- Chat system for players

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---

**Happy Gaming! 🎲🏆**

Enjoy playing AshtaPashaka with your friends!