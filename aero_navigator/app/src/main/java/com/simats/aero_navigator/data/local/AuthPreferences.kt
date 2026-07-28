package com.simats.aero_navigator.data.local

import android.content.Context
import androidx.core.content.edit
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val prefs = context.getSharedPreferences("aero_navigator_auth", Context.MODE_PRIVATE)

    fun saveAuthData(token: String, userId: String, name: String, email: String, role: String) {
        prefs.edit {
            putString("jwt_token", token)
            putString("user_id", userId)
            putString("user_name", name)
            putString("user_email", email)
            putString("user_role", role)
        }
    }

    fun getToken(): String? = prefs.getString("jwt_token", null)
    fun getUserId(): String? = prefs.getString("user_id", null)
    fun getUserName(): String? = prefs.getString("user_name", null)
    fun getUserEmail(): String? = prefs.getString("user_email", null)
    fun getUserRole(): String? = prefs.getString("user_role", null)

    fun clearAuthData() {
        prefs.edit {
            remove("jwt_token")
            remove("user_id")
            remove("user_name")
            remove("user_email")
            remove("user_role")
        }
    }
}
