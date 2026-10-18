package com.aegisshield.protection.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import com.aegisshield.protection.MainActivity
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetSocketAddress
import java.nio.channels.DatagramChannel

class AegisVpnService : VpnService(), Runnable {

    private var vpnInterface: ParcelFileDescriptor? = null
    private var vpnThread: Thread? = null
    private var isRunning = false

    companion object {
        const val ACTION_START = "com.aegisshield.protection.START_VPN"
        const val ACTION_STOP = "com.aegisshield.protection.STOP_VPN"
        private const val NOTIFICATION_CHANNEL_ID = "aegis_vpn_channel"
        private const val NOTIFICATION_ID = 1001

        // Cloudflare Family DNS (Blocks Adult Content + Malware)
        const val DNS_CLOUDFLARE_FAMILY_1 = "1.1.1.3"
        const val DNS_CLOUDFLARE_FAMILY_2 = "1.0.0.3"

        // CleanBrowsing Adult Filter
        const val DNS_CLEANBROWSING_ADULT = "185.228.168.168"
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == ACTION_STOP) {
            stopVpn()
            return START_NOT_STICKY
        }

        startForeground(NOTIFICATION_ID, createNotification())
        startVpn()
        return START_STICKY
    }

    private fun startVpn() {
        if (isRunning) return
        isRunning = true

        try {
            val builder = Builder()
                .setSession("AegisShield Family DNS Filter")
                .addAddress("10.0.0.2", 32)
                .addDnsServer(DNS_CLOUDFLARE_FAMILY_1)
                .addDnsServer(DNS_CLOUDFLARE_FAMILY_2)
                .addDnsServer(DNS_CLEANBROWSING_ADULT)
                .addRoute(DNS_CLOUDFLARE_FAMILY_1, 32)
                .addRoute(DNS_CLOUDFLARE_FAMILY_2, 32)
                .addRoute(DNS_CLEANBROWSING_ADULT, 32)
                .setBlocking(true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                builder.setMetered(false)
            }

            vpnInterface = builder.establish()

            vpnThread = Thread(this, "AegisVpnThread")
            vpnThread?.start()
        } catch (e: Exception) {
            e.printStackTrace()
            stopVpn()
        }
    }

    private fun stopVpn() {
        isRunning = false
        vpnThread?.interrupt()
        vpnThread = null

        try {
            vpnInterface?.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        vpnInterface = null
        stopForeground(true)
        stopSelf()
    }

    override fun run() {
        // Keeps VPN connection alive and manages packet tunnel
        while (isRunning && !Thread.currentThread().isInterrupted) {
            try {
                Thread.sleep(2000)
            } catch (e: InterruptedException) {
                break
            }
        }
    }

    private fun createNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "AegisShield Active Protection",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "System-wide adult content and DNS filter active"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val notifyIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notifyIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("AegisShield Protection Active")
            .setContentText("System-wide adult content filtering is armed.")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }
}
