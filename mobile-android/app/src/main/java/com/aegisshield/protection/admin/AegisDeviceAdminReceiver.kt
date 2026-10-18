package com.aegisshield.protection.admin

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.widget.Toast
import com.aegisshield.protection.PasswordPromptActivity

class AegisDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Toast.makeText(context, "AegisShield Anti-Uninstall Protection Activated!", Toast.LENGTH_LONG).show()
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        // Intercept deactivation attempt!
        val promptIntent = Intent(context, PasswordPromptActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(PasswordPromptActivity.EXTRA_REASON, "DEVICE_ADMIN_DEACTIVATE")
        }
        context.startActivity(promptIntent)

        return "CRITICAL WARNING: AegisShield protection is active! Master Password is required to deactivate or uninstall this application."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Toast.makeText(context, "AegisShield Protection Disabled.", Toast.LENGTH_SHORT).show()
    }
}
