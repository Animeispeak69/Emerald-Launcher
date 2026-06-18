/**
 * Plugin Manager Module
 * Manages third-party plugins and extensions
 */

const path = require('path');
const fs = require('fs-extra');
const { app, ipcMain } = require('electron');
const logger = require('./logger');

class PluginManager {
  constructor() {
    this.pluginDir = path.join(app.getPath('userData'), '.plugins');
    this.plugins = new Map();
    this.hooks = new Map();
  }

  /**
   * Initialize plugin system
   */
  async initialize() {
    try {
      await fs.ensureDir(this.pluginDir);
      logger.info('Plugin system initialized');
      
      // Load existing plugins
      await this.loadPlugins();
    } catch (error) {
      logger.error('Plugin initialization failed:', error);
    }
  }

  /**
   * Load all plugins from plugin directory
   */
  async loadPlugins() {
    try {
      const pluginDirs = await fs.readdir(this.pluginDir);

      for (const pluginName of pluginDirs) {
        const pluginPath = path.join(this.pluginDir, pluginName);
        const stat = await fs.stat(pluginPath);

        if (stat.isDirectory()) {
          await this.loadPlugin(pluginName, pluginPath);
        }
      }

      logger.info(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      logger.error('Failed to load plugins:', error);
    }
  }

  /**
   * Load a specific plugin
   */
  async loadPlugin(pluginName, pluginPath) {
    try {
      const packageJsonPath = path.join(pluginPath, 'package.json');
      const indexPath = path.join(pluginPath, 'index.js');

      if (!fs.existsSync(packageJsonPath) || !fs.existsSync(indexPath)) {
        logger.warn(`Invalid plugin structure: ${pluginName}`);
        return false;
      }

      const packageJson = await fs.readJSON(packageJsonPath);

      // Load plugin module
      delete require.cache[require.resolve(indexPath)];
      const pluginModule = require(indexPath);

      // Create plugin instance
      const plugin = {
        name: packageJson.name || pluginName,
        version: packageJson.version || '1.0.0',
        description: packageJson.description || '',
        author: packageJson.author || '',
        path: pluginPath,
        module: pluginModule,
        enabled: true
      };

      // Register hooks if provided
      if (pluginModule.hooks) {
        for (const [hookName, hookFn] of Object.entries(pluginModule.hooks)) {
          this.registerHook(hookName, pluginName, hookFn);
        }
      }

      this.plugins.set(pluginName, plugin);
      logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
      return true;
    } catch (error) {
      logger.error(`Failed to load plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * Register a hook
   */
  registerHook(hookName, pluginName, hookFn) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName).push({ pluginName, hookFn });
  }

  /**
   * Execute hooks
   */
  async executeHooks(hookName, ...args) {
    const hooks = this.hooks.get(hookName) || [];

    for (const { pluginName, hookFn } of hooks) {
      try {
        await hookFn(...args);
      } catch (error) {
        logger.error(`Hook error in ${pluginName}:`, error);
      }
    }
  }

  /**
   * Install plugin from URL
   */
  async installPlugin(pluginUrl, pluginName) {
    try {
      logger.info(`Installing plugin: ${pluginName}`);

      const pluginPath = path.join(this.pluginDir, pluginName);
      // Implementation would download and extract plugin

      return await this.loadPlugin(pluginName, pluginPath);
    } catch (error) {
      logger.error('Plugin installation failed:', error);
      return false;
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(pluginName) {
    try {
      logger.info(`Uninstalling plugin: ${pluginName}`);

      const plugin = this.plugins.get(pluginName);
      if (plugin) {
        await fs.remove(plugin.path);
        this.plugins.delete(pluginName);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Plugin uninstallation failed:', error);
      return false;
    }
  }

  /**
   * Enable/disable plugin
   */
  togglePlugin(pluginName, enabled) {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      plugin.enabled = enabled;
      logger.info(`Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Get plugin list
   */
  getPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      description: p.description,
      author: p.author,
      enabled: p.enabled
    }));
  }

  /**
   * Setup IPC handlers
   */
  setupIPC() {
    ipcMain.handle('list-plugins', () => this.getPlugins());
    ipcMain.handle('toggle-plugin', (_, pluginName, enabled) => 
      this.togglePlugin(pluginName, enabled)
    );
    ipcMain.handle('install-plugin', (_, url, name) => 
      this.installPlugin(url, name)
    );
    ipcMain.handle('uninstall-plugin', (_, name) => 
      this.uninstallPlugin(name)
    );
  }
}

module.exports = PluginManager;
