package com.simats.aero_navigator.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.ActivityLogDto
import com.simats.aero_navigator.data.repository.ActivityRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ActivityViewModel @Inject constructor(
    private val repository: ActivityRepository
) : ViewModel() {

    private val _logs = MutableStateFlow<List<ActivityLogDto>>(emptyList())
    val logs: StateFlow<List<ActivityLogDto>> = _logs

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error

    fun loadMyActivity() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getMyActivity().collect { result ->
                result.fold(
                    onSuccess = {
                        _logs.value = it
                        _error.value = null
                    },
                    onFailure = {
                        _error.value = it.message
                    }
                )
                _isLoading.value = false
            }
        }
    }

    fun logAction(actionType: String, details: String? = null) {
        viewModelScope.launch {
            repository.logActivity(actionType, details).collect {} // fire and forget
        }
    }
}
