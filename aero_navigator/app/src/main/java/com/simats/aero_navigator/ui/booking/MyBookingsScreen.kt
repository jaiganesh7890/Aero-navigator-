package com.simats.aero_navigator.ui.booking

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.data.remote.BookingDto

@Composable
fun MyBookingsScreen(
    onBack: () -> Unit,
    viewModel: BookingViewModel = hiltViewModel()
) {
    val state = viewModel.historyState.collectAsState().value

    LaunchedEffect(Unit) {
        viewModel.fetchUserBookings()
    }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.Start,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(onClick = onBack, modifier = Modifier.padding(end = 16.dp)) {
                Text("Back")
            }
            Text(
                text = "My Bookings",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }

        when (state) {
            is BookingHistoryState.Idle, is BookingHistoryState.Loading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is BookingHistoryState.Error -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Error: ${state.message}", color = MaterialTheme.colorScheme.error)
                }
            }
            is BookingHistoryState.Success -> {
                if (state.bookings.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("You have no bookings yet.")
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(state.bookings) { booking ->
                            BookingItemCard(booking)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BookingItemCard(booking: BookingDto) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = "Booking ID: ${booking._id}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                if (booking.flight != null) {
                    Text(text = "${booking.flight.departure.airportCode} -> ${booking.flight.arrival.airportCode}", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                } else {
                    Text(text = "Flight data unavailable", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.error)
                }
                Text(text = "₹${booking.totalPrice}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = "Status: ${booking.status}", fontWeight = FontWeight.SemiBold)
            Text(text = "Date: ${booking.bookingDate}")
            
            if (booking.passengers.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "Passengers (${booking.passengers.size}):", fontWeight = FontWeight.Bold)
                booking.passengers.forEach { p ->
                    Text(text = "- ${p.name} (Seat: ${p.seat})")
                }
            }
        }
    }
}
