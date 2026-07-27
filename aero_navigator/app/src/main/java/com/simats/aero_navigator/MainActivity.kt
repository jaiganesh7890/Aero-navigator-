package com.simats.aero_navigator

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Modifier
import androidx.core.view.WindowCompat
import com.simats.aero_navigator.ui.navigation.AppNavigation
import com.simats.aero_navigator.ui.theme.Aero_navigatorTheme
import com.simats.aero_navigator.ui.theme.PremiumBackground
import com.simats.aero_navigator.ui.theme.ThemeViewModel
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val themeViewModel: ThemeViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Tell Android we will handle insets ourselves — this is the correct
        // way to do edge-to-edge so that the status bar sits OVER the content
        // only when we explicitly want it to. Each screen adds systemBarsPadding()
        // or uses Scaffold which handles it automatically.
        WindowCompat.setDecorFitsSystemWindows(window, true)

        setContent {
            val isDarkMode = themeViewModel.isDarkMode.collectAsState().value
            Aero_navigatorTheme(darkTheme = isDarkMode) {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppNavigation()
                }
            }
        }
    }
}