package com.aegisshield.protection.accessibility

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.aegisshield.protection.BlockedActivity
import com.aegisshield.protection.PasswordPromptActivity
import com.aegisshield.protection.filter.FilterEngine
import com.aegisshield.protection.security.SecurityManager

class AegisAccessibilityService : AccessibilityService() {

    private lateinit var filterEngine: FilterEngine
    private lateinit var securityManager: SecurityManager
    private var isPasswordVerifiedForSession = false

    override fun onCreate() {
        super.onCreate()
        filterEngine = FilterEngine(this)
        securityManager = SecurityManager(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null || !securityManager.isProtectionEnabled()) return

        val packageName = event.packageName?.toString() ?: return
        val rootNode = rootInActiveWindow ?: return

        // 1. Anti-Tamper Guard: Protect against Settings tampering / force-stop / uninstall
        if (packageName == "com.android.settings") {
            handleSettingsTamperCheck(rootNode)
            return
        }

        // Exempt system apps, banking, coding, and productivity tools from interception
        val exemptedPackages = listOf(
            "com.google.android.apps.nbu.paisa.user", // Google Pay
            "net.one97.paytm",                        // Paytm
            "in.org.npci.upiapp",                     // BHIM UPI
            "com.google.android.keep",                // Keep Notes
            "com.google.android.apps.docs",           // Google Docs / Sheets
            "com.github.android",                     // GitHub
            "com.google.android.dialer",              // Phone
            "com.google.android.apps.messaging",      // Messages
            "com.android.calculator2",                // Calculator
            "com.android.documentsui"                 // Files
        )
        if (exemptedPackages.any { packageName.startsWith(it) }) {
            return
        }

        // 2. Browser & App Content Inspection
        inspectNodeHierarchy(rootNode, packageName)
    }

    private fun handleSettingsTamperCheck(rootNode: AccessibilityNodeInfo) {
        if (isPasswordVerifiedForSession) return

        val allText = extractAllText(rootNode).lowercase()
        // If user is attempting to disable AegisShield in Accessibility or uninstall in App Info
        if (allText.contains("aegisshield") && 
            (allText.contains("uninstall") || allText.contains("force stop") || allText.contains("disable") || allText.contains("clear data") || allText.contains("off"))) {
            
            // Intercept and demand password!
            performGlobalAction(GLOBAL_ACTION_HOME)

            val promptIntent = Intent(this, PasswordPromptActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(PasswordPromptActivity.EXTRA_REASON, "SETTINGS_TAMPER_PROTECTION")
            }
            startActivity(promptIntent)
        }
    }

    private fun inspectNodeHierarchy(node: AccessibilityNodeInfo?, packageName: String) {
        if (node == null) return

        val text = node.text?.toString() ?: ""
        val contentDesc = node.contentDescription?.toString() ?: ""
        val combined = "$text $contentDesc"

        if (combined.isNotBlank()) {
            if (filterEngine.isContentExplicit(combined) || filterEngine.isDomainBlocked(combined)) {
                triggerBlockAction(combined, packageName)
                return
            }
        }

        // Inspect child nodes recursively
        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            inspectNodeHierarchy(child, packageName)
        }
    }

    private fun extractAllText(node: AccessibilityNodeInfo?): String {
        if (node == null) return ""
        val sb = StringBuilder()
        node.text?.let { sb.append(it).append(" ") }
        node.contentDescription?.let { sb.append(it).append(" ") }
        for (i in 0 until node.childCount) {
            sb.append(extractAllText(node.getChild(i))).append(" ")
        }
        return sb.toString()
    }

    private fun triggerBlockAction(triggerText: String, sourceApp: String) {
        securityManager.incrementBlockedCount()

        // 1. Instantly exit the app
        performGlobalAction(GLOBAL_ACTION_HOME)

        // 2. Launch full-screen Blocked Notification overlay
        val blockIntent = Intent(this, BlockedActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(BlockedActivity.EXTRA_TRIGGER, triggerText.take(50))
            putExtra(BlockedActivity.EXTRA_APP, sourceApp)
        }
        startActivity(blockIntent)
    }

    override fun onInterrupt() {}
}
