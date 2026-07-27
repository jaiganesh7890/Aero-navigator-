package com.simats.aero_navigator.ui.prediction

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.PredictionResponseDto
import com.simats.aero_navigator.data.repository.PredictionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class PredictionState {
    object Idle : PredictionState()
    object Loading : PredictionState()
    data class Success(val data: PredictionResponseDto) : PredictionState()
    data class Error(val message: String) : PredictionState()
}

@HiltViewModel
class PricePredictionViewModel @Inject constructor(
    private val repository: PredictionRepository
) : ViewModel() {

    private val _state = MutableStateFlow<PredictionState>(PredictionState.Idle)
    val state: StateFlow<PredictionState> = _state

    fun getPrediction(source: String, destination: String, date: String) {
        viewModelScope.launch {
            _state.value = PredictionState.Loading
            repository.getFarePrediction(source, destination, date).collect { result ->
                result.fold(
                    onSuccess = { _state.value = PredictionState.Success(it) },
                    onFailure = { _state.value = PredictionState.Error(it.message ?: "Unknown Error") }
                )
            }
        }
    }
}
