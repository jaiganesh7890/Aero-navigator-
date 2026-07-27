package com.simats.aero_navigator.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val PremiumDarkColorScheme = darkColorScheme(
    primary = PremiumPrimary,
    secondary = PremiumSecondary,
    background = PremiumBackground,
    surface = PremiumSurface,
    onPrimary = PremiumBackground,
    onSecondary = PremiumTextPrimary,
    onBackground = PremiumTextPrimary,
    onSurface = PremiumTextPrimary,
    surfaceVariant = PremiumSurface,
    onSurfaceVariant = PremiumTextSecondary,
    error = AlertRed,
    primaryContainer = PremiumSurface,
    secondaryContainer = PremiumSurface
)

@Composable
fun Aero_navigatorTheme(
    darkTheme: Boolean = true, // Force Dark Theme
    content: @Composable () -> Unit
) {
    val colorScheme = PremiumDarkColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}