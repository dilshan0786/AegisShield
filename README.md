# AegisShield - Cross-Platform Adult Content Protection & Anti-Tamper System

A comprehensive, tamper-proof adult content and explicit distraction blocker built for **Laptops/PC (Windows)** and **Mobile (Android)**.

---

## 🔒 Key Design Principles & Requirements Addressed

1. **System-Wide Multi-Layer Blocking**:
   - Blocks adult websites, cam portals, explicit streaming hubs, and proxies across **every browser and application** (Chrome, Edge, Firefox, Brave, VLC, webviews, apps).
   - Forces **Strict SafeSearch** on Google, Bing, YouTube (Restricted Mode), and DuckDuckGo.
   - Real-time window and process watchdog instantly intercepts explicit titles, queries, and keyword patterns.

2. **Master Password Enforcement ("Bina Password Ka Kuch Nahi Hoga")**:
   - **Initial Setup**: On first launch, the user is required to configure a strong Master Password.
   - **✨ Magic Button (Permanent Unbreakable Lockdown)**: An optional high-security mode that generates an impossible-to-memorize 32-character random key (`K9#mQ8$vL2!zR5*wP4@yT7^uN1&xB3`). Once activated, the user cannot remember the password to disable or uninstall the app during moments of temptation.
   - **Protected Actions**: The system cannot be turned off, closed, bypassed, or uninstalled without entering the Master Password.
   - **Password Change**: Changing the password requires entering and validating the current (old) password first.
   - **No Backdoors**: If the Master Password is lost (or Magic Lock activated), the only resort is a full device reset or system reinstallation.

3. **🎬 Smart Movie & Video Nudity Cover (Cinema Safe Mode)**:
   - For downloaded movies, web series, and streaming videos where explicit or nude scenes appear incidentally:
   - **Conceals Visuals with Black Screen**: Blanks out the screen immediately while dialogue **audio continues playing uninterrupted**.
   - **Unobtrusive Dismiss Button**: Includes a top-right corner `[✖ Remove Cover]` button and keyboard shortcut (`ESC` / `Ctrl + Shift + B`) so the user can easily uncover the screen whenever desired.

---

## 📂 Repository Architecture

```
d:/Project/protection/
├── desktop-pc/                # Windows PC Desktop Protection Application (Electron + Node.js)
│   ├── assets/                # App icons & visual branding
│   ├── engine/
│   │   ├── auth-store.js      # PBKDF2/SHA-512 Master Password hashing & storage
│   │   ├── protection-service.js # Hosts file injection & active window title watchdog
│   │   └── uninstall-guard.js # Password-protected uninstaller daemon
│   ├── ui/
│   │   ├── index.html         # Modern Cyber UI with Glassmorphism & live metrics
│   │   ├── styles.css         # Dark mode styling & animations
│   │   └── renderer.js        # Dynamic IPC events, tabs, and authentication prompts
│   ├── main.js                # Electron main process (system tray, anti-tamper exit guard)
│   ├── preload.js             # Secure context bridge
│   ├── package.json           # Scripts & dependencies
│   ├── start-hidden.vbs       # Silent background startup without console window
│   ├── install-autostart.bat  # Registers AegisShield to Windows startup registry
│   └── uninstall.bat          # Password-guarded uninstaller script
│
├── mobile-android/            # Native Android Mobile Protection App (Kotlin)
│   ├── app/
│   │   ├── src/main/java/com/aegisshield/protection/
│   │   │   ├── MainActivity.kt              # Dashboard & permission setup wizard
│   │   │   ├── BlockedActivity.kt           # Fullscreen alert overlay on content trigger
│   │   │   ├── PasswordPromptActivity.kt    # Anti-tamper password challenge
│   │   │   ├── admin/AegisDeviceAdminReceiver.kt # Device Admin (prevents uninstall)
│   │   │   ├── accessibility/AegisAccessibilityService.kt # Browser & Settings guard
│   │   │   ├── vpn/AegisVpnService.kt       # Local loopback Family DNS filter (1.1.1.3)
│   │   │   ├── security/SecurityManager.kt  # Encrypted password store (PBKDF2)
│   │   │   └── filter/FilterEngine.kt       # Domain & explicit keyword matching
│   │   └── src/main/res/                    # Layouts, themes, strings, XML policies
│   ├── build.gradle                         # Root Gradle config
│   └── settings.gradle
│
└── shared-filters/            # Shared Adult Content Filter Database
    ├── domains.json           # Top adult websites, cam portals, and explicit networks
    ├── keywords.json          # Explicit keyword dictionary & search patterns
    └── safesearch.json        # SafeSearch DNS configurations & Cloudflare 1.1.1.3 upstreams
```

---

## 💻 Running the Windows PC Application

### Prerequisites
- Node.js (v18+) and npm installed.

### 1. Launch the Desktop Application
Open a terminal in the `desktop-pc/` folder:
```powershell
cd d:\Project\protection\desktop-pc
npm start
```

### 2. First-Run Setup
- Upon initial launch, the **Set Your Master Password** dialog will appear.
- Enter and confirm your master password (minimum 6 characters).
- Once saved, AegisShield activates:
  1. System-wide hosts filter targeting adult domains.
  2. SafeSearch enforcement on Google, Bing, DuckDuckGo, and YouTube.
  3. Real-time background watchdog scanning all running window titles and browser tabs every 1.5 seconds.

### 3. Testing Anti-Tamper & Password Controls
- **Closing the App**: Clicking the `X` button will hide the window to the System Tray. To completely exit, you must select **Lock & Exit** and enter your Master Password.
- **Changing Password**: Open the **Password & Lock** tab, enter your existing password, and input your new password.
- **Uninstallation**: Running `uninstall.bat` launches `engine/uninstall-guard.js`, which strictly halts uninstallation unless your Master Password is provided.

### 4. Enable Autostart on Windows Boot
Run `install-autostart.bat` as Administrator to ensure AegisShield starts automatically with Windows.

---

## 📱 Building & Installing the Android Application

### Prerequisites
- Android Studio Hedgehog / Iguana / Jellyfish (or Android SDK command line tools with JDK 17).

### 1. Build the APK
Open terminal in `mobile-android/`:
```bash
cd d:\Project\protection\mobile-android
./gradlew assembleDebug
```
The APK will be generated at:
`mobile-android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Install on Android Device / Emulator
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3. Grant Required Protections on Phone:
1. **Set Master Password**: Enter master password on first launch.
2. **Device Administrator**: Tap *Enable Anti-Uninstall Admin*. This prevents standard uninstallation through Android Settings.
3. **Accessibility Service**: Tap *Enable Browser Content Monitor* and toggle AegisShield ON. This inspects URLs, text, and shields Android settings.
4. **Family DNS VPN**: Tap *Enable Network-Level Filter* to route DNS queries to Cloudflare Family (1.1.1.3) / CleanBrowsing.

---

## 🛡️ Content Filter Layers Summary

| Defense Layer | Mechanism | Protection Scope |
|---|---|---|
| **DNS Layer** | Cloudflare Family (1.1.1.3) & CleanBrowsing (185.228.168.168) | All apps, background webviews, and network traffic |
| **System Hosts** | Direct `0.0.0.0` loopback injection for 60,000+ adult domains | System-wide, unbypassable by standard browsers |
| **SafeSearch** | DNS CNAME enforcement for Google, Bing, YouTube Restricted, DuckDuckGo | Prevents adult imagery and videos in search engines |
| **Window Watchdog** | Active window title inspection & process termination | Closes media players, tabs, or apps displaying explicit titles |
| **Anti-Tamper Lock** | PBKDF2 Master Password on exit, uninstall, and settings changes | Prevents bypassing, disabling, or removing the shield |
