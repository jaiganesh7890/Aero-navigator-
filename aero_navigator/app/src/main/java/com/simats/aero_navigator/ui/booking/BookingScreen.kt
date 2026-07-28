package com.simats.aero_navigator.ui.booking

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.data.remote.PassengerDto

@Composable
fun BookingScreen(
    flightId: String,
    pricePerSeat: Double,
    onBookingSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: BookingViewModel = hiltViewModel()
) {
    var passengerName by remember { mutableStateOf("") }
    var passengerAge by remember { mutableStateOf("") }
    var passengerSeat by remember { mutableStateOf("") }

    val passengers = remember { mutableStateListOf<PassengerDto>() }
    val bookingState by viewModel.bookingState.collectAsState()

    LaunchedEffect(bookingState) {
        if (bookingState is BookingState.Success) {
            onBookingSuccess()
            viewModel.clearState()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Button(onClick = onBack) {
                Text("Back")
            }
            Text(
                text = "Checkout",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary
            )
        }

        Text(
            text = "Total Price: ₹${passengers.size * pricePerSeat}",
            fontSize = 24.sp,
            fontWeight = FontWeight.ExtraBold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        // Add Passenger Form
        Card(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("Add Passenger Details", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = passengerName,
                    onValueChange = { passengerName = it },
                    label = { Text("Name") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = passengerAge,
                        onValueChange = { passengerAge = it },
                        label = { Text("Age") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    OutlinedTextField(
                        value = passengerSeat,
                        onValueChange = { passengerSeat = it },
                        label = { Text("Seat") },
                        modifier = Modifier.weight(1f),
                        singleLine = true
                    )
                }
                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = {
                        val ageInt = passengerAge.toIntOrNull() ?: 0
                        if (passengerName.isNotBlank() && ageInt > 0 && passengerSeat.isNotBlank()) {
                            passengers.add(PassengerDto(passengerName, ageInt, passengerSeat))
                            passengerName = ""
                            passengerAge = ""
                            passengerSeat = ""
                        }
                    },
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("Add Passenger")
                }
            }
        }

        // List Added Passengers
        Text("Passengers List", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, modifier = Modifier.padding(vertical = 8.dp))
        
        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            itemsIndexed(passengers) { index, item ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.padding(16.dp).fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(text = "${index + 1}. ${item.name} (${item.age} yrs)")
                        Text(text = "Seat: ${item.seat}", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (bookingState is BookingState.Loading) {
            Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Button(
                onClick = {
                    if (passengers.isNotEmpty()) {
                        viewModel.createBooking(flightId, passengers, passengers.size * pricePerSeat)
                    }
                },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(12.dp),
                enabled = passengers.isNotEmpty()
            ) {
                Text("Confirm & Book Ticket", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
        }

        if (bookingState is BookingState.Error) {
            Text(
                text = (bookingState as BookingState.Error).message,
                color = MaterialTheme.colorScheme.error,
                modifier = Modifier.padding(top = 8.dp)
            )
        }
    }
}
