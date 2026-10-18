const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AuthStore {
  constructor(dataPath) {
    this.dataPath = dataPath || path.join(__dirname, '..', 'data', 'shield-data.json');
    this.ensureDataDir();
    this.data = this.loadData();
  }

  ensureDataDir() {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  loadData() {
    if (fs.existsSync(this.dataPath)) {
      try {
        const raw = fs.readFileSync(this.dataPath, 'utf8');
        return JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse shield data, reinitializing:', e);
      }
    }
    return {
      isInitialized: false,
      passwordHash: null,
      salt: null,
      protectionEnabled: true,
      safeSearchEnabled: true,
      hostsFilterEnabled: true,
      watchdogEnabled: true,
      cinemaShieldEnabled: true,
      cinemaShieldMode: 'both', // 'both' | 'video_only' | 'audio_only'
      stats: {
        totalBlocked: 0,
        lastBlockedTime: null
      },
      logs: [],
      customBlockedDomains: [],
      customBlockedKeywords: []
    };
  }

  saveData() {
    this.ensureDataDir();
    fs.writeFileSync(this.dataPath, JSON.stringify(this.data, null, 2), 'utf8');
  }

  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  }

  isConfigured() {
    return !!(this.data.isInitialized && this.data.passwordHash && this.data.salt);
  }

  setupMasterPassword(newPassword) {
    if (!newPassword || newPassword.length < 4) {
      throw new Error('Password must be at least 4 characters long');
    }
    if (this.isConfigured()) {
      throw new Error('Master password is already configured. Use changePassword instead.');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = this.hashPassword(newPassword, salt);
    this.data.isInitialized = true;
    this.data.salt = salt;
    this.data.passwordHash = hash;
    this.data.protectionEnabled = true;
    this.saveData();
    return true;
  }

  verifyPassword(inputPassword) {
    if (!this.isConfigured()) {
      return false;
    }
    const hash = this.hashPassword(inputPassword, this.data.salt);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(this.data.passwordHash));
  }

  changePassword(oldPassword, newPassword) {
    if (!this.verifyPassword(oldPassword)) {
      throw new Error('Current password does not match.');
    }
    if (!newPassword || newPassword.length < 4) {
      throw new Error('New password must be at least 4 characters long.');
    }
    const newSalt = crypto.randomBytes(16).toString('hex');
    this.data.salt = newSalt;
    this.data.passwordHash = this.hashPassword(newPassword, newSalt);
    this.saveData();
    return true;
  }

  getState() {
    return {
      isConfigured: this.isConfigured(),
      protectionEnabled: this.data.protectionEnabled,
      safeSearchEnabled: this.data.safeSearchEnabled,
      hostsFilterEnabled: this.data.hostsFilterEnabled,
      watchdogEnabled: this.data.watchdogEnabled,
      cinemaShieldEnabled: this.data.cinemaShieldEnabled !== undefined ? this.data.cinemaShieldEnabled : true,
      cinemaShieldMode: this.data.cinemaShieldMode || 'both',
      stats: this.data.stats,
      logs: (this.data.logs || []).slice(-50).reverse(),
      customBlockedDomains: this.data.customBlockedDomains || [],
      customBlockedKeywords: this.data.customBlockedKeywords || []
    };
  }

  updateCinemaSettings(settings) {
    // Password-free modification as requested by user
    if (settings.cinemaShieldEnabled !== undefined) {
      this.data.cinemaShieldEnabled = !!settings.cinemaShieldEnabled;
    }
    if (settings.cinemaShieldMode !== undefined) {
      this.data.cinemaShieldMode = settings.cinemaShieldMode; // 'both' | 'video_only' | 'audio_only'
    }
    this.saveData();
    return this.getState();
  }

  addLog(event) {
    if (!this.data.logs) this.data.logs = [];
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...event
    };
    this.data.logs.push(logEntry);
    this.data.stats.totalBlocked = (this.data.stats.totalBlocked || 0) + 1;
    this.data.stats.lastBlockedTime = logEntry.timestamp;
    // Keep max 200 logs
    if (this.data.logs.length > 200) {
      this.data.logs = this.data.logs.slice(-200);
    }
    this.saveData();
    return logEntry;
  }

  toggleProtection(password, enabled) {
    if (!this.verifyPassword(password)) {
      throw new Error('Invalid master password. Protection cannot be modified.');
    }
    this.data.protectionEnabled = !!enabled;
    this.saveData();
    return this.getState();
  }

  updateSettings(password, settings) {
    if (!this.verifyPassword(password)) {
      throw new Error('Invalid master password. Settings cannot be modified.');
    }
    if (settings.safeSearchEnabled !== undefined) this.data.safeSearchEnabled = settings.safeSearchEnabled;
    if (settings.hostsFilterEnabled !== undefined) this.data.hostsFilterEnabled = settings.hostsFilterEnabled;
    if (settings.watchdogEnabled !== undefined) this.data.watchdogEnabled = settings.watchdogEnabled;
    if (Array.isArray(settings.customBlockedDomains)) this.data.customBlockedDomains = settings.customBlockedDomains;
    if (Array.isArray(settings.customBlockedKeywords)) this.data.customBlockedKeywords = settings.customBlockedKeywords;
    this.saveData();
    return this.getState();
  }
}

module.exports = AuthStore;
