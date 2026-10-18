const fs = require('fs');
const path = require('path');
const readline = require('readline');
const AuthStore = require('./auth-store');
const ProtectionService = require('./protection-service');

function runUninstallGuard() {
  const authStore = new AuthStore();
  const protectionService = new ProtectionService(authStore);

  console.log('====================================================');
  console.log('       AEGIS SHIELD - SECURE UNINSTALLER            ');
  console.log('====================================================');

  if (!authStore.isConfigured()) {
    console.log('[!] AegisShield is not configured. Safe to remove files.');
    process.exit(0);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('[PROTECTED] Master Password is required to uninstall or remove AegisShield.');
  
  rl.question('Enter Master Password to confirm deactivation & uninstall: ', (answer) => {
    rl.close();
    if (authStore.verifyPassword(answer.trim())) {
      console.log('\n[SUCCESS] Master Password verified.');
      console.log('[-] Restoring hosts file and removing system-wide blocks...');
      protectionService.removeHostsProtection();
      protectionService.restoreDefaultDNS();
      
      // Cleanup data
      const dataFile = path.join(__dirname, '..', 'data', 'shield-data.json');
      if (fs.existsSync(dataFile)) {
        fs.unlinkSync(dataFile);
      }
      console.log('[+] AegisShield protection successfully deactivated and removed.');
      process.exit(0);
    } else {
      console.log('\n[ERROR] Incorrect Master Password! Access Denied.');
      console.log('[!] Protection remains active. System is secured.');
      process.exit(1);
    }
  });
}

if (require.main === module) {
  runUninstallGuard();
}

module.exports = { runUninstallGuard };
