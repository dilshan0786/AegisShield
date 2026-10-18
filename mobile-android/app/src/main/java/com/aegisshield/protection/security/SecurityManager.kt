package com.aegisshield.protection.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Base64
import java.security.NoSuchAlgorithmException
import java.security.SecureRandom
import java.security.spec.InvalidKeySpecException
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec

class SecurityManager(context: Context) {

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREFS_NAME = "aegis_shield_secure_prefs"
        private const val KEY_HASH = "master_pwd_hash"
        private const val KEY_SALT = "master_pwd_salt"
        private const val KEY_INITIALIZED = "is_initialized"
        private const val KEY_PROTECTION_ENABLED = "protection_enabled"
        private const val KEY_SAFESEARCH_ENABLED = "safesearch_enabled"
        private const val KEY_WATCHDOG_ENABLED = "watchdog_enabled"
        private const val KEY_TOTAL_BLOCKED = "total_blocked_count"
        
        private const val ITERATIONS = 65536
        private const val KEY_LENGTH = 256
    }

    fun isConfigured(): Boolean {
        return prefs.getBoolean(KEY_INITIALIZED, false) && prefs.getString(KEY_HASH, null) != null
    }

    fun isProtectionEnabled(): Boolean {
        return prefs.getBoolean(KEY_PROTECTION_ENABLED, true)
    }

    fun setProtectionEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_PROTECTION_ENABLED, enabled).apply()
    }

    fun isSafeSearchEnabled(): Boolean {
        return prefs.getBoolean(KEY_SAFESEARCH_ENABLED, true)
    }

    fun isWatchdogEnabled(): Boolean {
        return prefs.getBoolean(KEY_WATCHDOG_ENABLED, true)
    }

    fun getTotalBlockedCount(): Int {
        return prefs.getInt(KEY_TOTAL_BLOCKED, 0)
    }

    fun incrementBlockedCount() {
        val current = getTotalBlockedCount()
        prefs.edit().putInt(KEY_TOTAL_BLOCKED, current + 1).apply()
    }

    fun setupMasterPassword(password: String): Boolean {
        if (password.length < 4) return false
        if (isConfigured()) return false

        val salt = generateSalt()
        val hash = hashPassword(password, salt)

        prefs.edit()
            .putString(KEY_SALT, Base64.encodeToString(salt, Base64.NO_WRAP))
            .putString(KEY_HASH, Base64.encodeToString(hash, Base64.NO_WRAP))
            .putBoolean(KEY_INITIALIZED, true)
            .putBoolean(KEY_PROTECTION_ENABLED, true)
            .apply()

        return true
    }

    fun verifyPassword(inputPassword: String): Boolean {
        if (!isConfigured()) return false
        val saltStr = prefs.getString(KEY_SALT, null) ?: return false
        val storedHashStr = prefs.getString(KEY_HASH, null) ?: return false

        val salt = Base64.decode(saltStr, Base64.NO_WRAP)
        val computedHash = hashPassword(inputPassword, salt)
        val computedHashStr = Base64.encodeToString(computedHash, Base64.NO_WRAP)

        return storedHashStr == computedHashStr
    }

    fun changePassword(oldPassword: String, newPassword: String): Boolean {
        if (!verifyPassword(oldPassword)) return false
        if (newPassword.length < 4) return false

        val newSalt = generateSalt()
        val newHash = hashPassword(newPassword, newSalt)

        prefs.edit()
            .putString(KEY_SALT, Base64.encodeToString(newSalt, Base64.NO_WRAP))
            .putString(KEY_HASH, Base64.encodeToString(newHash, Base64.NO_WRAP))
            .apply()

        return true
    }

    private fun generateSalt(): ByteArray {
        val random = SecureRandom()
        val salt = ByteArray(16)
        random.nextBytes(salt)
        return salt
    }

    private fun hashPassword(password: String, salt: ByteArray): ByteArray {
        val spec = PBEKeySpec(password.toCharArray(), salt, ITERATIONS, KEY_LENGTH)
        return try {
            val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            factory.generateSecret(spec).encoded
        } catch (e: Exception) {
            throw RuntimeException("Password hashing algorithm unavailable", e)
        }
    }
}
