# Emerald Launcher

This repository contains a minimal Electron-based Minecraft Java launcher scaffold called "Emerald Launcher".

Features
- Fetches the official Mojang version_manifest.json and lists official versions.
- Filter by type: release, snapshot, old_alpha, old_beta.
- Horizontal (sideways) UI for browsing versions.
- Download the client jar for a version into a local application data folder.
- Very simple launch hook: you may launch Java with a downloaded jar if you provide a valid username and access token.

Important notes and limitations
- This is a scaffold/demonstration. It does not implement full authentication (do not paste credentials here unless you understand the risk). To actually obtain a valid access token you must use the official login flow (Mojang/Microsoft) or another launcher that supports auth.
- Launching requires a valid Minecraft access token and a proper Java runtime. Use this only if you know where your Java executable is.
- The launcher downloads official files directly from Mojang endpoints.

Getting started (development)
1. Install dependencies:

   npm install

2. Start the app:

   npm start

Usage
- Click the type buttons (release / snapshot / old_alpha / old_beta) to switch lists.
- Versions appear in a horizontal (sideways) scrollable list.
- Click a version to view details. If a client jar is available you can download it.
- To launch: select your Java executable ("Select Java") and provide your username and access token when prompted. This launcher does not perform authentication for you.

Security & legal
- This project is for educational purposes. Respect Mojang/Microsoft terms of service and do not distribute proprietary assets without permission.

Contributing
- Feel free to open issues or PRs to improve functionality (authentication flows, library handling, better process management, native libraries extraction, etc.).

License
- MIT
