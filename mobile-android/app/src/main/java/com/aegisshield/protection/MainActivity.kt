package com.aegisshield.protection

import android.app.AlertDialog
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import android.provider.Settings
import android.view.LayoutInflater
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.aegisshield.protection.admin.AegisDeviceAdminReceiver
import com.aegisshield.protection.security.SecurityManager
import com.aegisshield.protection.vpn.AegisVpnService

class MainActivity : AppCompatActivity() {

    private lateinit var securityManager: SecurityManager
    private lateinit var devicePolicyManager: DevicePolicyManager
    private lateinit var adminComponent: ComponentName

    companion object {
        private const val REQUEST_CODE_VPN = 101
        private const val REQUEST_CODE_DEVICE_ADMIN = 102
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        securityManager = SecurityManager(this)
        devicePolicyManager = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        adminComponent = ComponentName(this, AegisDeviceAdminReceiver::class.java)

        setupUI()
        checkInitialConfiguration()
    }

    override fun onResume() {
        super.onResume()
        updateDashboardState()
    }

    private fun checkInitialConfiguration() {
        if (!securityManager.isConfigured()) {
            showSetupPasswordDialog()
        }
    }

    private fun setupUI() {
        findViewById<Button>(R.id.btnEnableAdmin).setOnClickListener {
            enableDeviceAdmin()
        }

        findViewById<Button>(R.id.btnEnableAccessibility).setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        findViewById<Button>(R.id.btnEnableVpn).setOnClickListener {
            startVpnProtection()
        }

        findViewById<Button>(R.id.btnChangePassword).setOnClickListener {
            showChangePasswordDialog()
        }

        findViewById<Button>(R.id.btnDeactivateShield).setOnClickListener {
            showDeactivateChallenge()
        }
    }

    private fun updateDashboardState() {
        val textStatus = findViewById<TextView>(R.id.textProtectionStatus)
        val textBlockedCount = findViewById<TextView>(R.id.textBlockedCount)
        val btnAdmin = findViewById<Button>(R.id.btnEnableAdmin)
        val btnVpn = findViewById<Button>(R.id.btnEnableVpn)

        val isAdminActive = devicePolicyManager.isAdminActive(adminComponent)
        val isProtected = securityManager.isProtectionEnabled()

        if (isProtected && isAdminActive) {
            textStatus.text = "PROTECTION ARMED & SECURE"
            textStatus.setTextColor(getColor(R.color.colorSuccess))
        } else {
            textStatus.text = "SETUP INCOMPLETE"
            textStatus.setTextColor(getColor(R.color.colorWarning))
        }

        textBlockedCount.text = securityManager.getTotalBlockedCount().toString()

        btnAdmin.text = if (isAdminActive) "Anti-Uninstall: LOCKED" else "Enable Anti-Uninstall Admin"
        btnAdmin.isEnabled = !isAdminActive
    }

    private fun enableDeviceAdmin() {
        val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
            putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent)
            putExtra(
                DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "AegisShield requires Device Administrator permission to prevent unauthorized uninstallation and bypass."
            )
        }
        startActivityForResult(intent, REQUEST_CODE_DEVICE_ADMIN)
    }

    private fun startVpnProtection() {
        val vpnIntent = VpnService.prepare(this)
        if (vpnIntent != null) {
            startActivityForResult(vpnIntent, REQUEST_CODE_VPN)
        } else {
            onActivityResult(REQUEST_CODE_VPN, RESULT_OK, null)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_VPN && resultCode == RESULT_OK) {
            val serviceIntent = Intent(this, AegisVpnService::class.java).apply {
                action = AegisVpnService.ACTION_START
            }
            startService(serviceIntent)
            Toast.makeText(this, "Family DNS Protection Active", Toast.LENGTH_SHORT).show()
        }
        updateDashboardState()
    }

    private fun generateRandomSecurePassword(length: Int = 32): String {
        val chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+"
        val random = java.security.SecureRandom()
        val sb = java.lang.StringBuilder(length)
        for (i in 0 until length) {
            sb.append(chars[random.nextInt(chars.length)])
        }
        return sb.toString()
    }

    private fun showSetupPasswordDialog() {
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_setup_password, null)
        val editPass = view.findViewById<EditText>(R.id.editSetupPassword)
        val editConfirm = view.findViewById<EditText>(R.id.editSetupConfirmPassword)
        val btnMagic = view.findViewById<Button>(R.id.btnMagicSetupPassword)

        val dialog = AlertDialog.Builder(this)
            .setView(view)
            .setCancelable(false)
            .setPositiveButton("Set Master Password", null)
            .create()

        btnMagic?.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("✨ Permanent Magic Lockdown")
                .setMessage("⚠️ This will generate an unmemorizable 32-character key as your Master Password.\n\nYou will NEVER be able to recall it, turn off protection, or uninstall AegisShield. Only a full phone factory reset can remove it.\n\nAre you sure you want to permanently lock this phone?")
                .setPositiveButton("Yes, Lock Permanently") { _, _ ->
                    val randomKey = generateRandomSecurePassword()
                    securityManager.setupMasterPassword(randomKey)
                    Toast.makeText(this, "✨ Permanent Magic Lock Active! Phone Secured.", Toast.LENGTH_LONG).show()
                    dialog.dismiss()
                    updateDashboardState()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        dialog.setOnShowListener {
            val button = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            button.setOnClickListener {
                val p1 = editPass.text.toString().trim()
                val p2 = editConfirm.text.toString().trim()

                if (p1.length < 6) {
                    Toast.makeText(this, "Password must be at least 6 characters.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (p1 != p2) {
                    Toast.makeText(this, "Passwords do not match.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                securityManager.setupMasterPassword(p1)
                Toast.makeText(this, "Master Password Armed Successfully!", Toast.LENGTH_LONG).show()
                dialog.dismiss()
                updateDashboardState()
            }
        }
        dialog.show()
    }

    private fun showChangePasswordDialog() {
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_change_password, null)
        val editOld = view.findViewById<EditText>(R.id.editOldPassword)
        val editNew = view.findViewById<EditText>(R.id.editNewPassword)
        val editConfirm = view.findViewById<EditText>(R.id.editConfirmPassword)
        val btnMagic = view.findViewById<Button>(R.id.btnMagicChangePassword)

        val dialog = AlertDialog.Builder(this)
            .setView(view)
            .setTitle("Change Master Password")
            .setPositiveButton("Update", null)
            .setNegativeButton("Cancel", null)
            .create()

        btnMagic?.setOnClickListener {
            val oldP = editOld.text.toString().trim()
            if (!securityManager.verifyPassword(oldP)) {
                Toast.makeText(this, "Enter current Master Password first!", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            AlertDialog.Builder(this)
                .setTitle("✨ Permanent Magic Lockdown")
                .setMessage("⚠️ This will replace your password with an unmemorizable random 32-character key.\n\nYou will permanently lock yourself out of changing settings or uninstalling this app.\n\nDo you want to proceed?")
                .setPositiveButton("Yes, Lock Permanently") { _, _ ->
                    val randomKey = generateRandomSecurePassword()
                    securityManager.changePassword(oldP, randomKey)
                    Toast.makeText(this, "✨ Magic Lock Activated! Password randomized.", Toast.LENGTH_LONG).show()
                    dialog.dismiss()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        dialog.setOnShowListener {
            val button = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            button.setOnClickListener {
                val oldP = editOld.text.toString().trim()
                val newP = editNew.text.toString().trim()
                val confirmP = editConfirm.text.toString().trim()

                if (!securityManager.verifyPassword(oldP)) {
                    Toast.makeText(this, "Current password does not match!", Toast.LENGTH_LONG).show()
                    return@setOnClickListener
                }
                if (newP.length < 6) {
                    Toast.makeText(this, "New password must be at least 6 characters.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (newP != confirmP) {
                    Toast.makeText(this, "New passwords do not match.", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                securityManager.changePassword(oldP, newP)
                Toast.makeText(this, "Master Password Changed Successfully!", Toast.LENGTH_LONG).show()
                dialog.dismiss()
            }
        }
        dialog.show()
    }

    private fun showDeactivateChallenge() {
        val input = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            hint = "Enter Master Password"
        }

        AlertDialog.Builder(this)
            .setTitle("Authorize Deactivation")
            .setMessage("Without Master Password, AegisShield cannot be disabled or uninstalled.")
            .setView(input)
            .setPositiveButton("Authorize") { _, _ ->
                val pwd = input.text.toString().trim()
                if (securityManager.verifyPassword(pwd)) {
                    // Password correct: Allow deactivation
                    if (devicePolicyManager.isAdminActive(adminComponent)) {
                        devicePolicyManager.removeActiveAdmin(adminComponent)
                    }
                    val stopVpnIntent = Intent(this, AegisVpnService::class.java).apply {
                        action = AegisVpnService.ACTION_STOP
                    }
                    startService(stopVpnIntent)
                    securityManager.setProtectionEnabled(false)
                    Toast.makeText(this, "Protection Deactivated.", Toast.LENGTH_LONG).show()
                    updateDashboardState()
                } else {
                    Toast.makeText(this, "Incorrect Password! Access Denied.", Toast.LENGTH_LONG).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
