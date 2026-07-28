package com.simats.aero_navigator.data.repository

import com.simats.aero_navigator.data.remote.AiApiService
import com.simats.aero_navigator.data.remote.AiChatRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AiChatRepository @Inject constructor(
    private val api: AiApiService
) {
    fun sendPrompt(prompt: String, history: List<com.simats.aero_navigator.data.remote.AiChatMessageDto>): Flow<Result<String>> = flow {
        try {
            val response = api.getChatResponse(AiChatRequest(prompt, history))
            if (response.isSuccessful && response.body() != null) {
                emit(Result.success(response.body()!!.reply))
            } else {
                emit(Result.failure(Exception("Failed to get AI response")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
}
