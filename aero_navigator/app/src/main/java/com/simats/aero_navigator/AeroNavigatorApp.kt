package com.simats.aero_navigator

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build

@HiltAndroidApp
class AeroNavigatorApp : Application() {
    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Price Alerts"
            val descriptionText = "Notifications for flight price drops"
            val importance = NotificationManager.IMPORTANCE_DEFAULT
            val channel = NotificationChannel("price_alerts_channel", name, importance).apply {
                description = descriptionText
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
}
