package com.simats.aero_navigator.data.repository

import com.simats.aero_navigator.data.local.AuthPreferences
import com.simats.aero_navigator.data.remote.ActivityApiService
import com.simats.aero_navigator.data.remote.ActivityLogDto
import com.simats.aero_navigator.data.remote.ActivityLogRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import javax.inject.Inject

class ActivityRepository @Inject constructor(
    private val api: ActivityApiService,
    private val authPreferences: AuthPreferences
) {
    private fun getToken(): String {
        return "Bearer ${authPreferences.getToken() ?: ""}"
    }

    fun logActivity(actionType: String, details: String? = null): Flow<Result<String>> = flow {
        try {
            val response = api.logActivity(getToken(), ActivityLogRequest(actionType, details))
            if (response.isSuccessful && response.body() != null) {
                emit(Result.success(response.body()!!.message))
            } else {
                emit(Result.failure(Exception("Failed to log activity")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getMyActivity(): Flow<Result<List<ActivityLogDto>>> = flow {
        try {
            val response = api.getMyActivity(getToken())
            if (response.isSuccessful && response.body() != null) {
                emit(Result.success(response.body()!!))
            } else {
                emit(Result.failure(Exception("Failed to load activity")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }

    fun getAdminActivity(): Flow<Result<List<ActivityLogDto>>> = flow {
        try {
            val response = api.getAdminActivity(getToken())
            if (response.isSuccessful && response.body() != null) {
                emit(Result.success(response.body()!!))
            } else {
                emit(Result.failure(Exception("Failed to load admin activity")))
            }
        } catch (e: Exception) {
            emit(Result.failure(e))
        }
    }
}
