package com.simats.aero_navigator.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.simats.aero_navigator.ui.auth.LoginScreen
import com.simats.aero_navigator.ui.auth.SignupScreen
import com.simats.aero_navigator.ui.gps.GpsSharingScreen
import com.simats.aero_navigator.ui.home.DashboardScreen
import com.simats.aero_navigator.ui.home.FlightResultsScreen
import com.simats.aero_navigator.ui.home.FlightSearchScreen
import com.simats.aero_navigator.ui.home.HomeViewModel
import com.simats.aero_navigator.ui.optimizer.RouteOptimizerScreen
import com.simats.aero_navigator.ui.prediction.PricePredictionScreen
import com.simats.aero_navigator.ui.tracking.FlightTrackSearchScreen
import com.simats.aero_navigator.ui.tracking.LiveTrackingScreen
import kotlinx.coroutines.delay

sealed class Screen(val route: String) {
    object Splash : Screen("splash")
    object Login : Screen("login")
    object Signup : Screen("signup")
    object Home : Screen("home")
    object Search : Screen("search")
    object Profile : Screen("profile")
    object DailyActivity : Screen("daily_activity")
    object AdminHub : Screen("admin_hub")
    object GpsSharing : Screen("gps_sharing")
    object AiChat : Screen("ai_chat")

    object PredictionSearch : Screen("prediction_search")
    object OptimizerSearch : Screen("optimizer_search")

    object Results : Screen("results/{source}/{dest}/{date}") {
        fun createRoute(source: String, dest: String, date: String) = "results/$source/$dest/$date"
    }
    object TrackSearch : Screen("track_search")
    object Tracking : Screen("tracking/{flightId}") {
        fun createRoute(flightId: String) = "tracking/$flightId"
    }
    object Prediction : Screen("prediction/{source}/{dest}/{date}") {
        fun createRoute(source: String, dest: String, date: String) = "prediction/$source/$dest/$date"
    }
    object Optimizer : Screen("optimizer/{source}/{dest}/{date}") {
        fun createRoute(source: String, dest: String, date: String) = "optimizer/$source/$dest/$date"
    }
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Screen.Splash.route) {

        // SPLASH
        composable(Screen.Splash.route) {
            val authViewModel: com.simats.aero_navigator.ui.auth.AuthViewModel = hiltViewModel()
            SplashScreen(onTimeout = {
                val nextRoute = if (authViewModel.isLoggedIn()) Screen.Home.route else Screen.Login.route
                navController.navigate(nextRoute) { popUpTo(Screen.Splash.route) { inclusive = true } }
            })
        }

        // LOGIN
        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToSignup = { navController.navigate(Screen.Signup.route) },
                onLoginSuccess = {
                    navController.navigate(Screen.Home.route) { popUpTo(Screen.Login.route) { inclusive = true } }
                }
            )
        }

        // SIGNUP
        composable(Screen.Signup.route) {
            SignupScreen(
                onNavigateToLogin = { navController.popBackStack() },
                onSignupSuccess = {
                    navController.navigate(Screen.Home.route) { popUpTo(Screen.Signup.route) { inclusive = true } }
                }
            )
        }

        // HOME DASHBOARD
        composable(Screen.Home.route) { backStackEntry ->
            val savedStateHandle = backStackEntry.savedStateHandle
            val trackedFlightId = savedStateHandle.get<String>("trackedFlightId")
            val viewModel: HomeViewModel = hiltViewModel()

            LaunchedEffect(trackedFlightId) {
                if (trackedFlightId != null) {
                    viewModel.trackSpecificFlightById(trackedFlightId)
                    savedStateHandle.remove<String>("trackedFlightId")
                }
            }

            DashboardScreen(
                onNavigateToSearch = { navController.navigate(Screen.Search.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) },
                onNavigateToTracking = {
                    navController.navigate(Screen.TrackSearch.route)
                },
                onNavigateToPricePrediction = { source, dest ->
                    if (source != null && dest != null) {
                        navController.navigate(Screen.Prediction.createRoute(source, dest, "2026-06-01"))
                    } else {
                        navController.navigate(Screen.PredictionSearch.route)
                    }
                },
                onNavigateToOptimizer = { source, dest ->
                    if (source != null && dest != null) {
                        navController.navigate(Screen.Optimizer.createRoute(source, dest, "2026-06-01"))
                    } else {
                        navController.navigate(Screen.OptimizerSearch.route)
                    }
                },
                onNavigateToGpsSharing = {
                    navController.navigate(Screen.GpsSharing.route)
                },
                onNavigateToAiChat = {
                    navController.navigate(Screen.AiChat.route)
                },
                viewModel = viewModel
            )
        }

        // SEARCH
        composable(Screen.Search.route) {
            FlightSearchScreen(
                onSearch = { source, dest, date ->
                    navController.navigate(Screen.Results.createRoute(source, dest, date))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // RESULTS
        composable(
            route = Screen.Results.route,
            arguments = listOf(
                navArgument("source") { type = NavType.StringType },
                navArgument("dest") { type = NavType.StringType },
                navArgument("date") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val source = backStackEntry.arguments?.getString("source") ?: ""
            val dest = backStackEntry.arguments?.getString("dest") ?: ""
            val date = backStackEntry.arguments?.getString("date") ?: ""
            val homeViewModel: HomeViewModel = hiltViewModel()
            LaunchedEffect(Unit) { homeViewModel.searchFlights(source, dest, date) }

            FlightResultsScreen(
                viewModel = homeViewModel,
                onPredictClick = {
                    navController.navigate(Screen.Prediction.createRoute(source, dest, date))
                },
                onTrackClick = { flightId ->
                    navController.navigate(Screen.Tracking.createRoute(flightId))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // TRACK SEARCH — user picks which flight to follow
        composable(Screen.TrackSearch.route) {
            FlightTrackSearchScreen(
                onFlightSelected = { flightId ->
                    navController.previousBackStackEntry?.savedStateHandle?.set("trackedFlightId", flightId)
                    navController.navigate(Screen.Tracking.createRoute(flightId))
                },
                onOptimizeRoute = { source, dest ->
                    navController.navigate(Screen.Optimizer.createRoute(source, dest, "2026-06-01"))
                },
                onPredictPrice = { source, dest ->
                    navController.navigate(Screen.Prediction.createRoute(source, dest, "2026-06-01"))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // PREDICTION SEARCH — user picks route for AI price prediction
        composable(Screen.PredictionSearch.route) {
            FlightSearchScreen(
                title = "AI Price Prediction",
                subtitle = "Select route for price forecasting",
                onSearch = { source, dest, date ->
                    val actualDate = if (date.isBlank()) "2026-06-01" else date
                    navController.navigate(Screen.Prediction.createRoute(source, dest, actualDate))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // OPTIMIZER SEARCH — user picks route for layout/pricing optimization
        composable(Screen.OptimizerSearch.route) {
            FlightSearchScreen(
                title = "Route Optimizer",
                subtitle = "Select route to optimize layovers & pricing",
                onSearch = { source, dest, date ->
                    val actualDate = if (date.isBlank()) "2026-06-01" else date
                    navController.navigate(Screen.Optimizer.createRoute(source, dest, actualDate))
                },
                onBack = { navController.popBackStack() }
            )
        }

        // TRACKING — live map for a specific flight chosen by the user
        composable(
            route = Screen.Tracking.route,
            arguments = listOf(navArgument("flightId") { type = NavType.StringType })
        ) { backStackEntry ->
            val flightId = backStackEntry.arguments?.getString("flightId") ?: ""
            LiveTrackingScreen(flightId = flightId, onBack = { navController.popBackStack() })
        }

        // PRICE PREDICTION
        composable(
            route = Screen.Prediction.route,
            arguments = listOf(
                navArgument("source") { type = NavType.StringType },
                navArgument("dest") { type = NavType.StringType },
                navArgument("date") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val source = backStackEntry.arguments?.getString("source") ?: ""
            val dest = backStackEntry.arguments?.getString("dest") ?: ""
            val date = backStackEntry.arguments?.getString("date") ?: ""
            PricePredictionScreen(
                source = source, destination = dest, date = date,
                onBack = { navController.popBackStack() }
            )
        }

        // ROUTE OPTIMIZER
        composable(
            route = Screen.Optimizer.route,
            arguments = listOf(
                navArgument("source") { type = NavType.StringType },
                navArgument("dest") { type = NavType.StringType },
                navArgument("date") { type = NavType.StringType }
            )
        ) { backStackEntry ->
            val source = backStackEntry.arguments?.getString("source") ?: ""
            val dest = backStackEntry.arguments?.getString("dest") ?: ""
            val date = backStackEntry.arguments?.getString("date") ?: ""
            RouteOptimizerScreen(
                source = source, destination = dest, date = date,
                onBack = { navController.popBackStack() }
            )
        }

        // GPS SHARING
        composable(Screen.GpsSharing.route) {
            GpsSharingScreen(onBack = { navController.popBackStack() })
        }

        // AI CHAT
        composable(Screen.AiChat.route) {
            com.simats.aero_navigator.ui.home.AiChatScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // PROFILE
        composable(Screen.Profile.route) {
            com.simats.aero_navigator.ui.profile.ProfileScreen(
                onBack = { navController.popBackStack() },
                onNavigateToActivity = { navController.navigate(Screen.DailyActivity.route) },
                onNavigateToAdminHub = { navController.navigate(Screen.AdminHub.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Home.route) { inclusive = true }
                    }
                }
            )
        }
        
        // DAILY ACTIVITY
        composable(Screen.DailyActivity.route) {
            com.simats.aero_navigator.ui.profile.DailyActivityScreen(
                onBack = { navController.popBackStack() }
            )
        }

        // ADMIN HUB
        composable(Screen.AdminHub.route) {
            com.simats.aero_navigator.ui.profile.AdminHubScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}

@Composable
fun SplashScreen(onTimeout: () -> Unit) {
    LaunchedEffect(Unit) { delay(2000); onTimeout() }
    Box(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
    }
}