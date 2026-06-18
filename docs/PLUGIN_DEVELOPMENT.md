# Plugin Development Guide

Learn how to create custom plugins for Emerald Launcher and extend its functionality.

## Plugin Structure

Every plugin must follow this directory structure:

```
my-plugin/
├── package.json          # Plugin metadata
├── index.js             # Main plugin file
├── README.md            # Plugin documentation
└── src/                 # Source files (optional)
```

## Creating a Plugin

### 1. Plugin Metadata (package.json)

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "Description of what your plugin does",
  "author": "Your Name",
  "license": "MIT",
  "emerald": {
    "minVersion": "1.5.0",
    "category": "enhancement"
  }
}
```

### 2. Main Plugin File (index.js)

```javascript
module.exports = {
  name: 'My Awesome Plugin',
  version: '1.0.0',
  
  // Register hooks
  hooks: {
    'launcher:ready': async () => {
      console.log('Launcher ready!');
    },
    
    'instance:launched': async (instanceId) => {
      console.log(`Instance launched: ${instanceId}`);
    },
    
    'mod:installed': async (instanceId, modName) => {
      console.log(`Mod installed: ${modName}`);
    }
  },
  
  // Plugin commands
  commands: {
    'my-command': async (args) => {
      return { success: true, message: 'Command executed' };
    }
  }
};
```

## Available Hooks

### Launcher Hooks
- `launcher:ready` - Launcher initialization complete
- `launcher:shutdown` - Launcher shutting down
- `launcher:error` - Error occurred in launcher

### Instance Hooks
- `instance:created` - New instance created
- `instance:launched` - Instance launched
- `instance:stopped` - Instance stopped
- `instance:deleted` - Instance deleted
- `instance:settings-changed` - Instance settings modified

### Mod Hooks
- `mod:installing` - Before mod installation
- `mod:installed` - Mod installed successfully
- `mod:uninstalling` - Before mod uninstallation
- `mod:uninstalled` - Mod uninstalled

### Profile Hooks
- `profile:created` - Control profile created
- `profile:updated` - Control profile updated
- `profile:deleted` - Control profile deleted
- `profile:activated` - Control profile activated

### UI Hooks
- `ui:settings-page` - Add custom settings section
- `ui:toolbar` - Add toolbar buttons
- `ui:context-menu` - Add context menu items

## Plugin API

Access Emerald Launcher features through the plugin API:

```javascript
module.exports = {
  hooks: {
    'launcher:ready': async (api) => {
      // Get instance manager
      const instances = api.getInstances();
      
      // Get mod browser
      const mods = await api.searchMods('optimization');
      
      // Get performance monitor
      const perf = api.getPerformanceData();
      
      // Log message
      api.log('info', 'Plugin started');
    }
  }
};
```

### API Methods

- `api.getInstances()` - Get all game instances
- `api.getInstance(id)` - Get specific instance
- `api.createInstance(config)` - Create new instance
- `api.deleteInstance(id)` - Delete instance
- `api.launchInstance(id)` - Launch game instance
- `api.searchMods(query, filters)` - Search Modrinth mods
- `api.installMod(instanceId, modId)` - Install mod
- `api.getProfiles()` - Get control profiles
- `api.createProfile(name, config)` - Create profile
- `api.getPerformanceData()` - Get performance metrics
- `api.showNotification(title, message)` - Show notification
- `api.log(level, message)` - Log message
- `api.openDialog(options)` - Open file dialog

## Example Plugin: Download Stats Tracker

```javascript
const Store = require('electron-store');

const store = new Store({ name: 'download-stats' });

module.exports = {
  name: 'Download Stats Tracker',
  version: '1.0.0',
  
  hooks: {
    'mod:installed': async (instanceId, modName) => {
      const stats = store.get('stats', {});
      stats[modName] = (stats[modName] || 0) + 1;
      store.set('stats', stats);
      console.log(`Downloaded: ${modName}`);
    }
  },
  
  commands: {
    'stats:get': async () => {
      return store.get('stats', {});
    },
    
    'stats:reset': async () => {
      store.delete('stats');
      return { success: true };
    }
  }
};
```

## Installing Plugins

### Manual Installation

1. Create plugin directory: `~/.emerald/.plugins/my-plugin/`
2. Copy plugin files to that directory
3. Restart Emerald Launcher

### Plugin Manager

```javascript
// In your code
const pluginManager = require('./scripts/plugin-manager');
await pluginManager.installPlugin('https://github.com/user/plugin/archive/main.zip', 'my-plugin');
```

## Publishing Your Plugin

1. Create a GitHub repository
2. Add plugin metadata to `package.json`
3. Create `README.md` with:
   - Description
   - Installation instructions
   - Usage examples
   - Configuration options
4. Submit to [Emerald Plugin Registry](https://plugins.emerald.launcher)
5. Share with the community!

## Best Practices

### Performance
- Use async operations for long-running tasks
- Cache frequently accessed data
- Clean up resources in shutdown hooks
- Monitor memory usage

### Error Handling
```javascript
hooks: {
  'instance:launched': async (instanceId) => {
    try {
      // Plugin logic
    } catch (error) {
      api.log('error', `Plugin error: ${error.message}`);
    }
  }
}
```

### Security
- Never store sensitive data in plain text
- Validate user input
- Use HTTPS for API calls
- Request minimal permissions

### Documentation
- Document all hooks and commands
- Include configuration examples
- Provide troubleshooting tips
- Add screenshots/GIFs

## Testing Your Plugin

1. Create development directory in `~/.emerald/.plugins/`
2. Run `npm start` with your plugin loaded
3. Use browser DevTools to debug
4. Check logs in `~/.emerald/.logs/`

## Debugging

```javascript
module.exports = {
  hooks: {
    'launcher:ready': async (api) => {
      // Enable debug logging
      api.log('debug', 'Plugin debug info');
      
      // Inspect data
      console.log('Instances:', api.getInstances());
    }
  }
};
```

## Troubleshooting

### Plugin not loading
- Check `package.json` exists
- Check `index.js` exports valid module
- Check logs in `~/.emerald/.logs/`

### Hooks not firing
- Verify hook name is correct
- Check for errors in hook function
- Test with `launcher:ready` hook

### API methods unavailable
- Update to latest Emerald Launcher version
- Check API documentation for method availability
- File issue if method is missing

## Resources

- [Plugin API Documentation](./API.md)
- [Example Plugins](https://github.com/emerald-launcher-plugins)
- [Community Forums](https://github.com/Animeispeak69/Emerald-Launcher/discussions)
- [Issue Tracker](https://github.com/Animeispeak69/Emerald-Launcher/issues)
