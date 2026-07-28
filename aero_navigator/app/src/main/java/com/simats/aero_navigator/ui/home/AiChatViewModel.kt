package com.simats.aero_navigator.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.repository.AiChatRepository
import com.simats.aero_navigator.data.repository.ActivityRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val text: String,
    val isUser: Boolean
)

@HiltViewModel
class AiChatViewModel @Inject constructor(
    private val repository: AiChatRepository,
    private val activityRepository: ActivityRepository
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessage>>(
        listOf(
            ChatMessage(text = "Hello! I'm your Aero Nav AI Assistant. You can ask me things like 'Give me flight details from Bangalore to London'.", isUser = false)
        )
    )
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun sendMessage(prompt: String) {
        if (prompt.isBlank()) return

        // Extract history before adding the new user message to the server
        val historyDto = _messages.value.map { 
            com.simats.aero_navigator.data.remote.AiChatMessageDto(text = it.text, isUser = it.isUser)
        }

        // Add user message to UI state immediately
        val userMsg = ChatMessage(text = prompt.trim(), isUser = true)
        _messages.value = _messages.value + userMsg
        _isLoading.value = true

        viewModelScope.launch {
            repository.sendPrompt(prompt, historyDto).collect { result ->
                _isLoading.value = false
                result.onSuccess { reply ->
                    _messages.value = _messages.value + ChatMessage(text = reply, isUser = false)
                    
                    // Log the activity
                    activityRepository.logActivity("AI_CHAT", "Asked AI: $prompt").collect {}
                }.onFailure {
                    _messages.value = _messages.value + ChatMessage(text = "Sorry, I couldn't reach the server.", isUser = false)
                }
            }
        }
    }
}
