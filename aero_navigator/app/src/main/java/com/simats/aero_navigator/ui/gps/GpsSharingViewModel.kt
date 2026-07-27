package com.simats.aero_navigator.ui.gps

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.location.LocationManager
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.GpsApiService
import com.simats.aero_navigator.data.remote.GpsShareResponseDto
import com.simats.aero_navigator.data.remote.GpsStartRequestDto
import com.simats.aero_navigator.data.remote.GpsUpdateRequestDto
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class GpsSharingViewModel @Inject constructor(
    private val gpsApiService: GpsApiService
) : ViewModel() {

    private val _state = MutableStateFlow<String>("")
    val state: StateFlow<String> = _state

    private val _isSharing = MutableStateFlow(false)
    val isSharing: StateFlow<Boolean> = _isSharing

    private val _shareLink = MutableStateFlow("")
    val shareLink: StateFlow<String> = _shareLink

    private val _currentLocation = MutableStateFlow<Pair<Double, Double>?>(null)
    val currentLocation: StateFlow<Pair<Double, Double>?> = _currentLocation

    private var currentSessionId: String? = null
    private val userId = "user-${System.currentTimeMillis()}"

    @SuppressLint("MissingPermission")
    fun refreshLocation(context: Context) {
        viewModelScope.launch {
            try {
                val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                val location: Location? = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                if (location != null) {
                    _currentLocation.value = Pair(location.latitude, location.longitude)
                    // If already sharing, update server
                    currentSessionId?.let { sid ->
                        gpsApiService.updateLocation(
                            sid,
                            GpsUpdateRequestDto(location.latitude, location.longitude)
                        )
                    }
                }
            } catch (e: Exception) {
                // Location permission not granted or unavailable
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun startSharing(context: Context) {
        viewModelScope.launch {
            try {
                val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                val location: Location? = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                    ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)

                val lat = location?.latitude ?: 13.0827
                val lng = location?.longitude ?: 80.2707

                _currentLocation.value = Pair(lat, lng)

                val response: GpsShareResponseDto = gpsApiService.startSharing(
                    GpsStartRequestDto(
                        userId = userId,
                        latitude = lat,
                        longitude = lng,
                        sessionId = currentSessionId
                    )
                )
                currentSessionId = response.sessionId
                _shareLink.value = response.shareLink
                _isSharing.value = true

                // Start background location updates every 10 seconds
                startLocationUpdates(context)
            } catch (e: Exception) {
                _state.value = "Error: ${e.message}"
            }
        }
    }

    fun stopSharing(context: Context) {
        viewModelScope.launch {
            try {
                currentSessionId?.let {
                    gpsApiService.stopSharing(it)
                }
            } catch (e: Exception) { /* ignore */ }
            _isSharing.value = false
            _shareLink.value = ""
            currentSessionId = null
        }
        try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            locationListener?.let { lm.removeUpdates(it) }
            locationListener = null
        } catch (e: Exception) { /* ignore */ }
    }

    private var locationListener: android.location.LocationListener? = null

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates(context: Context) {
        try {
            val lm = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
            locationListener = object : android.location.LocationListener {
                override fun onLocationChanged(location: Location) {
                    _currentLocation.value = Pair(location.latitude, location.longitude)
                    currentSessionId?.let { sid ->
                        viewModelScope.launch {
                            try {
                                gpsApiService.updateLocation(
                                    sid,
                                    GpsUpdateRequestDto(location.latitude, location.longitude)
                                )
                            } catch (e: Exception) {}
                        }
                    }
                }
                override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }
            lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000L, 5f, locationListener!!)
            lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000L, 5f, locationListener!!)
        } catch (e: Exception) { /* ignore */ }
    }

    override fun onCleared() {
        super.onCleared()
        viewModelScope.launch {
            currentSessionId?.let {
                try { gpsApiService.stopSharing(it) } catch (e: Exception) { }
            }
        }
    }
}
