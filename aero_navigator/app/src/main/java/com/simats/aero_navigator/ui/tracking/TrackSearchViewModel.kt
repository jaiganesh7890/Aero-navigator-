package com.simats.aero_navigator.ui.tracking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.FlightDto
import com.simats.aero_navigator.data.repository.FlightRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import javax.inject.Inject

import com.simats.aero_navigator.data.repository.ActivityRepository
import com.simats.aero_navigator.ui.profile.AppSettingsPreferences

@HiltViewModel
class TrackSearchViewModel @Inject constructor(
    private val repository: FlightRepository,
    private val appSettingsPreferences: AppSettingsPreferences,
    private val activityRepository: ActivityRepository
) : ViewModel() {

    private val _allFlights = MutableStateFlow<List<FlightDto>>(emptyList())
    private val _query     = MutableStateFlow("")
    private val _sourceQuery = MutableStateFlow("")
    private val _destQuery = MutableStateFlow("")
    private val _searchMode = MutableStateFlow(0) // 0 = Flight No, 1 = Route
    private val _isLoading = MutableStateFlow(true)
    private val _error     = MutableStateFlow<String?>(null)

    val query:     StateFlow<String>  = _query
    val sourceQuery: StateFlow<String> = _sourceQuery
    val destQuery: StateFlow<String> = _destQuery
    val searchMode: StateFlow<Int> = _searchMode
    val isLoading: StateFlow<Boolean> = _isLoading
    val error:     StateFlow<String?> = _error

    /** Flights that match the current search query or direct route + connecting route legs */
    val filteredFlights: StateFlow<List<FlightDto>> = MutableStateFlow<List<FlightDto>>(emptyList()).also { result ->
        viewModelScope.launch {
            combine(_allFlights, _sourceQuery, _destQuery, _searchMode, appSettingsPreferences.homeAirport) { flights, src, dest, mode, home ->
                if (src.isBlank() && dest.isBlank()) {
                    if (home.isNotBlank()) {
                        val homeFlights = flights.filter { it.departure.airportCode.equals(home, ignoreCase = true) }
                        if (homeFlights.isNotEmpty()) return@combine homeFlights
                    }
                    // Fallback to discoverable popular flights
                    return@combine flights.shuffled().take(10)
                }
                
                val directFlights = flights.filter { f ->
                    val matchSrc = src.isBlank() || 
                                   f.departure.airportCode.contains(src, ignoreCase = true) ||
                                   (f.departure.city?.contains(src, ignoreCase = true) == true) ||
                                   (f.departure.airportName?.contains(src, ignoreCase = true) == true)
                    
                    val matchDest = dest.isBlank() || 
                                    f.arrival.airportCode.contains(dest, ignoreCase = true) ||
                                    (f.arrival.city?.contains(dest, ignoreCase = true) == true) ||
                                    (f.arrival.airportName?.contains(dest, ignoreCase = true) == true)
                    
                    matchSrc && matchDest
                }

                val legs1 = flights.filter { f ->
                    f.departure.airportCode.contains(src, ignoreCase = true) ||
                    (f.departure.city?.contains(src, ignoreCase = true) == true) ||
                    (f.departure.airportName?.contains(src, ignoreCase = true) == true)
                }
                val legs2 = flights.filter { f ->
                    f.arrival.airportCode.contains(dest, ignoreCase = true) ||
                    (f.arrival.city?.contains(dest, ignoreCase = true) == true) ||
                    (f.arrival.airportName?.contains(dest, ignoreCase = true) == true)
                }

                val connectingLegs = mutableListOf<FlightDto>()
                for (f1 in legs1) {
                    for (f2 in legs2) {
                        if (f1.arrival.airportCode.equals(f2.departure.airportCode, ignoreCase = true)) {
                            if (f1._id != f2._id) {
                                // Found a valid 1-stop connection! Add both legs.
                                if (!connectingLegs.contains(f1)) connectingLegs.add(f1)
                                if (!connectingLegs.contains(f2)) connectingLegs.add(f2)
                            }
                        }
                    }
                }

                // Combine direct flights with connecting legs, removing duplicates
                (directFlights + connectingLegs).distinctBy { it._id }
            }.collect { result.value = it }
        }
    }

    /** Dynamically computes the cheapest 1-stop connecting flight route when direct routes don't exist */
    val cheapestConnecting: StateFlow<Pair<FlightDto, FlightDto>?> = MutableStateFlow<Pair<FlightDto, FlightDto>?>(null).also { result ->
        viewModelScope.launch {
            combine(_allFlights, _sourceQuery, _destQuery, _searchMode) { flights, src, dest, mode ->
                if (mode == 1 && src.isNotBlank() && dest.isNotBlank()) {
                    val legs1 = flights.filter { f ->
                        f.departure.airportCode.contains(src, ignoreCase = true) ||
                        (f.departure.city?.contains(src, ignoreCase = true) == true) ||
                        (f.departure.airportName?.contains(src, ignoreCase = true) == true)
                    }
                    val legs2 = flights.filter { f ->
                        f.arrival.airportCode.contains(dest, ignoreCase = true) ||
                        (f.arrival.city?.contains(dest, ignoreCase = true) == true) ||
                        (f.arrival.airportName?.contains(dest, ignoreCase = true) == true)
                    }

                    var bestPair: Pair<FlightDto, FlightDto>? = null
                    var minPrice = Double.MAX_VALUE

                    for (f1 in legs1) {
                        for (f2 in legs2) {
                            if (f1.arrival.airportCode.equals(f2.departure.airportCode, ignoreCase = true)) {
                                if (f1._id == f2._id) continue
                                val totalPrice = f1.price + f2.price
                                if (totalPrice < minPrice) {
                                    minPrice = totalPrice.toDouble()
                                    bestPair = Pair(f1, f2)
                                }
                            }
                        }
                    }
                    bestPair
                } else {
                    null
                }
            }.collect { result.value = it }
        }
    }

    init {
        loadAllFlights()
    }

    fun setQuery(q: String) {
        _query.value = q
    }

    fun setSourceQuery(q: String) {
        _sourceQuery.value = q
    }

    fun setDestQuery(q: String) {
        _destQuery.value = q
    }

    fun setSearchMode(mode: Int) {
        _searchMode.value = mode
    }

    private fun loadAllFlights() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getAllFlights().collect { res ->
                res.fold(
                    onSuccess = {
                        _allFlights.value = it
                        _error.value = null
                    },
                    onFailure = {
                        _error.value = it.message ?: "Failed to load flights"
                    }
                )
                _isLoading.value = false
            }
        }
    }

    fun searchRoute() {
        val src = _sourceQuery.value
        val dest = _destQuery.value
        if (src.isBlank() || dest.isBlank()) return

        viewModelScope.launch {
            // Fire and forget log activity
            launch { activityRepository.logActivity("SEARCH_ROUTE", "Searched from $src to $dest").collect {} }
            
            _isLoading.value = true
            repository.searchFlights(src, dest, "").collect { res ->
                res.fold(
                    onSuccess = { newFlights ->
                        val combined = (_allFlights.value + newFlights).distinctBy { it._id }
                        _allFlights.value = combined
                        _error.value = null
                    },
                    onFailure = {
                        _error.value = it.message ?: "Failed to search flights"
                    }
                )
                _isLoading.value = false
            }
        }
    }

    fun refresh() = loadAllFlights()
}
