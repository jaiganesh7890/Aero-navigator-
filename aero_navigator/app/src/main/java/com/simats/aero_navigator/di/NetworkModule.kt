package com.simats.aero_navigator.di

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    private val BASE_URL_BACKEND = com.simats.aero_navigator.BuildConfig.BASE_URL_BACKEND
    private val BASE_URL_AI = com.simats.aero_navigator.BuildConfig.BASE_URL_AI

    @Provides
    @Singleton
    fun provideRetrofit(): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL_BACKEND)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideFlightApiService(retrofit: Retrofit): com.simats.aero_navigator.data.remote.FlightApiService {
        return retrofit.create(com.simats.aero_navigator.data.remote.FlightApiService::class.java)
    }

    @Provides
    @Singleton
    fun providePredictionApiService(retrofit: Retrofit): com.simats.aero_navigator.data.remote.PredictionApiService {
        return retrofit.create(com.simats.aero_navigator.data.remote.PredictionApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAuthApiService(retrofit: Retrofit): com.simats.aero_navigator.data.remote.AuthApiService {
        return retrofit.create(com.simats.aero_navigator.data.remote.AuthApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideBookingApiService(retrofit: Retrofit): com.simats.aero_navigator.data.remote.BookingApiService {
        return retrofit.create(com.simats.aero_navigator.data.remote.BookingApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideGpsApiService(retrofit: Retrofit): com.simats.aero_navigator.data.remote.GpsApiService {
        return retrofit.create(com.simats.aero_navigator.data.remote.GpsApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideActivityApiService(retrofit: Retrofit): com.simats.aero_navigator.data.remote.ActivityApiService {
        return retrofit.create(com.simats.aero_navigator.data.remote.ActivityApiService::class.java)
    }

    @Provides
    @Singleton
    fun provideAiApiService(): com.simats.aero_navigator.data.remote.AiApiService {
        val retrofitAi = Retrofit.Builder()
            .baseUrl(BASE_URL_AI)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        return retrofitAi.create(com.simats.aero_navigator.data.remote.AiApiService::class.java)
    }
}
