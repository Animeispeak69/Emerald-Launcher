# Build Instructions for Emerald Launcher

## Prerequisites

### Windows
- Windows 10+
- Node.js 16+ and npm
- Visual Studio Build Tools (for native modules)

### macOS
- macOS 10.13+
- Node.js 16+ and npm
- Xcode Command Line Tools: `xcode-select --install`

### Linux
- Ubuntu 20.04+ (or equivalent)
- Node.js 16+ and npm
- Build tools: `sudo apt-get install build-essential`

### Android APK
- Java JDK 11+
- Android SDK 29+
- Gradle 7.0+

## Installation

```bash
# Clone the repository
git clone https://github.com/Animeispeak69/Emerald-Launcher.git
cd Emerald-Launcher

# Install dependencies
npm install
```

## Development

```bash
# Start development server
npm start

# Start with debug mode
npm run dev

# Run linter
npm run lint

# Format code
npm run format

# Run tests
npm test
```

## Building for Distribution

### Windows (.exe)
```bash
npm run build-win
# Output: dist/Emerald Launcher Setup.exe and dist/Emerald Launcher.exe
```

### macOS (.dmg)
```bash
npm run build-mac
# Output: dist/Emerald Launcher.dmg
```

### Linux (.AppImage)
```bash
npm run build-linux
# Output: dist/Emerald Launcher.AppImage
```

### Android (.apk)
```bash
# First, ensure Android SDK is set up
npm run build-apk
# Output: dist/emerald-launcher.apk
```

### All Platforms
```bash
npm run build-all
# Generates installers for Windows, macOS, Linux, and APK
```

## Platform-Specific Notes

### Windows
- Installer includes uninstaller
- Portable version available as `.exe`
- Auto-updates work on all Windows 10+

### macOS
- DMG file for easy drag-and-drop installation
- Code signing available (requires certificate)
- Notarization support for Gatekeeper

### Linux
- AppImage is self-contained
- DEB package available for Debian-based systems
- No external dependencies required

### Android
- Requires API level 29+
- ARM and ARM64 architectures supported
- Optimized for mobile touch interface

## Troubleshooting

### Build Fails on Windows
```bash
# Install Windows build tools globally
npm install --global --production windows-build-tools

# Then try building again
npm run build-win
```

### Build Fails on macOS
```bash
# Install Xcode command line tools
xcode-select --install

# Clear npm cache
npm cache clean --force

# Rebuild
npm run build-mac
```

### APK Build Fails
```bash
# Ensure Android SDK is in PATH
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/platform-tools

# Try building again
npm run build-apk
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit changes
4. Create git tag: `git tag v1.5.0`
5. Push tag: `git push origin v1.5.0`
6. GitHub Actions will automatically build and release

## Publishing

### GitHub Releases
Automatically published when you push a version tag.

### Windows Store
(Planned) Submit to Microsoft Store via partner center.

### macOS App Store
(Planned) Submit to macOS App Store review.

### Linux Repositories
(Planned) Submit to Flathub and AUR.

### Google Play Store
(Planned) Submit APK to Google Play Store.

## Code Signing

### Windows Code Signing
```bash
# Set environment variable with certificate
export ELECTRON_BUILDER_SIGNING_CERTIFICATE_PATH=path/to/cert.pfx
export ELECTRON_BUILDER_SIGNING_CERTIFICATE_PASSWORD=password

npm run build-win
```

### macOS Code Signing
```bash
# Set up signing identity
export APPLE_ID=your-apple-id
export APPLE_ID_PASSWORD=your-password
export APPLE_TEAM_ID=your-team-id

npm run build-mac
```

## Performance Tips

- Use `npm ci` instead of `npm install` for production builds
- Enable code splitting for faster loading
- Use tree-shaking to reduce bundle size
- Profile with DevTools before release

## Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Guide](https://www.electron.build/)
- [Cordova Documentation](https://cordova.apache.org/)
- [Android Development](https://developer.android.com/)