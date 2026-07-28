package com.simats.aero_navigator.data.remote

data class ActivityLogDto(
    val id: Int,
    val user_id: String,
    val action_type: String,
    val details: String?,
    val created_at: String
)

data class ActivityLogRequest(
    val actionType: String,
    val details: String? = null
)

data class ActivityLogResponse(
    val message: String
)
