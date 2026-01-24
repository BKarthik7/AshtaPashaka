// IP Tracker - Ensures 1 IP = 1 player per room
// Enhanced with per-room tracking and reconnection support

class IPTracker {
  constructor() {
    // Map: IP -> { playerId, roomId, ws, connectedAt }
    this.ipMap = new Map();
    // Map: roomId -> Set<IP> (tracks which IPs are in each room)
    this.roomIpMap = new Map();
  }

  // Check if IP is already registered globally
  isIPRegistered(ip) {
    return this.ipMap.has(ip);
  }

  // Get player info by IP
  getPlayerByIP(ip) {
    return this.ipMap.get(ip);
  }

  // Check if IP is already in a specific room (as a different player)
  isIPInRoom(ip, roomId) {
    const roomIps = this.roomIpMap.get(roomId);
    if (!roomIps) return false;
    return roomIps.has(ip);
  }

  // Get the playerId associated with an IP in a specific room
  getPlayerIdByIPInRoom(ip, roomId) {
    const info = this.ipMap.get(ip);
    if (info && info.roomId === roomId) {
      return info.playerId;
    }
    return null;
  }

  // Register an IP with player info
  registerIP(ip, playerId, roomId, ws) {
    this.ipMap.set(ip, { playerId, roomId, ws, connectedAt: Date.now() });

    // If joining a room, track in roomIpMap
    if (roomId) {
      this.addIPToRoom(ip, roomId);
    }
  }

  // Add IP to room tracking
  addIPToRoom(ip, roomId) {
    if (!this.roomIpMap.has(roomId)) {
      this.roomIpMap.set(roomId, new Set());
    }
    this.roomIpMap.get(roomId).add(ip);
  }

  // Remove IP from room tracking
  removeIPFromRoom(ip, roomId) {
    const roomIps = this.roomIpMap.get(roomId);
    if (roomIps) {
      roomIps.delete(ip);
      // Clean up empty room sets
      if (roomIps.size === 0) {
        this.roomIpMap.delete(roomId);
      }
    }
  }

  // Update room for an IP (when player joins a room)
  updateRoom(ip, newRoomId) {
    const info = this.ipMap.get(ip);
    if (info) {
      const oldRoomId = info.roomId;

      // Remove from old room tracking
      if (oldRoomId && oldRoomId !== newRoomId) {
        this.removeIPFromRoom(ip, oldRoomId);
      }

      // Add to new room tracking
      if (newRoomId) {
        this.addIPToRoom(ip, newRoomId);
      }

      info.roomId = newRoomId;
    }
  }

  // Unregister an IP (on disconnect)
  unregisterIP(ip) {
    const info = this.ipMap.get(ip);
    if (info && info.roomId) {
      this.removeIPFromRoom(ip, info.roomId);
    }
    this.ipMap.delete(ip);
  }

  // Clear all IPs for a room (when room is deleted)
  clearRoom(roomId) {
    const roomIps = this.roomIpMap.get(roomId);
    if (roomIps) {
      // Update ipMap entries to remove roomId reference
      for (const ip of roomIps) {
        const info = this.ipMap.get(ip);
        if (info && info.roomId === roomId) {
          info.roomId = null;
        }
      }
      this.roomIpMap.delete(roomId);
    }
  }

  // Get all IPs in a room
  getIPsInRoom(roomId) {
    const roomIps = this.roomIpMap.get(roomId);
    return roomIps ? Array.from(roomIps) : [];
  }

  // Get all registered IPs
  getAllIPs() {
    return Array.from(this.ipMap.keys());
  }

  // Get connection count
  getConnectionCount() {
    return this.ipMap.size;
  }

  // Get room count
  getRoomCount() {
    return this.roomIpMap.size;
  }
}

export default IPTracker;
