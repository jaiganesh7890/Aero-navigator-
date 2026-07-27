package com.simats.aero_navigator.ui.optimizer

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.OptimizeResponseDto
import com.simats.aero_navigator.data.remote.PredictionApiService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class OptimizerState {
    object Idle    : OptimizerState()
    object Loading : OptimizerState()
    data class Success(val data: OptimizeResponseDto) : OptimizerState()
    data class Error(val message: String) : OptimizerState()
}

@HiltViewModel
class RouteOptimizerViewModel @Inject constructor(
    private val predictionApiService: PredictionApiService
) : ViewModel() {

    private val _state = MutableStateFlow<OptimizerState>(OptimizerState.Idle)
    val state: StateFlow<OptimizerState> = _state

    fun loadRoutes(source: String, destination: String, date: String) {
        viewModelScope.launch {
            _state.value = OptimizerState.Loading
            try {
                val response = predictionApiService.getOptimizedRoutes(source, destination, date)
                _state.value = OptimizerState.Success(response)
            } catch (e: Exception) {
                _state.value = OptimizerState.Error(e.message ?: "Failed to load routes")
            }
        }
    }
}
