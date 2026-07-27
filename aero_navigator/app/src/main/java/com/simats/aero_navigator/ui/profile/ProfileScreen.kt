package com.simats.aero_navigator.ui.profile

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.ui.auth.AuthState
import com.simats.aero_navigator.ui.auth.AuthViewModel
import com.simats.aero_navigator.ui.theme.ThemeViewModel

@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    onNavigateToActivity: () -> Unit,
    onNavigateToAdminHub: () -> Unit,
    onLogout: () -> Unit,
    authViewModel: AuthViewModel = hiltViewModel(),
    themeViewModel: ThemeViewModel = hiltViewModel(),
    appSettingsViewModel: AppSettingsViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    
    // Auth States
    val currentUser = authViewModel.getCurrentUser()
    val authState = authViewModel.authState.collectAsState().value
    var name by remember { mutableStateOf(currentUser?.name ?: "") }
    var password by remember { mutableStateOf("") }
    var isEditing by remember { mutableStateOf(false) }

    // Settings States
    val isDarkMode = themeViewModel.isDarkMode.collectAsState().value
    val homeAirport = appSettingsViewModel.homeAirport.collectAsState().value
    val aiSensitivity = appSettingsViewModel.aiSensitivity.collectAsState().value
    val autoTrackPrices = appSettingsViewModel.autoTrackFavorablePrices.collectAsState().value
    val distanceUnits = appSettingsViewModel.distanceUnits.collectAsState().value
    val defaultMapMode = appSettingsViewModel.defaultMapMode.collectAsState().value
    val dataSaverMode = appSettingsViewModel.dataSaverMode.collectAsState().value
    val flightDelayAlerts = appSettingsViewModel.flightDelayAlerts.collectAsState().value
    val gpsSharingAlerts = appSettingsViewModel.gpsSharingAlerts.collectAsState().value
    val syncFrequency = appSettingsViewModel.syncFrequency.collectAsState().value

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            Toast.makeText(context, "Profile updated successfully!", Toast.LENGTH_SHORT).show()
            isEditing = false
            password = ""
            authViewModel.clearState()
        } else if (authState is AuthState.Error) {
            Toast.makeText(context, authState.message, Toast.LENGTH_LONG).show()
            authViewModel.clearState()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp)
            .verticalScroll(rememberScrollState())
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp, top = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = MaterialTheme.colorScheme.onBackground)
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Profile & Settings",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        // 1. Account & Profile Info
        SettingsSectionTitle(title = "Account & Profile Info", icon = Icons.Default.Person)
        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = currentUser?.name?.take(1)?.uppercase() ?: "U",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                        Spacer(modifier = Modifier.width(16.dp))
                        Column {
                            Text(text = currentUser?.name ?: "User Name", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(text = currentUser?.email ?: "email@example.com", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    TextButton(onClick = { isEditing = !isEditing }) {
                        Text(if (isEditing) "Cancel" else "Edit")
                    }
                }

                if (isEditing) {
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Display Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("New Password (Optional)") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(
                        onClick = { authViewModel.updateProfile(name, password) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = authState !is AuthState.Loading
                    ) {
                        if (authState is AuthState.Loading) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White)
                        } else {
                            Text("Save Profile Changes")
                        }
                    }
                }

                HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))

                OutlinedTextField(
                    value = homeAirport,
                    onValueChange = { appSettingsViewModel.updateHomeAirport(it.uppercase()) },
                    label = { Text("Home Airport Code (e.g. LAX)") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )

                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = onNavigateToActivity,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondary)
                ) {
                    Icon(Icons.Default.History, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("View Daily Activity")
                }

                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = onNavigateToAdminHub,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary)
                ) {
                    Icon(Icons.Default.Analytics, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Administrator Hub")
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 2. AI & Price Prediction Engines
        SettingsSectionTitle(title = "AI & Price Prediction", icon = Icons.Default.AutoGraph)
        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                SettingsDropdown(
                    label = "AI Sensitivity",
                    description = "Adjust forecasting aggression",
                    options = listOf("Conservative", "Balanced", "Aggressive"),
                    selectedOption = aiSensitivity,
                    onOptionSelected = { appSettingsViewModel.updateAiSensitivity(it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                SettingsToggleRow(
                    label = "Auto-Track Favorable Prices",
                    description = "AI auto-tracks flights with extreme price drops",
                    checked = autoTrackPrices,
                    onCheckedChange = { appSettingsViewModel.toggleAutoTrackPrices(it) }
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 3. Live Tracking & Display Controls
        SettingsSectionTitle(title = "Live Tracking & Display", icon = Icons.Default.Map)
        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                SettingsSegmentedControl(
                    label = "Distance Units",
                    options = listOf("Kilometers", "Miles"),
                    selectedOption = distanceUnits,
                    onOptionSelected = { appSettingsViewModel.updateDistanceUnits(it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                SettingsSegmentedControl(
                    label = "Default Map Mode",
                    options = listOf("Standard", "Terrain"),
                    selectedOption = defaultMapMode,
                    onOptionSelected = { appSettingsViewModel.updateDefaultMapMode(it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                SettingsToggleRow(
                    label = "Data Saver Mode",
                    description = "Use low-res map tiles on cellular networks",
                    checked = dataSaverMode,
                    onCheckedChange = { appSettingsViewModel.toggleDataSaverMode(it) }
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 4. High-Priority Notifications
        SettingsSectionTitle(title = "High-Priority Notifications", icon = Icons.Default.Notifications)
        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                SettingsToggleRow(
                    label = "Flight Delays & Cancellations",
                    description = "Get push alerts for tracked flights",
                    checked = flightDelayAlerts,
                    onCheckedChange = { appSettingsViewModel.toggleFlightDelayAlerts(it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                SettingsToggleRow(
                    label = "GPS Sharing Active",
                    description = "Reminders when your location is broadcasting",
                    checked = gpsSharingAlerts,
                    onCheckedChange = { appSettingsViewModel.toggleGpsSharingAlerts(it) }
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // 5. System, Sync & Localization
        SettingsSectionTitle(title = "System, Sync & Localization", icon = Icons.Default.Settings)
        Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
            Column(modifier = Modifier.padding(16.dp)) {
                SettingsToggleRow(
                    label = "App Theme (Dark Mode)",
                    description = "Toggle dark/light interface",
                    checked = isDarkMode,
                    onCheckedChange = { themeViewModel.toggleTheme(it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                SettingsDropdown(
                    label = "Sync Frequency",
                    description = "Background data fetching rate",
                    options = listOf("Real-time", "Every 15 mins", "Manual"),
                    selectedOption = syncFrequency,
                    onOptionSelected = { appSettingsViewModel.updateSyncFrequency(it) }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
                
                var isClearingCache by remember { mutableStateOf(false) }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Clear Map Cache", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                        Text("Free up storage from offline map tiles", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Button(
                        onClick = {
                            isClearingCache = true
                            appSettingsViewModel.clearMapCache(context) {
                                isClearingCache = false
                                Toast.makeText(context, "Map cache cleared successfully!", Toast.LENGTH_SHORT).show()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.secondaryContainer, contentColor = MaterialTheme.colorScheme.onSecondaryContainer)
                    ) {
                        if (isClearingCache) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = MaterialTheme.colorScheme.onSecondaryContainer, strokeWidth = 2.dp)
                        } else {
                            Text("Clear")
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(40.dp))

        Button(
            onClick = {
                authViewModel.logout()
                onLogout()
            },
            modifier = Modifier.fillMaxWidth().height(56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
        ) {
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Logout", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
        
        Spacer(modifier = Modifier.height(40.dp))
    }
}

@Composable
fun SettingsSectionTitle(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 8.dp, start = 4.dp)) {
        Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = title, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.primary)
    }
}

@Composable
fun SettingsToggleRow(label: String, description: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f).padding(end = 16.dp)) {
            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            Text(description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}

@Composable
fun SettingsSegmentedControl(label: String, options: List<String>, selectedOption: String, onOptionSelected: (String) -> Unit) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, modifier = Modifier.padding(bottom = 8.dp))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                .padding(4.dp)
        ) {
            options.forEach { option ->
                val isSelected = option == selectedOption
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent)
                        .clickable { onOptionSelected(option) }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = option,
                        fontSize = 14.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsDropdown(label: String, description: String, options: List<String>, selectedOption: String, onOptionSelected: (String) -> Unit) {
    var expanded by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f).padding(end = 16.dp)) {
            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            Text(description, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { expanded = !expanded },
            modifier = Modifier.width(150.dp)
        ) {
            OutlinedTextField(
                value = selectedOption,
                onValueChange = {},
                readOnly = true,
                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                modifier = Modifier.menuAnchor(),
                textStyle = LocalTextStyle.current.copy(fontSize = 14.sp)
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEach { selectionOption ->
                    DropdownMenuItem(
                        text = { Text(selectionOption, fontSize = 14.sp) },
                        onClick = {
                            onOptionSelected(selectionOption)
                            expanded = false
                        }
                    )
                }
            }
        }
    }
}
