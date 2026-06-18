# Emerald Launcher

Electron-based Minecraft Java launcher with comprehensive customization and performance optimization.

## Features

### Core Launcher
- **Minecraft Versions**: Browse and manage official releases, snapshots, alphas, and betas.
- **Microsoft Authentication**: Sign in with Microsoft account (device-code OAuth flow).
- **Java Runtimes**: Register and manage multiple Java versions (Java 7, 17, 21, 25, etc.).
- **Instances**: Create modded game instances per version + loader (e.g., 1.20.1-fabric).

### Mod Browser (Modrinth)
- Search mods, shaders, resource packs, and modpacks.
- **Comprehensive Filters**:
  - **Loaders**: Fabric, Forge, Quilt
  - **Categories**: Optimization, Educational, Utility, Adventure, Magic, Technology
  - **Auto-matching**: Filters by instance version and loader
- Download directly into instance folders.
- Modpack support: download all mod dependencies.

### Control Customization
- **Control Profiles**: Create multiple named control profiles.
- **Keyboard Keybinds**: Customize all keybinds (forward, back, left, right, jump, sneak, sprint, attack, use, inventory).
- **Gamepad Support**: Enable gamepad with customizable button mapping.
- **Switch Profiles**: Easily switch between profiles for different playstyles.

### Data Import
- **Import Saves**: Copy world saves from another Minecraft installation.
- **Import Resource Packs**: Bulk-import resource packs.
- **Import Shaders**: Bulk-import shader packs.
- **Per-Instance Import**: Each instance has its own mods, saves, shaders, and resource packs folders.

### Performance Optimization
- **JVM Arguments**: Customize heap size, GC settings, and more.
- **Renderer Selection**: Choose between Default, OpenGL, and Vulkan.
- **Graphics Quality**: Set to Fast or Fancy.
- **Render Distance**: Adjust from 2 to 32 chunks.
- **Default Optimized JVM**: Instances come with optimized G1GC JVM arguments for reduced lag.

## Getting Started

1. `npm install`
2. `npm start`
3. **Sign in** with Microsoft (sidebar).
4. **Add Java** runtime (sidebar).
5. **Select a Minecraft version** (center, horizontal list).
6. **Create an instance** ("New Instance..." button).
7. **Select the instance** in the sidebar.
8. **Search for mods** with filters, or **Import saves/shaders/packs** using the footer buttons.
9. **Customize controls** (⚙️ button) and **instance settings** (⚡ button).

## Control & Settings Buttons

- **⚙️ Controls**: Create and customize control profiles (keybinds, gamepad).
- **📥 Import**: Import saves, resource packs, and shaders into the selected instance.
- **⚡ Settings**: Tune JVM args, renderer, graphics quality, and render distance for the instance.

## Instance Storage

```
{userData}/.emerald/instances/{instanceId}/
  ├── mods/              (downloaded mods)
  ├── shaderpacks/       (shader packs)
  ├── resourcepacks/     (resource packs)
  ├── saves/             (world saves)
  ├── versions/          (version JSON)
  ├── libraries/         (mod loader libraries)
  ├── natives/           (native libraries)
  └── instance.json      (instance config)
```

## Performance Notes

- Default JVM args include optimized G1GC for reduced GC pauses (130ms target).
- Adjust JVM args in **⚡ Settings** for your hardware:
  - Low-end: `-Xmx1G -XX:+UseG1GC`
  - Mid-range: `-Xmx2G -XX:+UseG1GC` (default)
  - High-end: `-Xmx4G -XX:+UseG1GC -XX:MaxGCPauseMillis=100`
- Set Graphics to "Fast" and lower Render Distance for maximum performance.
- Use Vulkan renderer if your GPU supports it (faster than OpenGL on some systems).

## Next Steps

1. Auto-install Fabric/Forge/Quilt mod loaders into instances.
2. Full release launcher with library downloads and classpath handling.
3. CurseForge integration (requires API key).
4. Better launcher UI: modals, progress bars, download logs.
5. Automatic OptiFine/Sodium installation for performance.

## Architecture

- **main.js**: Electron main, instance/profile management, Modrinth API, file imports.
- **preload.js**: IPC bridge.
- **renderer.js**: UI logic, mod browser, control/settings UI, instance management.
- **index.html**: Sidebar layout, mod grid, control/import/settings sections (toggleable).
- **styles.css**: Dark theme, responsive grid.

## Security & Legal

- Tokens stored in plain JSON (consider encryption for production).
- You must own Minecraft to launch. This is not bypassed.
- Mods from Modrinth API.
