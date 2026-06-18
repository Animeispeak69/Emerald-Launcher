# Emerald Launcher

This repository contains an Electron-based Minecraft Java launcher scaffold called "Emerald Launcher".

What's new in this update
- Modrinth integration: search Modrinth projects, pick versions compatible with the selected Minecraft version and mod loader, download mod files into an instance mods folder.
- Modpack download support (basic): downloads referenced mod versions from a Modrinth modpack version into an instance's mods folder.
- Instances: mods and modpacks are saved under {userData}/.emerald/instances/{instanceId}/mods. An instanceId is created using the pattern <mc_version>-<loader> (for example, 1.20.1-fabric).

How it works
- Select a Minecraft version in the launcher. When adding a mod, you'll be prompted for a target mod loader (fabric/forge/quilt).
- The app searches the Modrinth API for the project, finds a version that matches your selected Minecraft version and loader (if possible), and downloads the mod jar into the instance's mods folder.
- For modpacks, the app will download referenced mod versions and place them into the instance mods folder.

Why Modrinth?
- Modrinth provides a public API that allows searching projects and fetching version files without needing an API key. CurseForge requires an API key for many operations — if you want CurseForge integration I can add it, but you'll likely need to provide an API key.

Important limitations
- This only downloads mod files into an instance folder. It does NOT install or configure mod loaders (Fabric/Forge/Quilt). You must install the appropriate mod loader for the instance before launching.
- The Minecraft launch path is still a simple -jar stub and does not implement full library/native/assets/classpath handling. To reliably run modded instances we need to implement the full launch pipeline and also install the chosen mod loader.
- Modrinth search/selection uses a simple algorithm (first version matching game version & loader). It may not pick the absolute latest recommended file for every project; you can improve the selection heuristics.

Next steps I can implement
1) Auto-install mod loaders (Fabric installer / Forge installer) into an instance and wire that to the full launch pipeline so modded instances run.
2) Implement full release launcher: download libraries, extract natives, build classpath and args so Minecraft launches correctly.
3) CurseForge integration (requires API key) to allow searching/downloading mods, modpacks and shaders from CurseForge.
4) Replace prompt/confirm flows with a proper in-app modal UI and progress bars for downloads.

If you want me to proceed, say which of the next steps you'd like me to implement first (I recommend: "Auto-install mod loaders and implement full release launch").
