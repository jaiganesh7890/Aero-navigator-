package com.simats.aero_navigator.data.repository

import com.simats.aero_navigator.data.remote.PredictionApiService
import com.simats.aero_navigator.data.remote.PredictionResponseDto
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class PredictionRepository @Inject constructor(
    private val api: PredictionApiService
) {
    fun getFarePrediction(source: String, destination: String, date: String): Flow<Result<PredictionResponseDto>> = flow {
        try {
            val response = api.getFarePrediction(source, destination, date)
            emit(Result.success(response))
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
}
