# Emerald Launcher APK Guide

Complete guide to building, installing, and using the Android APK version of Emerald Launcher.

## Features on Android

### ✅ Supported
- Minecraft version browser and download
- Instance management
- Mod browser (Modrinth)
- Control profile customization
- Touch-optimized UI
- Performance monitoring
- Backup and restore
- Auto-updates

### ⚠️ Limited
- Java runtime management (use system Java)
- Complex mod installations
- Custom JVM arguments

### ❌ Not Supported
- Game launching (requires PojavLauncher compatibility)
- Shader installations
- Advanced performance tuning

## Building the APK

### Prerequisites

```bash
# Install Java JDK 11+
java -version

# Install Android SDK
# Set ANDROID_SDK_ROOT environment variable
export ANDROID_SDK_ROOT=$HOME/Android/Sdk

# Install Gradle
gradle -version
```

### Build Steps

```bash
# Clone repository
git clone https://github.com/Animeispeak69/Emerald-Launcher.git
cd Emerald-Launcher

# Install dependencies
npm install

# Build APK
npm run build-apk

# APK location: dist/emerald-launcher.apk
```

## Installing on Device

### Via ADB (Recommended)

```bash
# Enable Developer Mode on device
# Settings > About > Build Number (tap 7 times)
# Settings > Developer Options > USB Debugging

# Connect device via USB and install
adb install dist/emerald-launcher.apk

# Launch app
adb shell am start -n com.emerald.launcher/.MainActivity
```

### Via File Manager

1. Enable "Unknown Sources" in Settings
2. Copy `emerald-launcher.apk` to device
3. Open file manager and tap APK file
4. Tap "Install"

## Usage on Mobile

### First Launch

1. Grant required permissions:
   - Storage (for saves and mods)
   - Camera (optional, for authentication)

2. Sign in with Microsoft account

3. Configure Java runtime (if available)

4. Create instances and manage mods

### Touch Controls

- **Swipe left/right** - Navigate sections
- **Tap and hold** - Context menu
- **Pinch zoom** - Scale mod browser
- **Double tap** - Select instance
- **Swipe up** - Scroll lists

## Performance Tips for Mobile

### Storage Optimization
```
Settings > Storage > Emerald Launcher
- Clear cache: ~500MB freed
- Clear data: Reset to defaults
```

### Memory Management
- Keep at most 3-4 active instances
- Delete unused instances regularly
- Close mods browser when not needed

### Game Optimization
- Lower render distance to 4-8 chunks
- Use "Fast" graphics mode
- Disable animations in mod browser
- Close background apps before launching

## Troubleshooting

### App crashes on launch
```bash
# Check logs
adb logcat | grep emerald

# Clear app cache
adb shell pm clear com.emerald.launcher

# Reinstall
adb uninstall com.emerald.launcher
adb install dist/emerald-launcher.apk
```

### Storage permission denied
1. Settings > Apps > Emerald Launcher > Permissions
2. Enable "Storage" permission
3. Restart app

### Slow mod browser
1. Clear app cache
2. Reduce filter options
3. Use specific search terms
4. Check internet connection

### Game won't launch
1. Ensure Java is installed
2. Check instance configuration
3. Verify mod compatibility
4. Check available RAM (need at least 2GB)

## File Locations on Android

```
/data/data/com.emerald.launcher/
├── files/
│   ├── instances/          # Game instances
│   ├── .backups/          # Backups
│   ├── .logs/             # Debug logs
│   └── .plugins/          # Plugins
└── cache/                 # Temporary files
```

### Access via ADB
```bash
# View file tree
adb shell find /data/data/com.emerald.launcher -type f

# Pull backup to computer
adb pull /data/data/com.emerald.launcher/files/.backups/

# Check logs
adb shell cat /data/data/com.emerald.launcher/files/.logs/emerald-*.log
```

## Distribution

### Google Play Store
(Coming Soon) Submit APK for app store review

### GitHub Releases
Download directly from releases page

### F-Droid
(Planned) Open-source app repository

## Device Requirements

### Minimum
- Android 10 (API 29+)
- 4GB RAM
- 2GB storage
- Snapdragon 600 or equivalent

### Recommended
- Android 12+
- 6GB+ RAM
- 5GB storage
- Snapdragon 800 or better

### Optimal
- Android 13+
- 8GB+ RAM
- 10GB storage
- Flagship device (GPU important)

## Known Limitations

1. **Game Launching** - Requires PojavLauncher for actual gameplay
2. **Mod Installation** - Some mods with complex dependencies may not install
3. **Save Backups** - Large world saves (>1GB) may timeout
4. **Performance** - Limited by device hardware
5. **Storage** - Limited to device storage (no cloud save yet)

## Getting Help

- **Bugs** - [GitHub Issues](https://github.com/Animeispeak69/Emerald-Launcher/issues)
- **Questions** - [GitHub Discussions](https://github.com/Animeispeak69/Emerald-Launcher/discussions)
- **Features** - Start a discussion first

## Contributing

Help improve mobile support:
1. Test on various devices
2. Report bugs with device info
3. Suggest UI improvements
4. Submit performance tips

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
