package com.simats.aero_navigator.worker

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.simats.aero_navigator.MainActivity
import com.simats.aero_navigator.data.remote.PredictionApiService
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import kotlin.random.Random

class PriceAlertWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val apiService: PredictionApiService by lazy {
        Retrofit.Builder()
            .baseUrl("http://192.168.29.98:5000/")
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(PredictionApiService::class.java)
    }

    override suspend fun doWork(): Result {
        val prefs = context.getSharedPreferences("aero_navigator_alerts", Context.MODE_PRIVATE)
        val allAlerts = prefs.all

        for ((key, value) in allAlerts) {
            if (key.startsWith("alert_") && value is Int) {
                try {
                    val parts = key.split("_")
                    if (parts.size == 3) {
                        val source = parts[1]
                        val destination = parts[2]
                        val targetPrice = value

                        val response = apiService.getFarePrediction(source, destination, "")
                        val currentPrice = response.prediction.medium.toInt()

                        if (currentPrice <= targetPrice) {
                            // Show drop notification
                            showNotification(
                                "Price Drop Alert! ✈️",
                                "Fares from $source to $destination are now ₹$currentPrice (Target: ₹$targetPrice). Book now!"
                            )
                            // Remove alert after notifying to avoid spamming
                            prefs.edit().remove(key).apply()
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
        return Result.success()
    }

    private fun showNotification(title: String, message: String) {
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
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(Random.nextInt(), builder.build())
    }
}
