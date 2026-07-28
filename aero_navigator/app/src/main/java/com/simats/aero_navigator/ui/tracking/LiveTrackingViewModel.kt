package com.simats.aero_navigator.ui.tracking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.FlightDto
import com.simats.aero_navigator.data.remote.LocationDto
import com.simats.aero_navigator.data.repository.FlightRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import javax.inject.Inject

@HiltViewModel
class LiveTrackingViewModel @Inject constructor(
    private val repository: FlightRepository
) : ViewModel() {

    private val _flightDetails = MutableStateFlow<FlightDto?>(null)
    val flightDetails: StateFlow<FlightDto?> = _flightDetails

    private val _liveLocation = MutableStateFlow<LocationDto?>(null)
    val liveLocation: StateFlow<LocationDto?> = _liveLocation

    private var socket: Socket? = null

    fun initTracking(flightId: String) {
        // Fetch initial details
        viewModelScope.launch {
            repository.getLiveFlight(flightId).collect { result ->
                result.onSuccess { flight ->
                    _flightDetails.value = flight
                    _liveLocation.value = flight.liveLocation
                }
            }
        }

        // Setup Socket.io
        try {
            socket = IO.socket(com.simats.aero_navigator.BuildConfig.BASE_URL_BACKEND)
            socket?.connect()
            
            socket?.on(Socket.EVENT_CONNECT) {
                socket?.emit("joinFlightTracker", flightId)
            }

            socket?.on("liveFlightUpdate") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as JSONObject
                    val loc = LocationDto(
                        latitude = data.optDouble("latitude"),
                        longitude = data.optDouble("longitude"),
                        altitude = data.optDouble("altitude"),
                        heading = data.optDouble("heading"),
                        speed = data.optDouble("speed")
                    )
                    viewModelScope.launch(Dispatchers.Main) {
                        _liveLocation.value = loc
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onCleared() {
        super.onCleared()
        socket?.disconnect()
    }
}
