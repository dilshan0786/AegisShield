# AegisShield - Cross-Platform Adult Content Protection & Anti-Tamper System

A comprehensive, tamper-proof adult content and explicit distraction blocker built for **Laptops/PC (Windows)** and **Mobile (Android)**.

---

## 🚀 Quick Download & Installation Guide (त्वरित डाउनलोड और इंस्टॉलेशन)

### 📱 1. Mobile (Android) Par Kaise Download Aur Install Karein:

#### 👉 Method A: Direct 1-Click APK Download (सबसे आसान तरीका)
1. GitHub Releases page par jayein:
   👉 **[Download Latest AegisShield APK](https://github.com/dilshan0786/AegisShield/releases/latest)**
2. **Assets** ke andar **`app-debug.apk`** par click karein. Download turant shuru ho jayega.
3. Download complete hone ke baad file par tap karke **Install** karein (*Allow Unknown Sources / Install from this source* allow karein agar prompt aaye).

#### 👉 Method B: GitHub Actions Artifacts Se Download:
1. **[GitHub Actions Runs Page](https://github.com/dilshan0786/AegisShield/actions)** open karein.
2. Sabse upar wale **Green Checkmark (✅)** run par click karein.
3. **Important for Mobile View**: Agar aap mobile phone par dekh rahe hain, to left menu mein **"Summary"** par tap karein (na ki "build" par).
4. Note: GitHub par artifacts download karne ke liye apna GitHub account **Sign In** hona zaroori hai.
5. Page ke bottom par **Artifacts** section mein **`AegisShield-Android-APK`** milega. Uspe click karke zip download karein, extract karein aur `app-debug.apk` install kar lijiye.

#### 🛡️ Mobile Par First-Time Setup:
1. **Set Master Password**: Pehli baar app open karne par Master Password set karein (Bina password ke protection remove nahi ho sakti).
2. **Device Administrator**: *Enable Anti-Uninstall Admin* par click karein (isse phone se app uninstall nahi ho sakegi).
3. **Accessibility Service**: *Enable Browser Content Monitor* par click karke AegisShield ko ON karein.
4. **Family DNS VPN**: *Enable Network-Level Filter* tap karein (adult sites pure phone mein block ho jayengi).

---

### 💻 2. PC (Windows Laptop) Par Kaise Run Aur Setup Karein:

#### Step 1: Code Ko Open Karein
Aapke laptop mein project folder already present hai:
```powershell
d:\Project\protection\desktop-pc
```

#### Step 2: Dependencies Install & Start Karein
Terminal (PowerShell ya CMD) mein yeh commands run karein:
```powershell
cd d:\Project\protection\desktop-pc
npm install
npm start
```

#### Step 3: Master Password Set Karein
- App start hote hi **"Set Master Password"** ka dialog aayega.
- Apna secret password daliye.
- Password set hote hi:
  - System hosts file mein adult domains block ho jayenge.
  - SafeSearch Google/Bing/YouTube par lock ho jayega.
  - Real-time Watchdog har 1.5 seconds mein explicit window titles aur browser tabs ko monitor karega.
  - Movies/videos ke liye **Smart Cinema Nudity Shield** active ho jayegi (explicit scenes mein screen black aur sound mute hoga, top-right mein `[✖ Remove Cover]` button se aap uncover kar sakte hain bina password ke).

#### Step 4: Laptop Restart Par Auto-Start Set Karein
Laptop band hoke chalu hone par bhi protection hamesha active rahe:
1. `desktop-pc/` folder mein jayein.
2. **`install-autostart.bat`** par **Right-Click** karein aur **"Run as Administrator"** select karein.
3. Ab AegisShield background mein silently auto-run karega.

#### 🔒 Tamper-Proof Rules on PC:
- **Exit Guard**: `X` button dabane par app band nahi hoti, seedha System Tray mein chali jaati hai. Exit karne ke liye **Master Password** compulsory hai.
- **Uninstall Guard**: `uninstall.bat` run karne par bina Master Password verify kiye uninstall nahi hoga.
- **✨ Magic Lock Button**: Agar aap permanent lockdown chahte hain jise aap khud bhi na khol sakein, to Magic Lock button dabayein jo 32-character ka random password generate kar deta hai.

---

## 🔒 Key Design Principles & Features

1. **System-Wide Multi-Layer Blocking**:
   - Blocks adult websites, cam portals, explicit streaming hubs, and proxies across **every browser and application** (Chrome, Edge, Firefox, Brave, VLC, webviews, apps).
   - Forces **Strict SafeSearch** on Google, Bing, YouTube (Restricted Mode), and DuckDuckGo.
   - Real-time window and process watchdog instantly intercepts explicit titles, queries, and keyword patterns.

2. **Master Password Enforcement ("Bina Password Ka Kuch Nahi Hoga")**:
   - **Initial Setup**: On first launch, the user is required to configure a strong Master Password.
   - **✨ Magic Button (Permanent Unbreakable Lockdown)**: Generates an impossible-to-memorize 32-character random key.
   - **Protected Actions**: The system cannot be turned off, closed, bypassed, or uninstalled without entering the Master Password.
   - **Password Change**: Changing the password requires entering and validating the current (old) password first.

3. **🎬 Smart Movie & Video Nudity Cover (Cinema Safe Mode)**:
   - For movies, web series, and streaming videos where explicit or nude scenes appear incidentally:
   - **Conceals Visuals with Black Screen**: Blanks out the screen immediately while dialogue **audio continues playing uninterrupted**.
   - **Unobtrusive Dismiss Button**: Includes a top-right corner `[✖ Remove Cover]` button and keyboard shortcut (`ESC` / `Ctrl + Shift + B`) so the user can easily uncover the screen whenever desired without needing a password.

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
│   ├── gradle.properties                    # AndroidX & JVM settings
│   └── settings.gradle
│
└── shared-filters/            # Shared Adult Content Filter Database
    ├── domains.json           # Top adult websites, cam portals, and explicit networks
    ├── keywords.json          # Explicit keyword dictionary & search patterns
    └── safesearch.json        # SafeSearch DNS configurations & Cloudflare 1.1.1.3 upstreams
```

---

## 🛡️ Content Filter Layers Summary

| Defense Layer | Mechanism | Protection Scope |
|---|---|---|
| **DNS Layer** | Cloudflare Family (1.1.1.3) & CleanBrowsing (185.228.168.168) | All apps, background webviews, and network traffic |
| **System Hosts** | Direct `0.0.0.0` loopback injection for 60,000+ adult domains | System-wide, unbypassable by standard browsers |
| **SafeSearch** | DNS CNAME enforcement for Google, Bing, YouTube Restricted, DuckDuckGo | Prevents adult imagery and videos in search engines |
| **Window Watchdog** | Active window title inspection & process termination | Closes media players, tabs, or apps displaying explicit titles |
| **Anti-Tamper Lock** | PBKDF2 Master Password on exit, uninstall, and settings changes | Prevents bypassing, disabling, or removing the shield |
