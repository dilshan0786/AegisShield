const fs = require('fs');
const path = require('path');
const { exec, execSync, spawn } = require('child_process');

class ProtectionService {
  constructor(authStore, sharedFiltersDir) {
    this.authStore = authStore;
    this.sharedFiltersDir = sharedFiltersDir || path.join(__dirname, '..', '..', 'shared-filters');
    this.hostsFilePath = process.platform === 'win32'
      ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
      : '/etc/hosts';
    
    this.watchdogInterval = null;
    this.isWatchdogRunning = false;
    this.onThreatCallback = null;

    this.loadFilters();
  }

  loadFilters() {
    try {
      const domainsRaw = fs.readFileSync(path.join(this.sharedFiltersDir, 'domains.json'), 'utf8');
      this.domainsList = JSON.parse(domainsRaw).domains || [];
    } catch (e) {
      this.domainsList = [];
    }

    try {
      const keywordsRaw = fs.readFileSync(path.join(this.sharedFiltersDir, 'keywords.json'), 'utf8');
      const kwData = JSON.parse(keywordsRaw);
      this.keywordsList = [
        ...(kwData.categories?.explicit_keywords || []),
        ...(kwData.categories?.high_risk_search_patterns || [])
      ];
    } catch (e) {
      this.keywordsList = [];
    }

    try {
      const safeSearchRaw = fs.readFileSync(path.join(this.sharedFiltersDir, 'safesearch.json'), 'utf8');
      this.safeSearchConfig = JSON.parse(safeSearchRaw);
    } catch (e) {
      this.safeSearchConfig = { safesearch_hosts: [] };
    }
  }

  getAllBlockedDomains() {
    const custom = this.authStore.data.customBlockedDomains || [];
    return Array.from(new Set([...this.domainsList, ...custom]));
  }

  getAllBlockedKeywords() {
    const custom = this.authStore.data.customBlockedKeywords || [];
    return Array.from(new Set([...this.keywordsList, ...custom])).map(k => k.toLowerCase().trim());
  }

  applyHostsProtection() {
    const state = this.authStore.getState();
    if (!state.protectionEnabled || !state.hostsFilterEnabled) {
      return this.removeHostsProtection();
    }

    const allDomains = this.getAllBlockedDomains();
    const tagStart = '# === AEGIS SHIELD ADULT PROTECTION BEGIN ===';
    const tagEnd = '# === AEGIS SHIELD ADULT PROTECTION END ===';

    let hostsContent = '';
    try {
      hostsContent = fs.readFileSync(this.hostsFilePath, 'utf8');
    } catch (err) {
      return { success: false, error: 'Cannot read hosts file: ' + err.message };
    }

    // Strip previous block
    const regex = new RegExp(`${tagStart}[\\s\\S]*?${tagEnd}`, 'g');
    let cleaned = hostsContent.replace(regex, '').trim();

    // Build block entries
    let blockRules = `\n\n${tagStart}\n`;
    blockRules += `# Adult Content Blocker Rules (${allDomains.length} domains)\n`;
    for (const d of allDomains) {
      blockRules += `0.0.0.0 ${d}\n`;
    }

    // Add SafeSearch entries if enabled
    if (state.safeSearchEnabled && this.safeSearchConfig.safesearch_hosts) {
      blockRules += `\n# SafeSearch Forced Enforcements\n`;
      for (const entry of this.safeSearchConfig.safesearch_hosts) {
        for (const t of entry.targets) {
          blockRules += `${entry.ip} ${t}\n`;
        }
      }
    }
    blockRules += `${tagEnd}\n`;

    const finalContent = cleaned + blockRules;

    try {
      fs.writeFileSync(this.hostsFilePath, finalContent, 'utf8');
      this.flushDns();
      return { success: true, count: allDomains.length };
    } catch (writeErr) {
      // Need elevation: execute via elevated PowerShell
      return this.writeHostsElevated(finalContent);
    }
  }

  removeHostsProtection() {
    const tagStart = '# === AEGIS SHIELD ADULT PROTECTION BEGIN ===';
    const tagEnd = '# === AEGIS SHIELD ADULT PROTECTION END ===';

    let hostsContent = '';
    try {
      hostsContent = fs.readFileSync(this.hostsFilePath, 'utf8');
    } catch (err) {
      return { success: false, error: err.message };
    }

    const regex = new RegExp(`${tagStart}[\\s\\S]*?${tagEnd}`, 'g');
    const cleaned = hostsContent.replace(regex, '').trim() + '\n';

    try {
      fs.writeFileSync(this.hostsFilePath, cleaned, 'utf8');
      this.flushDns();
      return { success: true, removed: true };
    } catch (writeErr) {
      return this.writeHostsElevated(cleaned);
    }
  }

  writeHostsElevated(newContent) {
    const tempFile = path.join(process.env.TEMP || '.', `aegis_hosts_${Date.now()}.tmp`);
    fs.writeFileSync(tempFile, newContent, 'utf8');

    const psCommand = `Start-Process powershell -Verb RunAs -Wait -ArgumentList "-NoProfile -Command Copy-Item -Path '${tempFile}' -Destination '${this.hostsFilePath}' -Force; Clear-DnsClientCache"`;
    try {
      execSync(`powershell -NoProfile -Command "${psCommand}"`, { windowsHide: true });
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return { success: true, elevated: true };
    } catch (elevErr) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      return { success: false, error: 'Administrator permission required to modify hosts file: ' + elevErr.message };
    }
  }

  flushDns() {
    if (process.platform === 'win32') {
      exec('ipconfig /flushdns', { windowsHide: true }, () => {});
    }
  }

  applyFamilyDNS() {
    if (process.platform !== 'win32') return;
    const psScript = `
      Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ServerAddresses ('1.1.1.3', '1.0.0.3')
      }
    `;
    const elevated = `Start-Process powershell -Verb RunAs -Wait -ArgumentList "-NoProfile -Command \\"${psScript.replace(/"/g, '`"')}\\""`;
    try {
      exec(`powershell -NoProfile -Command "${elevated}"`, { windowsHide: true });
    } catch (e) {
      console.error('Failed to set family DNS:', e);
    }
  }

  restoreDefaultDNS() {
    if (process.platform !== 'win32') return;
    const psScript = `
      Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | ForEach-Object {
        Set-DnsClientServerAddress -InterfaceIndex $_.InterfaceIndex -ResetServerAddresses
      }
    `;
    const elevated = `Start-Process powershell -Verb RunAs -Wait -ArgumentList "-NoProfile -Command \\"${psScript.replace(/"/g, '`"')}\\""`;
    try {
      exec(`powershell -NoProfile -Command "${elevated}"`, { windowsHide: true });
    } catch (e) {
      console.error('Failed to reset DNS:', e);
    }
  }

  startWatchdog(onThreat, onCinemaScene) {
    if (this.isWatchdogRunning) return;
    this.isWatchdogRunning = true;
    this.onThreatCallback = onThreat;
    this.onCinemaSceneCallback = onCinemaScene;

    const keywords = this.getAllBlockedKeywords();
    const domains = this.getAllBlockedDomains();

    // Query active window titles every 1.5 seconds using PowerShell
    this.watchdogInterval = setInterval(() => {
      const state = this.authStore.getState();
      if (!state.protectionEnabled || !state.watchdogEnabled) {
        return;
      }

      const psCmd = `Get-Process | Where-Object { $_.MainWindowTitle -ne '' } | Select-Object Id, ProcessName, MainWindowTitle | ConvertTo-Json -Compress`;
      exec(`powershell -NoProfile -Command "${psCmd}"`, { windowsHide: true, maxBuffer: 1024 * 1024 }, (err, stdout) => {
        if (err || !stdout) return;
        try {
          let list = JSON.parse(stdout.trim());
          if (!Array.isArray(list)) list = [list];

          for (const item of list) {
            if (!item.MainWindowTitle) continue;
            const titleLower = item.MainWindowTitle.toLowerCase();
            const procName = (item.ProcessName || '').toLowerCase();

            // Whitelist developer tools, IDEs, terminals, and productivity apps
            const safeProcesses = [
              'electron', 'code', 'devenv', 'idea64', 'studio64', 'pycharm64',
              'cmd', 'powershell', 'pwsh', 'windowsterminal', 'git', 'explorer',
              'slack', 'discord', 'teams', 'notepad', 'notepad++'
            ];
            if (safeProcesses.some(sp => procName.includes(sp))) {
              continue;
            }

            if (titleLower.includes('aegisshield') || titleLower.includes('pure protection')) {
              continue;
            }

            // Word-boundary check for explicit keywords to avoid false positives in normal work/research
            let matchedTrigger = null;
            for (const kw of keywords) {
              if (kw.length < 3) continue;
              // Use regex word boundary so "document", "class", "assess" etc never match
              const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const wordBoundaryRegex = new RegExp(`(^|\\W)${escaped}(\\W|$)`, 'i');
              if (wordBoundaryRegex.test(titleLower)) {
                matchedTrigger = kw;
                break;
              }
            }

            // Check if any specific adult domain is in the window title
            if (!matchedTrigger) {
              for (const dom of domains) {
                const domClean = dom.replace('www.', '').toLowerCase();
                if (titleLower.includes(domClean)) {
                  matchedTrigger = domClean;
                  break;
                }
              }
            }

            if (matchedTrigger) {
              // Check if this is a movie / media player or explicit scene in a video
              const mediaPlayers = ['vlc', 'mpc-hc', 'mpc-hc64', 'potplayer', 'potplayermini64', 'wmplayer', 'mpv', 'kmplayer', 'gomp', 'movies.picker', 'applicationframehost'];
              const isMediaPlayer = mediaPlayers.some(mp => procName.includes(mp));
              const explicitSceneMarkers = ['scene', 'nude', 'nudity', 'strip', 'erotic', 'love making', 'kiss', 'steamy', 'bed scene', 'uncensored'];
              const isSceneContext = explicitSceneMarkers.some(m => titleLower.includes(m));

              if ((isMediaPlayer || isSceneContext) && state.cinemaShieldEnabled) {
                // AUTOMATICALLY activate the Cinema Black Screen / Audio Shield without killing movie!
                this.interceptCinemaScene(item.ProcessName, item.MainWindowTitle, matchedTrigger);
              } else {
                // Hard porn site or explicit search -> terminate process
                this.interceptThreat(item.Id, item.ProcessName, item.MainWindowTitle, matchedTrigger);
              }
              break;
            }
          }
        } catch (e) {
          // Transient process scanning error
        }
      });
    }, 1500);
  }

  stopWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
    this.isWatchdogRunning = false;
  }

  interceptCinemaScene(processName, windowTitle, trigger) {
    const logEntry = this.authStore.addLog({
      type: 'CINEMA_SCENE_CONCEALED',
      app: processName,
      title: windowTitle,
      trigger: trigger,
      action: 'SCREEN_BLACKED_AUDIO_PROTECTED'
    });

    if (this.onCinemaSceneCallback) {
      this.onCinemaSceneCallback(logEntry);
    }
  }

  interceptThreat(processId, processName, windowTitle, trigger) {
    // Terminate the process to protect user immediately
    try {
      exec(`powershell -NoProfile -Command "Stop-Process -Id ${processId} -Force"`, { windowsHide: true });
    } catch (e) {
      console.error(`Failed to terminate process ${processId}:`, e);
    }

    const logEntry = this.authStore.addLog({
      type: 'BLOCKED_THREAT',
      app: processName,
      title: windowTitle,
      trigger: trigger,
      action: 'PROCESS_TERMINATED'
    });

    if (this.onThreatCallback) {
      this.onThreatCallback(logEntry);
    }
  }
}

module.exports = ProtectionService;
