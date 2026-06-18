# Emerald Launcher

Electron-based Minecraft Java launcher with modding support.

## Features

- **Minecraft Versions**: Browse and manage official Minecraft releases, snapshots, alphas, and betas.
- **Microsoft Authentication**: Sign in with Microsoft account using device-code OAuth flow. No purchase required for sign-in, but launching requires owning Minecraft.
- **Java Runtimes**: Register and manage multiple Java versions (Java 7, 17, 21, 25, etc.).
- **Instances**: Create modded game instances per version and loader combination (e.g., 1.20.1-fabric).
- **Mod Browser (Modrinth)**: Search and download mods, modpacks, shaders, and resource packs with **filters**:
  - **Loaders**: Fabric, Forge, Quilt
  - **Categories**: Optimization, Educational, Utility, Adventure, Magic, Technology
  - **Game Versions**: Auto-matched to instance version
- **Modpack Support**: Download full modpack mod lists into instance.
- **Instance Management**: Organize mods, shaders, and resource packs per instance.

## Getting Started

1. `npm install`
2. `npm start`
3. Sign in with Microsoft (sign-in does not require owning Minecraft, but launching does).
4. Add Java runtimes (click "Add Java..." and select your java executable).
5. Select a Minecraft version and create an instance with a loader (fabric/forge/quilt).
6. Search for mods using filters, select your instance, and add mods (they'll download to instance/mods).
7. Shaders go to instance/shaderpacks, resource packs to instance/resourcepacks.

## Important Limitations

- **Launcher**: The app downloads mods but does NOT yet implement full library/natives/classpath handling to launch modded instances. This is planned.
- **Loaders**: You must manually install the mod loader (Fabric/Forge/Quilt) into the instance folder. Auto-install is planned.
- **Ownership**: Accounts without Minecraft entitlements cannot launch. This is intentional and cannot be bypassed.

## Next Steps

1. Auto-install Fabric/Forge/Quilt loaders into instances.
2. Implement full release launcher with libraries, natives, and classpath.
3. CurseForge integration (requires API key).
4. Better UI: modals, progress bars, download logs.

## Architecture

- **main.js**: Electron main process, Modrinth API handlers, instance management.
- **preload.js**: IPC bridge to renderer.
- **renderer.js**: UI logic, version/mod browser, instance selection.
- **index.html**: Layout with sidebar, version browser, mod search with filters.
- **styles.css**: Dark theme, responsive grid for mod cards.

## Storage

- Accounts, Java runtimes, instances: `{userData}/.emerald/`
- Instance folders: `{userData}/.emerald/instances/{instanceId}/`

## Security & Legal

- Tokens stored in plain JSON (consider encryption for production).
- You must own Minecraft to launch the game. This is not bypassed.
- Mods are downloaded from Modrinth API (no CurseForge yet).
