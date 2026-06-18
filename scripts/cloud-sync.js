/**
 * Cloud Sync Module
 * Manages cloud synchronization of settings and profiles
 */

const axios = require('axios');
const crypto = require('crypto');
const Store = require('electron-store');
const logger = require('./logger');

class CloudSync {
  constructor(apiEndpoint = 'https://api.emerald.launcher/sync') {
    this.apiEndpoint = apiEndpoint;
    this.store = new Store({ name: 'cloud-sync' });
    this.syncEnabled = this.store.get('enabled', false);
    this.userId = this.store.get('userId', null);
    this.token = this.store.get('token', null);
  }

  /**
   * Initialize cloud sync with authentication
   */
  async initialize(email, password) {
    try {
      logger.info('Initializing cloud sync...');

      const response = await axios.post(`${this.apiEndpoint}/auth/login`, {
        email,
        passwordHash: this.hashPassword(password)
      });

      this.userId = response.data.userId;
      this.token = response.data.token;
      this.syncEnabled = true;

      // Store securely
      this.store.set('userId', this.userId);
      this.store.set('token', this.token);
      this.store.set('enabled', true);

      logger.info('Cloud sync initialized');
      return { success: true };
    } catch (error) {
      logger.error('Cloud sync initialization failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync profiles to cloud
   */
  async syncProfiles(profiles) {
    if (!this.syncEnabled) return false;

    try {
      logger.info('Syncing profiles to cloud...');

      await axios.post(
        `${this.apiEndpoint}/profiles/sync`,
        { profiles },
        { headers: this.getAuthHeaders() }
      );

      this.store.set('lastProfileSync', Date.now());
      logger.info('Profiles synced');
      return true;
    } catch (error) {
      logger.error('Profile sync failed:', error.message);
      return false;
    }
  }

  /**
   * Sync instance settings to cloud
   */
  async syncInstanceSettings(instanceId, settings) {
    if (!this.syncEnabled) return false;

    try {
      logger.info(`Syncing instance settings: ${instanceId}`);

      await axios.post(
        `${this.apiEndpoint}/instances/${instanceId}/settings`,
        { settings },
        { headers: this.getAuthHeaders() }
      );

      logger.info('Instance settings synced');
      return true;
    } catch (error) {
      logger.error('Instance settings sync failed:', error.message);
      return false;
    }
  }

  /**
   * Pull profiles from cloud
   */
  async pullProfiles() {
    if (!this.syncEnabled) return [];

    try {
      logger.info('Pulling profiles from cloud...');

      const response = await axios.get(
        `${this.apiEndpoint}/profiles`,
        { headers: this.getAuthHeaders() }
      );

      logger.info('Profiles pulled from cloud');
      return response.data.profiles || [];
    } catch (error) {
      logger.error('Profile pull failed:', error.message);
      return [];
    }
  }

  /**
   * Resolve sync conflicts
   */
  async resolveConflict(resourceType, resourceId, localData, cloudData) {
    try {
      // Use cloud data if newer, otherwise use local
      const localTimestamp = localData.timestamp || 0;
      const cloudTimestamp = cloudData.timestamp || 0;

      if (cloudTimestamp > localTimestamp) {
        logger.info(`Resolved conflict for ${resourceType}: using cloud version`);
        return cloudData;
      } else {
        logger.info(`Resolved conflict for ${resourceType}: using local version`);
        return localData;
      }
    } catch (error) {
      logger.error('Conflict resolution failed:', error.message);
      return localData; // Fallback to local
    }
  }

  /**
   * Get authentication headers
   */
  getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.token}`,
      'X-User-ID': this.userId
    };
  }

  /**
   * Hash password for secure transmission
   */
  hashPassword(password) {
    return crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');
  }

  /**
   * Disable cloud sync
   */
  disable() {
    this.syncEnabled = false;
    this.store.set('enabled', false);
    logger.info('Cloud sync disabled');
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      enabled: this.syncEnabled,
      userId: this.userId,
      lastSync: this.store.get('lastProfileSync', null)
    };
  }
}

module.exports = CloudSync;