package com.simats.aero_navigator.data.repository

import com.simats.aero_navigator.data.local.AuthPreferences
import com.simats.aero_navigator.data.remote.AuthApiService
import com.simats.aero_navigator.data.remote.AuthResponse
import com.simats.aero_navigator.data.remote.LoginRequest
import com.simats.aero_navigator.data.remote.SignupRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: AuthApiService,
    private val authPreferences: AuthPreferences
) {
    private var currentUser: AuthResponse? = null

    init {
        val token = authPreferences.getToken()
        val id = authPreferences.getUserId()
        val name = authPreferences.getUserName()
        val email = authPreferences.getUserEmail()
        val role = authPreferences.getUserRole()
        if (token != null && id != null && name != null && email != null && role != null) {
            currentUser = AuthResponse(id, name, email, role, token)
        }
    }

    fun login(email: String, password: String): Flow<Result<AuthResponse>> = flow {
        try {
            val response = api.login(LoginRequest(email, password))
            authPreferences.saveAuthData(
                response.token,
                response._id,
                response.name,
                response.email,
                response.role
            )
            currentUser = response
            emit(Result.success(response))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val message = try {
                org.json.JSONObject(errorBody ?: "").getString("message")
            } catch (ex: Exception) {
                e.message ?: "Authentication failed"
            }
            emit(Result.failure(Exception(message)))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun signup(name: String, email: String, password: String): Flow<Result<AuthResponse>> = flow {
        try {
            val response = api.signup(SignupRequest(name, email, password))
            authPreferences.saveAuthData(
                response.token,
                response._id,
                response.name,
                response.email,
                response.role
            )
            currentUser = response
            emit(Result.success(response))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val message = try {
                org.json.JSONObject(errorBody ?: "").getString("message")
            } catch (ex: Exception) {
                e.message ?: "Registration failed"
            }
            emit(Result.failure(Exception(message)))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun updateProfile(name: String, password: String?): Flow<Result<AuthResponse>> = flow {
        try {
            val request = com.simats.aero_navigator.data.remote.UpdateProfileRequest(name, password?.takeIf { it.isNotBlank() })
            val response = api.updateProfile(request)
            authPreferences.saveAuthData(
                response.token,
                response._id,
                response.name,
                response.email,
                response.role
            )
            currentUser = response
            emit(Result.success(response))
        } catch (e: retrofit2.HttpException) {
            val errorBody = e.response()?.errorBody()?.string()
            val message = try {
                org.json.JSONObject(errorBody ?: "").getString("message")
            } catch (ex: Exception) {
                e.message ?: "Profile update failed"
            }
            emit(Result.failure(Exception(message)))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getToken(): String? = authPreferences.getToken()

    fun getCurrentUser(): AuthResponse? = currentUser

    fun logout() {
        authPreferences.clearAuthData()
        currentUser = null
    }
}
