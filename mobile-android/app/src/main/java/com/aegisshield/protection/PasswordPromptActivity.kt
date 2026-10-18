package com.aegisshield.protection

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.aegisshield.protection.security.SecurityManager

class PasswordPromptActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_REASON = "extra_reason"
    }

    private lateinit var securityManager: SecurityManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.dialog_change_password)

        securityManager = SecurityManager(this)

        val title = findViewById<TextView>(R.id.dialogTitle)
        val subtitle = findViewById<TextView>(R.id.dialogSubtitle)
        val editOld = findViewById<EditText>(R.id.editOldPassword)
        val editNew = findViewById<EditText>(R.id.editNewPassword)
        val editConfirm = findViewById<EditText>(R.id.editConfirmPassword)
        val btnSubmit = findViewById<Button>(R.id.btnSubmitPassword)

        title.text = "Master Password Verification"
        subtitle.text = "Protected Action: Enter Master Password to authorize."

        // In authentication mode, only old/master password is required
        editNew.visibility = android.view.View.GONE
        editConfirm.visibility = android.view.View.GONE
        findViewById<android.view.View>(R.id.textMagicDivider)?.visibility = android.view.View.GONE
        findViewById<android.view.View>(R.id.btnMagicChangePassword)?.visibility = android.view.View.GONE
        editOld.hint = "Enter Master Password"

        btnSubmit.text = "Authorize Action"
        btnSubmit.setOnClickListener {
            val entered = editOld.text.toString().trim()
            if (securityManager.verifyPassword(entered)) {
                Toast.makeText(this, "Master Password Authorized", Toast.LENGTH_SHORT).show()
                setResult(RESULT_OK)
                finish()
            } else {
                Toast.makeText(this, "Incorrect Password! Access Prohibited.", Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onBackPressed() {
        // Prevent bypassing authentication
        super.onBackPressed()
        setResult(RESULT_CANCELED)
        finish()
    }
}
