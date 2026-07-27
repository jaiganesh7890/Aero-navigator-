package com.simats.aero_navigator.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST

interface ActivityApiService {
    @POST("activity/log")
    suspend fun logActivity(
        @Header("Authorization") token: String,
        @Body request: ActivityLogRequest
    ): Response<ActivityLogResponse>

    @GET("activity/history")
    suspend fun getMyActivity(
        @Header("Authorization") token: String
    ): Response<List<ActivityLogDto>>

    @GET("activity/admin")
    suspend fun getAdminActivity(
        @Header("Authorization") token: String
    ): Response<List<ActivityLogDto>>
}
