package com.simats.aero_navigator.data.remote

import retrofit2.http.GET
import retrofit2.http.Query

// ── Prediction ─────────────────────────────────────────────────────────────────

data class PredictionResponseDto(
    val source: String,
    val destination: String,
    val date: String,
    val prediction: PredictionDataDto,
    val history: List<PriceDayDto>? = null,
    val forecast: List<PriceDayDto>? = null,
    val priceFactors: PriceFactorsDto? = null,
    val cheapestRouteSummary: CheapestRouteSummaryDto? = null
)

data class PredictionDataDto(
    val low: Double,
    val medium: Double,
    val high: Double,
    val confidence: Int,
    val recommendation: String,
    val predictedDropPercent: Int? = null,
    val bestBookingWindow: String? = null,
    val priceTrend: String? = null
)

data class PriceDayDto(
    val date: String,
    val price: Double
)

data class PriceFactorsDto(
    val demand: String,
    val competition: String,
    val seasonality: String
)

/** Cheapest route insight included in every fare-prediction response */
data class CheapestRouteSummaryDto(
    val direct: Int? = null,
    val viaHub: Int? = null,
    val bestHub: String? = null,
    val bestHubCity: String? = null,
    val savings: Int = 0,
    val recommendation: String = ""
)

// ── Route Optimizer ────────────────────────────────────────────────────────────

/** A single flight leg inside a RouteOptionDto */
data class RouteLegDto(
    val _id: String,
    val flightNumber: String,
    val airline: String,
    val airlineLogo: String? = null,
    val departure: AirportTimeDto,
    val arrival: AirportTimeDto,
    val durationMinutes: Int? = null,
    val price: Double,
    val status: String,
    val liveLocation: LocationDto? = null
)

/**
 * One route option — may be a direct single-leg flight or a 1-stop multi-leg journey.
 */
data class RouteOptionDto(
    val id: String,
    val type: String,           // "direct" | "connecting"
    val via: String? = null,    // hub IATA code, e.g. "DXB"
    val viaCity: String? = null,// hub city name, e.g. "Dubai"
    val totalPrice: Double,
    val totalDurationMinutes: Int,
    val stops: Int,
    val layoverMinutes: Int = 0,
    val legs: List<RouteLegDto>,
    val tags: List<String>,
    val savings: Double,
    val score: Int              // 0-100, higher = better overall
)

data class OptimizeResponseDto(
    val routes: List<RouteOptionDto>,
    val bestRoute: String?,
    val cheapestPrice: Double,
    val cheapestRoute: String?,
    val fastestRoute: String?
)

// ── Legacy single-leg DTO kept for backward compat ────────────────────────────

data class OptimizedRouteDto(
    val _id: String,
    val flightNumber: String,
    val airline: String,
    val price: Double,
    val status: String,
    val departure: AirportTimeDto,
    val arrival: AirportTimeDto,
    val durationMinutes: Int?,
    val tags: List<String>,
    val savings: Double,
    val liveLocation: LocationDto? = null
)

// ── GPS ───────────────────────────────────────────────────────────────────────

data class GpsShareResponseDto(
    val sessionId: String,
    val userId: String,
    val latitude: Double,
    val longitude: Double,
    val active: Boolean,
    val shareLink: String,
    val updatedAt: String
)

// ── Retrofit interface ────────────────────────────────────────────────────────

interface PredictionApiService {
    @GET("prediction/fare")
    suspend fun getFarePrediction(
        @Query("source") source: String,
        @Query("destination") destination: String,
        @Query("date") date: String
    ): PredictionResponseDto

    @GET("prediction/optimize")
    suspend fun getOptimizedRoutes(
        @Query("source") source: String,
        @Query("destination") destination: String,
        @Query("date") date: String? = null
    ): OptimizeResponseDto
}
