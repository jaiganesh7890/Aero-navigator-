package com.simats.aero_navigator.ui.profile

import android.content.Context
import androidx.core.content.edit
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AppSettingsPreferences @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs = context.getSharedPreferences("app_settings_prefs", Context.MODE_PRIVATE)

    // Account & Profile
    private val _homeAirport = MutableStateFlow(prefs.getString("home_airport", "") ?: "")
    val homeAirport: StateFlow<String> = _homeAirport

    // AI & Price Prediction
    private val _aiSensitivity = MutableStateFlow(prefs.getString("ai_sensitivity", "Conservative") ?: "Conservative")
    val aiSensitivity: StateFlow<String> = _aiSensitivity

    private val _autoTrackFavorablePrices = MutableStateFlow(prefs.getBoolean("auto_track_prices", false))
    val autoTrackFavorablePrices: StateFlow<Boolean> = _autoTrackFavorablePrices

    // Live Tracking & Display
    private val _distanceUnits = MutableStateFlow(prefs.getString("distance_units", "Kilometers") ?: "Kilometers")
    val distanceUnits: StateFlow<String> = _distanceUnits

    private val _defaultMapMode = MutableStateFlow(prefs.getString("default_map_mode", "Standard") ?: "Standard")
    val defaultMapMode: StateFlow<String> = _defaultMapMode

    private val _dataSaverMode = MutableStateFlow(prefs.getBoolean("data_saver_mode", false))
    val dataSaverMode: StateFlow<Boolean> = _dataSaverMode

    // Notifications
    private val _flightDelayAlerts = MutableStateFlow(prefs.getBoolean("flight_delay_alerts", true))
    val flightDelayAlerts: StateFlow<Boolean> = _flightDelayAlerts

    private val _gpsSharingAlerts = MutableStateFlow(prefs.getBoolean("gps_sharing_alerts", true))
    val gpsSharingAlerts: StateFlow<Boolean> = _gpsSharingAlerts

    // System, Sync & Localization
    private val _syncFrequency = MutableStateFlow(prefs.getString("sync_frequency", "Real-time") ?: "Real-time")
    val syncFrequency: StateFlow<String> = _syncFrequency

    fun updateHomeAirport(airport: String) {
        prefs.edit { putString("home_airport", airport) }
        _homeAirport.value = airport
    }

    fun updateAiSensitivity(sensitivity: String) {
        prefs.edit { putString("ai_sensitivity", sensitivity) }
        _aiSensitivity.value = sensitivity
    }

    fun toggleAutoTrackPrices(enabled: Boolean) {
        prefs.edit { putBoolean("auto_track_prices", enabled) }
        _autoTrackFavorablePrices.value = enabled
    }

    fun updateDistanceUnits(units: String) {
        prefs.edit { putString("distance_units", units) }
        _distanceUnits.value = units
    }

    fun updateDefaultMapMode(mode: String) {
        prefs.edit { putString("default_map_mode", mode) }
        _defaultMapMode.value = mode
    }

    fun toggleDataSaverMode(enabled: Boolean) {
        prefs.edit { putBoolean("data_saver_mode", enabled) }
        _dataSaverMode.value = enabled
    }

    fun toggleFlightDelayAlerts(enabled: Boolean) {
        prefs.edit { putBoolean("flight_delay_alerts", enabled) }
        _flightDelayAlerts.value = enabled
    }

    fun toggleGpsSharingAlerts(enabled: Boolean) {
        prefs.edit { putBoolean("gps_sharing_alerts", enabled) }
        _gpsSharingAlerts.value = enabled
    }

    fun updateSyncFrequency(frequency: String) {
        prefs.edit { putString("sync_frequency", frequency) }
        _syncFrequency.value = frequency
    }
}
