package com.simats.aero_navigator.data.remote

import retrofit2.http.GET
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Body

data class FlightDto(
    val _id: String,
    val flightNumber: String,
    val airline: String,
    val price: Double,
    val status: String,
    val departure: AirportTimeDto,
    val arrival: AirportTimeDto,
    val durationMinutes: Int? = null,
    val liveLocation: LocationDto?
)

data class AirportTimeDto(
    val airportCode: String,
    val time: String,
    val gate: String?,
    val city: String? = null,
    val airportName: String? = null
)

data class LocationDto(
    val latitude: Double,
    val longitude: Double,
    val altitude: Double,
    val heading: Double,
    val speed: Double
)

interface FlightApiService {
    @GET("flights/search")
    suspend fun searchFlights(
        @Query("source") source: String,
        @Query("destination") destination: String,
        @Query("date") date: String
    ): List<FlightDto>

    /** Fetch all flights — used by the Track screen so the user can pick any flight */
    @GET("flights/search")
    suspend fun getAllFlights(): List<FlightDto>

    @GET("flights/live/{id}")
    suspend fun getLiveFlight(@Path("id") id: String): FlightDto
}
