package com.simats.aero_navigator.data.repository

import com.simats.aero_navigator.data.remote.BookingApiService
import com.simats.aero_navigator.data.remote.BookingDto
import com.simats.aero_navigator.data.remote.CreateBookingRequest
import com.simats.aero_navigator.data.remote.PassengerDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class BookingRepository @Inject constructor(
    private val api: BookingApiService,
    private val authRepository: AuthRepository
) {
    fun createBooking(flightId: String, passengers: List<PassengerDto>, totalPrice: Double): Flow<Result<BookingDto>> = flow {
        try {
            val token = authRepository.getToken() ?: throw Exception("User is not authenticated")
            val bearerToken = "Bearer $token"
            val response = api.createBooking(
                bearerToken,
                CreateBookingRequest(flightId, passengers, totalPrice)
            )
            emit(Result.success(response))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getUserBookings(): Flow<Result<List<BookingDto>>> = flow {
        try {
            val token = authRepository.getToken() ?: throw Exception("User is not authenticated")
            val user = authRepository.getCurrentUser() ?: throw Exception("User profile not found")
            val bearerToken = "Bearer $token"
            val response = api.getUserBookings(bearerToken, user._id)
            emit(Result.success(response))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
}
