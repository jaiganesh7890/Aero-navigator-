package com.simats.aero_navigator.data.remote

import retrofit2.http.Body
import retrofit2.http.POST

data class LoginRequest(
    val email: String,
    val password: String
)

data class SignupRequest(
    val name: String,
    val email: String,
    val password: String
)

data class AuthResponse(
    val _id: String,
    val name: String,
    val email: String,
    val role: String,
    val token: String
)

data class UpdateProfileRequest(
    val name: String,
    val password: String? = null
)

interface AuthApiService {
    @POST("auth/signup")
    suspend fun signup(@Body request: SignupRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @retrofit2.http.PUT("auth/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): AuthResponse
}
