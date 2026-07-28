package com.simats.aero_navigator.data.remote

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AiApiService {
    @POST("chat")
    suspend fun getChatResponse(
        @Body request: AiChatRequest
    ): Response<AiChatResponse>
}
