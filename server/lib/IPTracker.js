// IP Tracker - Ensures 1 IP = 1 player
class IPTracker {
  constructor() {
    // Map: IP -> { playerId, roomId, ws }
    this.ipMap = new Map();
  }

  // Check if IP is already registered
  isIPRegistered(ip) {
    return this.ipMap.has(ip);
  }

  // Get player info by IP
  getPlayerByIP(ip) {
    return this.ipMap.get(ip);
  }

  // Register an IP with player info
  registerIP(ip, playerId, roomId, ws) {
    this.ipMap.set(ip, { playerId, roomId, ws, connectedAt: Date.now() });
  }

  // Update room for an IP (when player joins a room)
  updateRoom(ip, roomId) {
    const info = this.ipMap.get(ip);
    if (info) {
      info.roomId = roomId;
    }
  }

  // Unregister an IP (on disconnect)
  unregisterIP(ip) {
    this.ipMap.delete(ip);
  }

  // Get all registered IPs
  getAllIPs() {
    return Array.from(this.ipMap.keys());
  }

  // Get connection count
  getConnectionCount() {
    return this.ipMap.size;
  }
}

export default IPTracker;
