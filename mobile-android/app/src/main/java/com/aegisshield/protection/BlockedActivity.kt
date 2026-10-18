package com.aegisshield.protection

import android.content.Context
import android.media.AudioManager
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class BlockedActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_TRIGGER = "extra_trigger"
        const val EXTRA_APP = "extra_app"
    }

    private var audioManager: AudioManager? = null
    private var didMuteAudio = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_blocked)

        val trigger = intent.getStringExtra(EXTRA_TRIGGER) ?: "Adult / Explicit Pattern"
        val app = intent.getStringExtra(EXTRA_APP) ?: "Media Player"

        // Auto-mute audio to protect from explicit moans/sounds
        try {
            audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            audioManager?.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_MUTE, 0)
            didMuteAudio = true
        } catch (e: Exception) {
            e.printStackTrace()
        }

        findViewById<TextView>(R.id.textTriggerReason).text = "Detected: $trigger"
        findViewById<TextView>(R.id.textSourceApp).text = "Application: $app"

        // Corner [✖ Remove Cover] button: restores normal video and un-mutes sound!
        findViewById<Button>(R.id.btnDismissCover)?.setOnClickListener {
            restoreAudioAndDismiss()
        }

        findViewById<Button>(R.id.btnReturnHome).setOnClickListener {
            restoreAudioAndDismiss()
            finishAffinity()
        }
    }

    private fun restoreAudioAndDismiss() {
        if (didMuteAudio) {
            try {
                audioManager?.adjustStreamVolume(AudioManager.STREAM_MUSIC, AudioManager.ADJUST_UNMUTE, 0)
                didMuteAudio = false
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        finish()
    }

    override fun onDestroy() {
        restoreAudioAndDismiss()
        super.onDestroy()
    }

    override fun onBackPressed() {
        restoreAudioAndDismiss()
        super.onBackPressed()
    }
}
