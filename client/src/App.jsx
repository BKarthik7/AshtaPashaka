import { GameProvider, useGame } from './context/GameContext';
import LandingPage from './pages/LandingPage';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import './styles/index.css';

// Toast component
function Toast({ toast }) {
  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
    </div>
  );
}

// Main app content with routing based on game state
function AppContent() {
  const { roomId, gameStarted, toast, isConnected, connectionError } = useGame();

  // Connection error
  if (connectionError) {
    return (
      <div className="error-screen">
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h2>⚠️ Connection Error</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-md)' }}>
            {connectionError}
          </p>
          <button
            className="btn btn-primary mt-lg"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading screen while connecting
  if (!isConnected) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-secondary)' }}>
          Connecting to server...
        </p>
      </div>
    );
  }

  // Route based on game state
  let content;
  if (!roomId) {
    content = <LandingPage />;
  } else if (!gameStarted) {
    content = <Lobby />;
  } else {
    content = <Game />;
  }

  return (
    <>
      {content}
      <Toast toast={toast} />
    </>
  );
}

// Main App wrapper with provider
function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
