package com.simats.aero_navigator.ui.home

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.data.remote.FlightDto
import com.simats.aero_navigator.data.remote.PredictionResponseDto

@Composable
fun DashboardScreen(
    onNavigateToSearch: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onNavigateToTracking: (flightId: String?) -> Unit,
    onNavigateToPricePrediction: (source: String?, dest: String?) -> Unit,
    onNavigateToOptimizer: (source: String?, dest: String?) -> Unit,
    onNavigateToGpsSharing: () -> Unit,
    onNavigateToAiChat: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    val dashboardState by viewModel.dashboardState.collectAsState()

    Scaffold(
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = onNavigateToAiChat,
                containerColor = com.simats.aero_navigator.ui.theme.PremiumPrimary,
                contentColor = com.simats.aero_navigator.ui.theme.PremiumBackground,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Star, contentDescription = "Ask AI")
                Spacer(modifier = Modifier.width(8.dp))
                Text("Ask AI", fontWeight = FontWeight.ExtraBold)
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = com.simats.aero_navigator.ui.theme.PremiumBackground,
                contentColor = com.simats.aero_navigator.ui.theme.PremiumTextPrimary,
                tonalElevation = 8.dp
            ) {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                    label = { Text("Home", fontWeight = FontWeight.Bold) },
                    selected = true,
                    onClick = { },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = com.simats.aero_navigator.ui.theme.PremiumBackground,
                        selectedTextColor = com.simats.aero_navigator.ui.theme.PremiumPrimary,
                        indicatorColor = com.simats.aero_navigator.ui.theme.PremiumPrimary,
                        unselectedIconColor = com.simats.aero_navigator.ui.theme.PremiumTextSecondary
                    )
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.CheckCircle, contentDescription = "Optimize") },
                    label = { Text("Optimize") },
                    selected = false,
                    onClick = { onNavigateToOptimizer(null, null) },
                    colors = NavigationBarItemDefaults.colors(unselectedIconColor = com.simats.aero_navigator.ui.theme.PremiumTextSecondary)
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.LocationOn, contentDescription = "Track") },
                    label = { Text("Track") },
                    selected = false,
                    onClick = { onNavigateToTracking(null) },
                    colors = NavigationBarItemDefaults.colors(unselectedIconColor = com.simats.aero_navigator.ui.theme.PremiumTextSecondary)
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Person, contentDescription = "Profile") },
                    label = { Text("Profile") },
                    selected = false,
                    onClick = onNavigateToProfile,
                    colors = NavigationBarItemDefaults.colors(unselectedIconColor = com.simats.aero_navigator.ui.theme.PremiumTextSecondary)
                )
            }
        },
        containerColor = com.simats.aero_navigator.ui.theme.PremiumBackground
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
        ) {
            // HERO SECTION
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                com.simats.aero_navigator.ui.theme.PremiumSecondary.copy(alpha = 0.3f),
                                com.simats.aero_navigator.ui.theme.PremiumBackground
                            )
                        )
                    )
                    .padding(24.dp)
            ) {
                Column {
                    Text(
                        text = "Welcome,",
                        fontSize = 16.sp,
                        color = com.simats.aero_navigator.ui.theme.PremiumPrimary,
                        fontWeight = FontWeight.Medium
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Aero Navigator",
                        fontSize = 32.sp,
                        color = com.simats.aero_navigator.ui.theme.PremiumTextPrimary,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = (-0.5).sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Ready for your next adventure?",
                        fontSize = 14.sp,
                        color = com.simats.aero_navigator.ui.theme.PremiumTextSecondary
                    )
                }
            }
            Spacer(modifier = Modifier.height(24.dp))

            // Search Bar (Now active and functional)
            OutlinedTextField(
                value = "",
                onValueChange = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToSearch() }, // Navigate when clicking the field
                enabled = false, // Disabled so clicking routes immediately
                placeholder = { Text("Search flights, destinations...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = MaterialTheme.colorScheme.primary) },
                shape = RoundedCornerShape(24.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    disabledContainerColor = MaterialTheme.colorScheme.surface,
                    disabledBorderColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f),
                    disabledPlaceholderColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    disabledLeadingIconColor = MaterialTheme.colorScheme.primary
                )
            )

            Spacer(modifier = Modifier.height(32.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Live Flight Status",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }
            Spacer(modifier = Modifier.height(16.dp))

            when (val state = dashboardState) {
                is DashboardState.Loading -> {
                    Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                is DashboardState.Error -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text(state.message, color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
                is DashboardState.Success -> {
                    if (state.liveFlight != null) {
                        LiveFlightCard(
                            flight = state.liveFlight,
                            onClick = { onNavigateToTracking(null) }
                        )
                    } else {
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable { onNavigateToTracking(null) },
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                                Text("Enter a flight number to track its live status!", color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "Quick Actions",
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Spacer(modifier = Modifier.height(16.dp))

            // Grid
            Row(modifier = Modifier.fillMaxWidth()) {
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    title = "Track Flight",
                    subtitle = "Live radar view",
                    icon = Icons.Default.LocationOn,
                    onClick = { onNavigateToTracking(null) }
                )
                Spacer(modifier = Modifier.width(16.dp))
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    title = "Price Predict",
                    subtitle = "AI forecasting",
                    icon = Icons.Default.Info,
                    onClick = { onNavigateToPricePrediction(null, null) }
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    title = "Optimize Route",
                    subtitle = "Best deals",
                    icon = Icons.Default.CheckCircle,
                    onClick = { onNavigateToOptimizer(null, null) }
                )
                Spacer(modifier = Modifier.width(16.dp))
                QuickActionCard(
                    modifier = Modifier.weight(1f),
                    title = "Share GPS",
                    subtitle = "Live location",
                    icon = Icons.Default.Share,
                    onClick = onNavigateToGpsSharing
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // AI Insight Card (Dynamic)
            when (val state = dashboardState) {
                is DashboardState.Success -> {
                    if (state.insight != null) {
                        AIInsightCard(
                            insight = state.insight,
                            onClick = { onNavigateToPricePrediction(state.insight.source, state.insight.destination) }
                        )
                    }
                }
                else -> {}
            }

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun LiveFlightCard(flight: FlightDto, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(flight.airline.take(2).uppercase(), color = MaterialTheme.colorScheme.background, fontWeight = FontWeight.Bold)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column {
                        Text(flight.airline, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                        Text(flight.flightNumber, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Box(
                    modifier = Modifier
                        .background(Color(0xFF10B981).copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(Color(0xFF10B981), CircleShape)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(flight.status.replaceFirstChar { it.uppercase() }, color = Color(0xFF10B981), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Bottom
            ) {
                Column {
                    Text("From", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(flight.departure.airportCode, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                    Text(flight.departure.time.substringAfterLast("T").take(5), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                
                // Progress Bar
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 16.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(4.dp)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.3f), CircleShape)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.6f) // Simulating 60% progress
                                .height(4.dp)
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(MaterialTheme.colorScheme.primary, MaterialTheme.colorScheme.secondary)
                                    ), 
                                    CircleShape
                                )
                        )
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .offset(y = (-4).dp)
                                .align(Alignment.Center)
                                .background(MaterialTheme.colorScheme.primary, CircleShape)
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("${flight.durationMinutes ?: 120} min", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text("To", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(flight.arrival.airportCode, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                    Text(flight.arrival.time.substringAfterLast("T").take(5), fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
fun AIInsightCard(insight: PredictionResponseDto, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.secondary.copy(alpha = 0.2f),
                            Color.Transparent
                        )
                    )
                )
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, contentDescription = "AI", tint = MaterialTheme.colorScheme.secondary)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("AI Travel Insight", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
                }
                Spacer(modifier = Modifier.height(12.dp))
                
                // Dynamic text based on real backend prediction
                val drop = insight.prediction.predictedDropPercent
                val routeName = "${insight.source} to ${insight.destination}"
                val recommendationText = if (insight.prediction.recommendation == "wait") {
                    "Flight prices for $routeName are predicted to drop by $drop% (${insight.prediction.priceTrend}). Consider waiting until ${insight.prediction.bestBookingWindow} to book."
                } else {
                    "Prices for $routeName are currently optimal. Book now before they increase!"
                }

                Text(
                    text = recommendationText,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = onClick,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                ) {
                    Text("Explore Deals", color = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
fun QuickActionCard(
    modifier: Modifier = Modifier,
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .height(130.dp)
            .clickable { onClick() },
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxSize(),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
            }
            Column {
                Text(title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground, fontSize = 14.sp)
                Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
        }
    }
}
