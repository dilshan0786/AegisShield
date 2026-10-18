// AegisShield Renderer Controller

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.dataset.tab;
      navItems.forEach(n => n.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const pane = document.getElementById(`tab-${targetTab}`);
      if (pane) pane.classList.add('active');
    });
  });

  // State Management
  let currentState = null;

  async function refreshState() {
    try {
      currentState = await window.aegisAPI.getState();
      renderState(currentState);
    } catch (err) {
      console.error('Failed to get state:', err);
    }
  }

  function renderState(state) {
    if (!state) return;

    // First run password setup modal
    const setupModal = document.getElementById('setupModal');
    if (!state.isConfigured) {
      setupModal.classList.remove('hidden');
    } else {
      setupModal.classList.add('hidden');
    }

    // Top status banner
    const statusBanner = document.getElementById('systemStatusBanner');
    const mainToggle = document.getElementById('mainProtectionToggle');
    const statusLabel = statusBanner.querySelector('.status-label');

    if (state.protectionEnabled) {
      statusBanner.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      statusLabel.textContent = 'SYSTEM ARMED & SECURE';
      statusLabel.style.color = 'var(--success)';
      mainToggle.classList.add('active');
      mainToggle.querySelector('.status-tag').textContent = 'ENABLED';
      mainToggle.querySelector('.status-tag').style.background = 'var(--success)';
    } else {
      statusBanner.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      statusLabel.textContent = 'PROTECTION INACTIVE';
      statusLabel.style.color = 'var(--danger)';
      mainToggle.classList.remove('active');
      mainToggle.querySelector('.status-tag').textContent = 'DISABLED';
      mainToggle.querySelector('.status-tag').style.background = 'var(--danger)';
    }

    // Metrics
    document.getElementById('statBlockedCount').textContent = state.stats?.totalBlocked || 0;
    if (state.stats?.lastBlockedTime) {
      const dt = new Date(state.stats.lastBlockedTime);
      document.getElementById('statLastBlocked').textContent = `Last threat: ${dt.toLocaleTimeString()}`;
    }

    // Render Threats in overview
    const threatsList = document.getElementById('recentThreatsList');
    if (state.logs && state.logs.length > 0) {
      threatsList.innerHTML = '';
      state.logs.slice(0, 5).forEach(log => {
        const item = document.createElement('div');
        item.className = 'threat-item';
        item.innerHTML = `
          <div class="threat-main">
            <span class="threat-target">🚫 Blocked: ${escapeHtml(log.title || log.trigger)}</span>
            <span class="threat-meta">Process: ${escapeHtml(log.app || 'Unknown')} • Trigger: ${escapeHtml(log.trigger || '')}</span>
          </div>
          <span class="badge-version">${new Date(log.timestamp).toLocaleTimeString()}</span>
        `;
        threatsList.appendChild(item);
      });
    } else {
      threatsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✨</div>
          <p>System clean. No active adult attempts intercepted in this session.</p>
        </div>
      `;
    }

    // Render Audit Table
    const tableBody = document.getElementById('logsTableBody');
    if (state.logs && state.logs.length > 0) {
      tableBody.innerHTML = '';
      state.logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${new Date(log.timestamp).toLocaleString()}</td>
          <td><code>${escapeHtml(log.app || 'App')}</code></td>
          <td><strong>${escapeHtml(log.title || 'Explicit Content')}</strong></td>
          <td><span class="badge-version">${escapeHtml(log.trigger || 'Adult Pattern')}</span></td>
          <td><span class="status-tag" style="background:var(--danger); color:#fff">TERMINATED</span></td>
        `;
        tableBody.appendChild(tr);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No audit logs recorded yet.</td></tr>`;
    }

    // Custom Domains Chips
    const domainsContainer = document.getElementById('customDomainsContainer');
    domainsContainer.innerHTML = '';
    (state.customBlockedDomains || []).forEach(dom => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `
        <span>${escapeHtml(dom)}</span>
        <span class="chip-remove" data-type="domain" data-val="${escapeHtml(dom)}">&times;</span>
      `;
      domainsContainer.appendChild(chip);
    });

    // Custom Keywords Chips
    const keywordsContainer = document.getElementById('customKeywordsContainer');
    keywordsContainer.innerHTML = '';
    (state.customBlockedKeywords || []).forEach(kw => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.innerHTML = `
        <span>${escapeHtml(kw)}</span>
        <span class="chip-remove" data-type="keyword" data-val="${escapeHtml(kw)}">&times;</span>
      `;
      keywordsContainer.appendChild(chip);
    });

    // Cinema Shield State
    const checkCinema = document.getElementById('checkCinemaShield');
    if (checkCinema) {
      checkCinema.checked = state.cinemaShieldEnabled !== false;
    }
    const currentMode = state.cinemaShieldMode || 'both';
    document.querySelectorAll('.mode-pill').forEach(pill => pill.classList.remove('active'));
    if (currentMode === 'both') {
      document.getElementById('labelModeBoth')?.classList.add('active');
      const r = document.getElementById('radioModeBoth');
      if (r) r.checked = true;
    } else if (currentMode === 'video_only') {
      document.getElementById('labelModeVideo')?.classList.add('active');
      const r = document.getElementById('radioModeVideo');
      if (r) r.checked = true;
    } else if (currentMode === 'audio_only') {
      document.getElementById('labelModeAudio')?.classList.add('active');
      const r = document.getElementById('radioModeAudio');
      if (r) r.checked = true;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // First Run Setup Password
  const formSetup = document.getElementById('formSetupPassword');
  formSetup.addEventListener('submit', async (e) => {
    e.preventDefault();
    const p1 = document.getElementById('inputSetupPassword').value;
    const p2 = document.getElementById('inputSetupPasswordConfirm').value;
    const msg = document.getElementById('setupErrorMsg');

    if (p1 !== p2) {
      msg.textContent = 'Passwords do not match!';
      msg.className = 'form-message error';
      return;
    }
    if (p1.length < 6) {
      msg.textContent = 'Password must be at least 6 characters long.';
      msg.className = 'form-message error';
      return;
    }

    try {
      const res = await window.aegisAPI.setupMasterPassword(p1);
      if (res.success) {
        document.getElementById('setupModal').classList.add('hidden');
        await refreshState();
      } else {
        msg.textContent = res.error || 'Failed to setup password.';
        msg.className = 'form-message error';
      }
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'form-message error';
    }
  });

  // Cryptographically random 32-character unmemorizable key generator
  function generateRandomSecurePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?';
    const array = new Uint32Array(32);
    window.crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  let magicLockAction = null; // 'setup' | 'change'
  let cachedOldPasswordForMagic = null;

  const magicModal = document.getElementById('magicConfirmModal');
  const btnMagicSetup = document.getElementById('btnMagicSetup');
  const btnMagicChange = document.getElementById('btnMagicChange');
  const btnCancelMagic = document.getElementById('btnCancelMagic');
  const btnConfirmMagicLock = document.getElementById('btnConfirmMagicLock');

  if (btnMagicSetup) {
    btnMagicSetup.addEventListener('click', () => {
      magicLockAction = 'setup';
      magicModal.classList.remove('hidden');
    });
  }

  if (btnMagicChange) {
    btnMagicChange.addEventListener('click', () => {
      promptPassword('Authorize Permanent Magic Lock', (oldPwd) => {
        magicLockAction = 'change';
        cachedOldPasswordForMagic = oldPwd;
        magicModal.classList.remove('hidden');
      });
    });
  }

  if (btnCancelMagic) {
    btnCancelMagic.addEventListener('click', () => {
      magicModal.classList.add('hidden');
      magicLockAction = null;
      cachedOldPasswordForMagic = null;
    });
  }

  if (btnConfirmMagicLock) {
    btnConfirmMagicLock.addEventListener('click', async () => {
      const randomPassword = generateRandomSecurePassword();
      magicModal.classList.add('hidden');

      try {
        if (magicLockAction === 'setup') {
          const res = await window.aegisAPI.setupMasterPassword(randomPassword);
          if (res.success) {
            document.getElementById('setupModal').classList.add('hidden');
            alert('✨ Magic Lock Activated! An unmemorizable 32-character key has permanently secured this device.');
            await refreshState();
          } else {
            alert('Setup failed: ' + res.error);
          }
        } else if (magicLockAction === 'change' && cachedOldPasswordForMagic) {
          const res = await window.aegisAPI.changePassword(cachedOldPasswordForMagic, randomPassword);
          if (res.success) {
            alert('✨ Permanent Magic Lock Engaged! Password randomized. Protection can no longer be turned off or uninstalled.');
            await refreshState();
          } else {
            alert('Update failed: ' + res.error);
          }
        }
      } catch (err) {
        alert('Magic Lock error: ' + err.message);
      } finally {
        magicLockAction = null;
        cachedOldPasswordForMagic = null;
      }
    });
  }

  // Cinema Safe Nudity Shield Triggers
  const btnTestNudityShield = document.getElementById('btnTestNudityShield');
  const btnTriggerOverlayRule = document.getElementById('btnTriggerOverlayRule');

  if (btnTestNudityShield) {
    btnTestNudityShield.addEventListener('click', async () => {
      await window.aegisAPI.triggerNudityOverlay();
    });
  }

  if (btnTriggerOverlayRule) {
    btnTriggerOverlayRule.addEventListener('click', async () => {
      await window.aegisAPI.triggerNudityOverlay();
    });
  }

  // Change Password
  const formChangePassword = document.getElementById('formChangePassword');
  formChangePassword.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldP = document.getElementById('inputOldPassword').value;
    const newP = document.getElementById('inputNewPassword').value;
    const confirmP = document.getElementById('inputConfirmNewPassword').value;
    const msg = document.getElementById('changePasswordMsg');

    if (newP !== confirmP) {
      msg.textContent = 'New passwords do not match.';
      msg.className = 'form-message error';
      return;
    }
    if (newP.length < 6) {
      msg.textContent = 'New password must be at least 6 characters.';
      msg.className = 'form-message error';
      return;
    }

    try {
      const res = await window.aegisAPI.changePassword(oldP, newP);
      if (res.success) {
        msg.textContent = 'Master password successfully updated!';
        msg.className = 'form-message success';
        formChangePassword.reset();
      } else {
        msg.textContent = res.error || 'Current password incorrect!';
        msg.className = 'form-message error';
      }
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'form-message error';
    }
  });

  // PASSWORD-FREE Cinema Shield Controls (Toggle & Modes)
  const checkCinemaShield = document.getElementById('checkCinemaShield');
  if (checkCinemaShield) {
    checkCinemaShield.addEventListener('change', async () => {
      await window.aegisAPI.updateCinemaSettings({ cinemaShieldEnabled: checkCinemaShield.checked });
      await refreshState();
    });
  }

  const modeRadios = document.querySelectorAll('input[name="cinemaMode"]');
  modeRadios.forEach(radio => {
    radio.addEventListener('change', async () => {
      await window.aegisAPI.updateCinemaSettings({ cinemaShieldMode: radio.value });
      await refreshState();
    });
  });

  // Add Custom Domain
  document.getElementById('btnAddDomain').addEventListener('click', async () => {
    const input = document.getElementById('inputCustomDomain');
    const val = input.value.trim().toLowerCase();
    if (!val) return;

    promptPassword('Authorize Adding Blocked Domain', async (pwd) => {
      const current = currentState?.customBlockedDomains || [];
      if (!current.includes(val)) {
        current.push(val);
        await window.aegisAPI.updateSettings(pwd, { customBlockedDomains: current });
        input.value = '';
        await refreshState();
      }
    });
  });

  // Add Custom Keyword
  document.getElementById('btnAddKeyword').addEventListener('click', async () => {
    const input = document.getElementById('inputCustomKeyword');
    const val = input.value.trim().toLowerCase();
    if (!val) return;

    promptPassword('Authorize Adding Explicit Keyword', async (pwd) => {
      const current = currentState?.customBlockedKeywords || [];
      if (!current.includes(val)) {
        current.push(val);
        await window.aegisAPI.updateSettings(pwd, { customBlockedKeywords: current });
        input.value = '';
        await refreshState();
      }
    });
  });

  // Remove Chip delegation
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('chip-remove')) {
      const type = e.target.dataset.type;
      const val = e.target.dataset.val;

      promptPassword('Authorize Removal of Filter Rule', async (pwd) => {
        if (type === 'domain') {
          const list = (currentState?.customBlockedDomains || []).filter(d => d !== val);
          await window.aegisAPI.updateSettings(pwd, { customBlockedDomains: list });
        } else if (type === 'keyword') {
          const list = (currentState?.customBlockedKeywords || []).filter(k => k !== val);
          await window.aegisAPI.updateSettings(pwd, { customBlockedKeywords: list });
        }
        await refreshState();
      });
    }
  });

  // Sync System Rules
  document.getElementById('btnSyncFilters').addEventListener('click', async () => {
    try {
      const res = await window.aegisAPI.applyHostsFilter();
      if (res.success) {
        alert('System rules synchronized! Hosts & DNS filters reloaded successfully.');
      } else {
        alert('Sync notice: ' + (res.error || 'Rules verified.'));
      }
      await refreshState();
    } catch (e) {
      alert('Sync error: ' + e.message);
    }
  });

  // Exit App Lock Button
  document.getElementById('btnExitApp').addEventListener('click', () => {
    promptPassword('Enter Master Password to Exit Protection', async (pwd) => {
      const res = await window.aegisAPI.authorizeAndExit(pwd);
      if (!res.success) {
        alert(res.error || 'Incorrect Master Password!');
      }
    });
  });

  // Deactivate Shield Button
  document.getElementById('btnDeactivateShield').addEventListener('click', async () => {
    const pwd = document.getElementById('inputDeactivatePassword').value;
    const msg = document.getElementById('deactivateMsg');
    if (!pwd) {
      msg.textContent = 'Please enter Master Password.';
      msg.className = 'form-message error';
      return;
    }
    const res = await window.aegisAPI.toggleProtection(pwd, false);
    if (res.success) {
      msg.textContent = 'Protection disabled temporarily.';
      msg.className = 'form-message success';
      await refreshState();
    } else {
      msg.textContent = res.error || 'Incorrect Password!';
      msg.className = 'form-message error';
    }
  });

  // Uninstallation Authorization Button
  document.getElementById('btnUninstallApp').addEventListener('click', async () => {
    const pwd = document.getElementById('inputDeactivatePassword').value;
    const msg = document.getElementById('deactivateMsg');
    if (!pwd) {
      msg.textContent = 'Please enter Master Password.';
      msg.className = 'form-message error';
      return;
    }
    const verified = await window.aegisAPI.verifyPassword(pwd);
    if (verified.success) {
      if (confirm('Are you sure you want to completely deactivate and remove AegisShield? All adult protection will be revoked.')) {
        await window.aegisAPI.toggleProtection(pwd, false);
        alert('Protection deauthorized. You may now run uninstall.bat or delete files.');
        await window.aegisAPI.authorizeAndExit(pwd);
      }
    } else {
      msg.textContent = 'Incorrect Master Password! Uninstallation prohibited.';
      msg.className = 'form-message error';
    }
  });

  // Refresh Audit
  document.getElementById('btnRefreshLogs').addEventListener('click', refreshState);

  // Real-time Threat Event from Background Watchdog
  window.aegisAPI.onThreatIntercepted((threat) => {
    refreshState();
  });

  // Intercept exit prompt trigger from main process / tray
  window.aegisAPI.onPromptExitDialog(() => {
    promptPassword('Enter Master Password to Exit AegisShield', async (pwd) => {
      const res = await window.aegisAPI.authorizeAndExit(pwd);
      if (!res.success) {
        alert(res.error || 'Incorrect Master Password!');
      }
    });
  });

  // Helper Modal Password Prompter
  let activeAuthCallback = null;
  function promptPassword(title, callback) {
    const modal = document.getElementById('actionAuthModal');
    const input = document.getElementById('inputAuthPassword');
    const errorMsg = document.getElementById('authErrorMsg');
    document.getElementById('authModalTitle').textContent = title || 'Master Password Required';
    input.value = '';
    errorMsg.textContent = '';
    activeAuthCallback = callback;
    modal.classList.remove('hidden');
    input.focus();
  }

  document.getElementById('btnCancelAuth').addEventListener('click', () => {
    document.getElementById('actionAuthModal').classList.add('hidden');
    activeAuthCallback = null;
  });

  document.getElementById('formAuthAction').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = document.getElementById('inputAuthPassword').value;
    const errorMsg = document.getElementById('authErrorMsg');
    const check = await window.aegisAPI.verifyPassword(pwd);
    if (check.success) {
      document.getElementById('actionAuthModal').classList.add('hidden');
      if (activeAuthCallback) {
        activeAuthCallback(pwd);
        activeAuthCallback = null;
      }
    } else {
      errorMsg.textContent = 'Incorrect Master Password!';
      errorMsg.className = 'form-message error';
    }
  });

  // Initialize
  await refreshState();
});
