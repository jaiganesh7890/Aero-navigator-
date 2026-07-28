package com.simats.aero_navigator.data.remote

data class AiChatMessageDto(
    val text: String,
    val isUser: Boolean
)

data class AiChatRequest(
    val prompt: String,
    val history: List<AiChatMessageDto> = emptyList()
)

data class AiChatResponse(
    val reply: String
)
