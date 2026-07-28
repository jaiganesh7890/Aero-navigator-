package com.simats.aero_navigator.data.remote

import retrofit2.http.*

data class GpsStartRequestDto(
    val userId: String,
    val latitude: Double,
    val longitude: Double,
    val sessionId: String? = null
)

data class GpsUpdateRequestDto(
    val latitude: Double,
    val longitude: Double
)

interface GpsApiService {
    @POST("gps/share")
    suspend fun startSharing(@Body body: GpsStartRequestDto): GpsShareResponseDto

    @PUT("gps/share/{sessionId}")
    suspend fun updateLocation(
        @Path("sessionId") sessionId: String,
        @Body body: GpsUpdateRequestDto
    ): GpsShareResponseDto

    @DELETE("gps/share/{sessionId}")
    suspend fun stopSharing(@Path("sessionId") sessionId: String): Map<String, String>
}
