package com.simats.aero_navigator.ui.profile

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.osmdroid.config.Configuration
import java.io.File
import javax.inject.Inject

@HiltViewModel
class AppSettingsViewModel @Inject constructor(
    private val appSettingsPreferences: AppSettingsPreferences
) : ViewModel() {

    val homeAirport: StateFlow<String> = appSettingsPreferences.homeAirport
    val aiSensitivity: StateFlow<String> = appSettingsPreferences.aiSensitivity
    val autoTrackFavorablePrices: StateFlow<Boolean> = appSettingsPreferences.autoTrackFavorablePrices
    val distanceUnits: StateFlow<String> = appSettingsPreferences.distanceUnits
    val defaultMapMode: StateFlow<String> = appSettingsPreferences.defaultMapMode
    val dataSaverMode: StateFlow<Boolean> = appSettingsPreferences.dataSaverMode
    val flightDelayAlerts: StateFlow<Boolean> = appSettingsPreferences.flightDelayAlerts
    val gpsSharingAlerts: StateFlow<Boolean> = appSettingsPreferences.gpsSharingAlerts
    val syncFrequency: StateFlow<String> = appSettingsPreferences.syncFrequency

    fun updateHomeAirport(airport: String) = appSettingsPreferences.updateHomeAirport(airport)
    fun updateAiSensitivity(sensitivity: String) = appSettingsPreferences.updateAiSensitivity(sensitivity)
    fun toggleAutoTrackPrices(enabled: Boolean) = appSettingsPreferences.toggleAutoTrackPrices(enabled)
    fun updateDistanceUnits(units: String) = appSettingsPreferences.updateDistanceUnits(units)
    fun updateDefaultMapMode(mode: String) = appSettingsPreferences.updateDefaultMapMode(mode)
    fun toggleDataSaverMode(enabled: Boolean) = appSettingsPreferences.toggleDataSaverMode(enabled)
    fun toggleFlightDelayAlerts(enabled: Boolean) = appSettingsPreferences.toggleFlightDelayAlerts(enabled)
    fun toggleGpsSharingAlerts(enabled: Boolean) = appSettingsPreferences.toggleGpsSharingAlerts(enabled)
    fun updateSyncFrequency(frequency: String) = appSettingsPreferences.updateSyncFrequency(frequency)

    fun clearMapCache(context: Context, onComplete: () -> Unit) {
        viewModelScope.launch {
            try {
                // Clear OSMDroid tile cache
                val osmdroidDir = Configuration.getInstance().osmdroidTileCache
                if (osmdroidDir.exists()) {
                    osmdroidDir.deleteRecursively()
                    osmdroidDir.mkdirs() // Recreate empty cache dir
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                onComplete()
            }
        }
    }
}
