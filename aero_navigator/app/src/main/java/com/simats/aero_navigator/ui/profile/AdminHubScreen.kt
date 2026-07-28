package com.simats.aero_navigator.ui.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.data.remote.ActivityLogDto

// Custom Colors matching the web dashboard
val DarkBg = Color(0xFF080B14)
val CardBg = Color(0xFF111827)
val CardBorder = Color(0xFF1F2937)
val CyanAccent = Color(0xFF00E5FF)
val PurpleAccent = Color(0xFF8B5CF6)
val GreenAccent = Color(0xFF10B981)
val RedAccent = Color(0xFFEF4444)
val TextPrimary = Color.White
val TextSecondary = Color(0xFF9CA3AF)

@Composable
fun AdminHubScreen(
    onBack: () -> Unit,
    viewModel: AdminHubViewModel = hiltViewModel()
) {
    val logs by viewModel.logs.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadAdminActivity()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBg)
    ) {
        // Simple Top Bar for Back Navigation
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, start = 8.dp, end = 16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextPrimary)
            }
        }

        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = CyanAccent)
            }
        } else if (error != null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(error ?: "Failed to load admin analytics", color = RedAccent)
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp)
            ) {
                // Header Section
                item {
                    Text(
                        text = "📅 Administrator Hub & Business Analytics",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Monitor user demand trends, track daily flight search patterns, analyze AI chatbot queries, and maintain system data performance.",
                        fontSize = 14.sp,
                        color = TextSecondary,
                        lineHeight = 20.sp
                    )
                }

                // Top Stats Row
                item {
                    val searchesToday = logs.count { it.action_type == "SEARCH_ROUTE" }
                    val aiQueriesToday = logs.count { it.action_type == "AI_CHAT" || it.action_type == "PRICE_PREDICT" }
                    val totalLogs = logs.size

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                                StatItem(value = searchesToday.toString(), label = "SEARCHES TODAY", color = CyanAccent)
                            }
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                                StatItem(value = aiQueriesToday.toString(), label = "AI QUERIES TODAY", color = CyanAccent)
                            }
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                                StatItem(value = totalLogs.toString(), label = "TOTAL SAVED LOGS", color = CyanAccent)
                            }
                            Box(modifier = Modifier.weight(1f), contentAlignment = Alignment.Center) {
                                StatItem(value = "100%", label = "SYSTEM HEALTH", color = GreenAccent)
                            }
                        }
                    }
                }

                // Analytics Cards
                item {
                    HighDemandRoutesCard(logs)
                }
                
                item {
                    AiInsightsCard()
                }

                // Audit Trail Header & Buttons
                item {
                    Column {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("📊 Live Daily Activity Audit Trail", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Text("Real-time database stream maintaining user queries and system actions.", fontSize = 12.sp, color = TextSecondary)
                            }
                        }
                        
                        // Action Buttons Row (Horizontally scrollable for mobile screens)
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .horizontalScroll(androidx.compose.foundation.rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OutlinedButton(
                                onClick = { /* TODO */ },
                                border = BorderStroke(1.dp, PurpleAccent),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = PurpleAccent)
                            ) {
                                Text("Export CSV Data", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            
                            Button(
                                onClick = { /* TODO */ },
                                colors = ButtonDefaults.buttonColors(containerColor = CyanAccent, contentColor = Color.Black)
                            ) {
                                Text("Run Maintenance", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            
                            OutlinedButton(
                                onClick = { /* TODO */ },
                                border = BorderStroke(1.dp, RedAccent),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = RedAccent)
                            ) {
                                Text("Clear Logs", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }

                // Audit Logs List
                if (logs.isEmpty()) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                            Text("No global activity yet.", color = TextSecondary)
                        }
                    }
                } else {
                    items(logs.sortedByDescending { it.created_at }) { log ->
                        AdminAuditLogItem(log)
                    }
                }
            }
        }
    }
}

@Composable
fun StatItem(value: String, label: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(4.dp)) {
        Text(text = value, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = TextPrimary)
        Spacer(modifier = Modifier.height(4.dp))
        Text(text = label, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
fun HighDemandRoutesCard(logs: List<ActivityLogDto>) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, CardBorder, RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("🔥", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text("High-Demand Travel Routes", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text("Most searched routes analyzed to optimize pricing strategy & inventory.", fontSize = 12.sp, color = TextSecondary)
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Extract top route (simplified for UI demonstration)
            val searchLogs = logs.filter { it.action_type == "SEARCH_ROUTE" }
            val searchesCount = if (searchLogs.isNotEmpty()) searchLogs.size else 1
            
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("✈️", fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("BANGLORE ➔ LONDON", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
                Text("$searchesCount Searches", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = CyanAccent)
            }
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { 1.0f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = CyanAccent,
                trackColor = CardBorder
            )
        }
    }
}

@Composable
fun AiInsightsCard() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, CardBorder, RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("🤖", fontSize = 18.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text("AI Insights & Customer Queries", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text("Frequent topics asked by travelers to improve platform UX & features.", fontSize = 12.sp, color = TextSecondary)
            
            Spacer(modifier = Modifier.height(16.dp))
            
            AiInsightItem(icon = "💰", title = "Flight Prices & Deals", percentage = "42% INTEREST", progress = 0.42f)
            Spacer(modifier = Modifier.height(12.dp))
            AiInsightItem(icon = "🧳", title = "Baggage Policies", percentage = "28% INTEREST", progress = 0.28f)
            Spacer(modifier = Modifier.height(12.dp))
            AiInsightItem(icon = "⛅", title = "Destination Weather", percentage = "19% INTEREST", progress = 0.19f)
            Spacer(modifier = Modifier.height(12.dp))
            AiInsightItem(icon = "🛂", title = "Visa & Immigration", percentage = "11% INTEREST", progress = 0.11f)
        }
    }
}

@Composable
fun AiInsightItem(icon: String, title: String, percentage: String, progress: Float) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = DarkBg),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(icon, fontSize = 14.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(title, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
            }
            Text(percentage, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = CyanAccent)
        }
    }
}

@Composable
fun AdminAuditLogItem(log: ActivityLogDto) {
    val icon = when (log.action_type) {
        "SEARCH_ROUTE" -> "✈️"
        "AI_CHAT" -> "🤖"
        "SIGN_IN" -> "👤"
        "TRACK_FLIGHT" -> "📡"
        else -> "🛠️"
    }

    // Attempt to format date to match screenshot e.g. "2026-07-25"
    val displayDate = try {
        log.created_at.substringBefore("T").ifEmpty { log.created_at.take(10) }
    } catch (e: Exception) {
        log.created_at
    }
    
    // Fallback details if empty
    val displayDetails = if (!log.details.isNullOrBlank()) log.details else "System action completed successfully."
    val emailStr = if (log.user_id.contains("@")) log.user_id else "User: ${log.user_id}"

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .border(1.dp, CardBorder, RoundedCornerShape(8.dp)),
        colors = CardDefaults.cardColors(containerColor = CardBg),
        shape = RoundedCornerShape(8.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Top
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(icon, fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = log.action_type.replace("_", " "),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$emailStr • $displayDetails",
                    fontSize = 12.sp,
                    color = TextSecondary,
                    lineHeight = 16.sp
                )
            }
            
            // Date pill on the right
            Box(
                modifier = Modifier
                    .background(DarkBg, RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = displayDate,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = CyanAccent
                )
            }
        }
    }
}
