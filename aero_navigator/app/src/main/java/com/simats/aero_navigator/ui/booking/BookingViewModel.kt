package com.simats.aero_navigator.ui.booking

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.BookingDto
import com.simats.aero_navigator.data.remote.PassengerDto
import com.simats.aero_navigator.data.repository.BookingRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class BookingState {
    object Idle : BookingState()
    object Loading : BookingState()
    data class Success(val booking: BookingDto) : BookingState()
    data class Error(val message: String) : BookingState()
}

sealed class BookingHistoryState {
    object Idle : BookingHistoryState()
    object Loading : BookingHistoryState()
    data class Success(val bookings: List<BookingDto>) : BookingHistoryState()
    data class Error(val message: String) : BookingHistoryState()
}

@HiltViewModel
class BookingViewModel @Inject constructor(
    private val repository: BookingRepository
) : ViewModel() {

    private val _bookingState = MutableStateFlow<BookingState>(BookingState.Idle)
    val bookingState: StateFlow<BookingState> = _bookingState

    private val _historyState = MutableStateFlow<BookingHistoryState>(BookingHistoryState.Idle)
    val historyState: StateFlow<BookingHistoryState> = _historyState

    fun createBooking(flightId: String, passengers: List<PassengerDto>, totalPrice: Double) {
        viewModelScope.launch {
            _bookingState.value = BookingState.Loading
            repository.createBooking(flightId, passengers, totalPrice).collect { result ->
                result.fold(
                    onSuccess = { booking ->
                        _bookingState.value = BookingState.Success(booking)
                    },
                    onFailure = { error ->
                        _bookingState.value = BookingState.Error(error.message ?: "Booking transaction failed")
                    }
                )
            }
        }
    }

    fun fetchUserBookings() {
        viewModelScope.launch {
            _historyState.value = BookingHistoryState.Loading
            repository.getUserBookings().collect { result ->
                result.fold(
                    onSuccess = { list ->
                        _historyState.value = BookingHistoryState.Success(list)
                    },
                    onFailure = { error ->
                        _historyState.value = BookingHistoryState.Error(error.message ?: "Failed to retrieve tickets")
                    }
                )
            }
        }
    }

    fun clearState() {
        _bookingState.value = BookingState.Idle
    }
}
