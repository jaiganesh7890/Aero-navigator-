package com.simats.aero_navigator.data.repository

import com.simats.aero_navigator.data.remote.FlightApiService
import com.simats.aero_navigator.data.remote.FlightDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class FlightRepository @Inject constructor(
    private val api: FlightApiService
) {
    fun searchFlights(source: String, destination: String, date: String): Flow<Result<List<FlightDto>>> = flow {
        try {
            val response = api.searchFlights(source, destination, date)
            emit(Result.success(response))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getAllFlights(): Flow<Result<List<FlightDto>>> = flow {
        try {
            val response = api.getAllFlights()
            emit(Result.success(response))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getLiveFlight(id: String): Flow<Result<FlightDto>> = flow {
        try {
            val response = api.getLiveFlight(id)
            emit(Result.success(response))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
}
