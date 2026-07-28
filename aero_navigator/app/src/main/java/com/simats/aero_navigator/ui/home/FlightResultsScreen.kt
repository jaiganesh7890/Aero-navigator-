package com.simats.aero_navigator.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AirplanemodeActive
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.simats.aero_navigator.data.remote.FlightDto
import com.simats.aero_navigator.ui.theme.PremiumBackground
import com.simats.aero_navigator.ui.theme.PremiumPrimary
import com.simats.aero_navigator.ui.theme.PremiumSecondary
import com.simats.aero_navigator.ui.theme.PremiumSurface
import com.simats.aero_navigator.ui.theme.PremiumSurfaceLight
import com.simats.aero_navigator.ui.theme.PremiumTextPrimary
import com.simats.aero_navigator.ui.theme.PremiumTextSecondary
import com.simats.aero_navigator.ui.theme.SuccessGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FlightResultsScreen(
    viewModel: HomeViewModel,
    onPredictClick: () -> Unit,
    onTrackClick: (String) -> Unit,
    onBack: () -> Unit
) {
    val state = viewModel.searchState.collectAsState().value
    val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Search Results", fontWeight = FontWeight.Bold, color = PremiumTextPrimary) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = PremiumTextPrimary)
                    }
                },
                actions = {
                    Button(
                        onClick = onPredictClick,
                        colors = ButtonDefaults.buttonColors(containerColor = PremiumSecondary),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.padding(end = 8.dp)
                    ) {
                        Text("Price Predict", color = PremiumTextPrimary, fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = PremiumBackground)
            )
        },
        containerColor = PremiumBackground
    ) { innerPadding ->
        Column(modifier = Modifier.fillMaxSize().padding(innerPadding).padding(horizontal = 16.dp)) {
            when (state) {
                is FlightSearchState.Idle -> {}
                is FlightSearchState.Loading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = PremiumPrimary)
                    }
                }
                is FlightSearchState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Error: ${state.message}", color = MaterialTheme.colorScheme.error)
                    }
                }
                is FlightSearchState.Success -> {
                    if (state.flights.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No flights found.", color = PremiumTextPrimary)
                        }
                    } else {
                        LazyColumn(
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(vertical = 16.dp)
                        ) {
                            items(state.flights) { flight ->
                                FlightItemCard(
                                    flight,
                                    onClick = { 
                                        val url = "https://www.google.com/search?q=book+flight+from+${flight.departure.airportCode}+to+${flight.arrival.airportCode}+${flight.airline}"
                                        uriHandler.openUri(url.replace(" ", "+"))
                                    },
                                    onTrackClick = { onTrackClick(flight._id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun FlightItemCard(flight: FlightDto, onClick: () -> Unit, onTrackClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
        colors = CardDefaults.cardColors(containerColor = PremiumSurface)
    ) {
        Column {
            // Header / Airline info
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PremiumSurfaceLight)
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(PremiumPrimary.copy(alpha = 0.2f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.AirplanemodeActive, contentDescription = null, tint = PremiumPrimary)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = flight.airline,
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = PremiumTextPrimary
                    )
                }
                
                Text(
                    text = "₹${flight.price}",
                    fontWeight = FontWeight.Black,
                    fontSize = 22.sp,
                    color = SuccessGreen
                )
            }
            
            // Route info (Boarding pass style)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Source
                Column(horizontalAlignment = Alignment.Start) {
                    Text(flight.departure.airportCode, fontSize = 28.sp, fontWeight = FontWeight.Black, color = PremiumTextPrimary)
                    Text(flight.departure.time, fontSize = 14.sp, color = PremiumTextSecondary)
                }
                
                // Animated Dash / Duration
                Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                    val dur = flight.durationMinutes ?: 120
                    val hr = dur / 60
                    val mn = dur % 60
                    Text("${hr}h ${mn}m", fontSize = 12.sp, color = PremiumPrimary, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(modifier = Modifier.weight(1f).height(1.dp).background(PremiumSurfaceLight))
                        Icon(
                            Icons.Default.AirplanemodeActive,
                            contentDescription = null,
                            tint = PremiumPrimary,
                            modifier = Modifier.padding(horizontal = 8.dp)
                        )
                        Box(modifier = Modifier.weight(1f).height(1.dp).background(PremiumSurfaceLight))
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(if (flight.status == "scheduled") "Direct" else "In-Air", fontSize = 10.sp, color = PremiumTextSecondary)
                }
                
                // Destination
                Column(horizontalAlignment = Alignment.End) {
                    Text(flight.arrival.airportCode, fontSize = 28.sp, fontWeight = FontWeight.Black, color = PremiumTextPrimary)
                    Text(flight.arrival.time, fontSize = 14.sp, color = PremiumTextSecondary)
                }
            }
            
            // Divider (Dashed effect simulated with dots)
            Text(
                text = "- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -",
                color = PremiumSurfaceLight,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                maxLines = 1,
                fontSize = 18.sp,
                letterSpacing = 2.sp
            )

            // Footer / Actions
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PremiumBackground.copy(alpha = 0.5f))
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("FLIGHT NO.", fontSize = 10.sp, color = PremiumTextSecondary, letterSpacing = 1.sp)
                    Text(flight.flightNumber, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = PremiumTextPrimary)
                }
                
                Button(
                    onClick = onTrackClick,
                    colors = ButtonDefaults.buttonColors(containerColor = PremiumSecondary),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp), tint = PremiumTextPrimary)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Live Track", fontWeight = FontWeight.Bold, color = PremiumTextPrimary)
                }
            }
        }
    }
}
