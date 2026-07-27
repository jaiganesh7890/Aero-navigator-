package com.simats.aero_navigator.worker

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.core.app.NotificationCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.simats.aero_navigator.MainActivity
import java.util.concurrent.TimeUnit
import kotlin.random.Random

object PriceAlertHelper {

    fun setAlert(context: Context, source: String, destination: String, targetPrice: Int) {
        val prefs = context.getSharedPreferences("aero_navigator_alerts", Context.MODE_PRIVATE)
        prefs.edit().putInt("alert_${source}_${destination}", targetPrice).apply()

        // Show a system Toast
        Toast.makeText(
            context,
            "Price Alert Registered for ₹$targetPrice! 🔔",
            Toast.LENGTH_LONG
        ).show()

        // Send an immediate notification so the user gets instant validation
        showImmediateConfirmation(context, source, destination, targetPrice)

        // Schedule periodic background checks
        scheduleBackgroundWorker(context)
    }

    private fun showImmediateConfirmation(
        context: Context,
        source: String,
        destination: String,
        targetPrice: Int
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            Random.nextInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(context, "price_alerts_channel")
            .setSmallIcon(android.R.drawable.ic_popup_reminder)
            .setContentTitle("Price Alert Activated! 🔔")
            .setContentText("We will notify you when fares from $source to $destination drop below ₹$targetPrice.")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(Random.nextInt(), builder.build())
    }

    private fun scheduleBackgroundWorker(context: Context) {
        val workRequest = PeriodicWorkRequestBuilder<PriceAlertWorker>(15, TimeUnit.MINUTES)
            .build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            "price_alerts_work",
            ExistingPeriodicWorkPolicy.KEEP,
            workRequest
        )
    }
}
