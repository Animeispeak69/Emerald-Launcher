# Emerald Launcher

This repository contains an Electron-based Minecraft Java launcher scaffold called "Emerald Launcher".

What's new in this update
- Microsoft sign-in (device code flow) implemented in the main process: start device sign-in, poll for token, exchange to Xbox/XSTS, then obtain Minecraft access token.
- Account storage in user data (emerald_store.json). You can view and log out accounts inside the app.
- Java runtime manager: add multiple named Java runtimes (Java 7/8/11/17/21/25 etc) and select them for launching.
- UI improvements: right-side column for accounts and Java runtimes, horizontal (sideways) version list remains.

Important security & ownership notes
- You must sign in with a valid Microsoft account. This code implements the OAuth device-code flow which prompts you to visit a Microsoft URL and paste a code.
- Owning Minecraft: If the account does not own Minecraft, launching will likely fail. This launcher does NOT bypass purchase/ownership checks — it queries Minecraft services entitlements. You cannot legally play without owning the game.
- Client ID: The code uses a commonly used public client id by default (00000000402b5328). For production, register your own application in Azure and replace the client id in main.js.

Limitations
- The launcher currently implements a simple JVM -jar launch. It does NOT implement full library, natives, or assets installation required for all versions. For complete compatibility you'll need a full implementation that:
  - Downloads libraries and native dependencies
  - Extracts natives to a natives folder
  - Builds the correct classpath and launches the main class with proper args
- The Microsoft flow is device-code based for simplicity. You can extend this to PKCE/redirect flows for better UX.

How to use
1. npm install
2. npm start
3. Click "Sign in with Microsoft" and follow the device-code instructions shown.
4. Add Java runtimes using "Add Java..." (point to the java executable for each version you have installed). Give them a name such as "Java 17".
5. Download a client jar for a version, then Launch with a selected account and Java runtime.

If you want I can:
- Implement full version launch (libraries + natives + assets) for releases first.
- Replace device-code with a PKCE redirect flow using a registered app.
- Add a proper modal UI for login and progress indicators instead of prompts/alerts.

Again: I will not and cannot help bypass Minecraft ownership checks. You must own the game to play.
