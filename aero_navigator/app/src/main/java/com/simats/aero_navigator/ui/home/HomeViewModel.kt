package com.simats.aero_navigator.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.FlightDto
import com.simats.aero_navigator.data.remote.PredictionResponseDto
import com.simats.aero_navigator.data.repository.FlightRepository
import com.simats.aero_navigator.data.repository.PredictionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class FlightSearchState {
    object Idle : FlightSearchState()
    object Loading : FlightSearchState()
    data class Success(val flights: List<FlightDto>) : FlightSearchState()
    data class Error(val message: String) : FlightSearchState()
}

sealed class DashboardState {
    object Loading : DashboardState()
    data class Success(
        val liveFlight: FlightDto?,
        val insight: PredictionResponseDto?
    ) : DashboardState()
    data class Error(val message: String) : DashboardState()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val flightRepository: FlightRepository,
    private val predictionRepository: PredictionRepository
) : ViewModel() {

    private val _dashboardState = MutableStateFlow<DashboardState>(DashboardState.Loading)
    val dashboardState: StateFlow<DashboardState> = _dashboardState

    private val _searchState = MutableStateFlow<FlightSearchState>(FlightSearchState.Idle)
    val searchState: StateFlow<FlightSearchState> = _searchState

    private var allFlightsCache: List<FlightDto> = emptyList()

    init {
        loadDashboardData()
    }

    fun searchFlights(source: String, destination: String, date: String) {
        viewModelScope.launch {
            _searchState.value = FlightSearchState.Loading
            flightRepository.searchFlights(source, destination, date).collect { result ->
                result.fold(
                    onSuccess = { flights ->
                        _searchState.value = FlightSearchState.Success(flights)
                    },
                    onFailure = { error ->
                        _searchState.value = FlightSearchState.Error(error.message ?: "Unknown error")
                    }
                )
            }
        }
    }

    fun trackSpecificFlightById(flightId: String) {
        val flight = allFlightsCache.find { it._id == flightId }
        val currentInsight = (dashboardState.value as? DashboardState.Success)?.insight
        if (flight != null) {
            _dashboardState.value = DashboardState.Success(liveFlight = flight, insight = currentInsight)
        }
    }

    fun loadDashboardData() {
        viewModelScope.launch {
            _dashboardState.value = DashboardState.Loading
            try {
                var randomFlight: FlightDto? = null
                var insight: PredictionResponseDto? = null

                // Preload all flights to allow local tracking search
                flightRepository.getAllFlights().collect { res ->
                    res.onSuccess { flights ->
                        allFlightsCache = flights
                    }
                }

                // 2. Fetch an AI insight based on a popular route (MAA -> DEL)
                predictionRepository.getFarePrediction("MAA", "DEL", "").collect { result ->
                    result.onSuccess { prediction ->
                        insight = prediction
                    }
                }

                _dashboardState.value = DashboardState.Success(liveFlight = randomFlight, insight = insight)

            } catch (e: Exception) {
                _dashboardState.value = DashboardState.Error(e.message ?: "Failed to load dashboard")
            }
        }
    }
}
