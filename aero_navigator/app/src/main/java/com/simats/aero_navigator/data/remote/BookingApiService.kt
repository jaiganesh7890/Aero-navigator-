package com.simats.aero_navigator.data.remote

import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

data class PassengerDto(
    val name: String,
    val age: Int,
    val seat: String
)

data class CreateBookingRequest(
    val flightId: String,
    val passengers: List<PassengerDto>,
    val totalPrice: Double
)

data class BookingDto(
    val _id: String,
    val user: String,
    val flight: FlightDto?,
    val passengers: List<PassengerDto>,
    val totalPrice: Double,
    val status: String,
    val bookingDate: String
)

interface BookingApiService {
    @POST("booking/create")
    suspend fun createBooking(
        @Header("Authorization") token: String,
        @Body request: CreateBookingRequest
    ): BookingDto

    @GET("booking/user/{userId}")
    suspend fun getUserBookings(
        @Header("Authorization") token: String,
        @Path("userId") userId: String
    ): List<BookingDto>
}
