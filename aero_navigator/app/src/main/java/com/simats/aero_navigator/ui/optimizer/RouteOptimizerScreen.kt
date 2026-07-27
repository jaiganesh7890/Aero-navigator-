package com.simats.aero_navigator.ui.optimizer

import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.data.remote.RouteOptionDto
import com.simats.aero_navigator.data.remote.RouteLegDto

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RouteOptimizerScreen(
    source: String,
    destination: String,
    date: String,
    onBack: () -> Unit,
    viewModel: RouteOptimizerViewModel = hiltViewModel()
) {
    val state = viewModel.state.collectAsState().value
    var activeFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "Direct", "Cheapest", "Fastest")
    val uriHandler = androidx.compose.ui.platform.LocalUriHandler.current

    LaunchedEffect(Unit) { viewModel.loadRoutes(source, destination, date) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Route Optimizer", fontWeight = FontWeight.Bold)
                        Text(
                            "$source  →  $destination",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.LocationOn,
                            contentDescription = "Optimize",
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { inner ->

        when (state) {
            is OptimizerState.Idle, is OptimizerState.Loading -> {
                Box(modifier = Modifier.fillMaxSize().padding(inner), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        // Animated pulsing loader
                        val inf = rememberInfiniteTransition(label = "pulse")
                        val scale by inf.animateFloat(
                            initialValue = 0.85f, targetValue = 1.15f,
                            animationSpec = infiniteRepeatable(tween(800), RepeatMode.Reverse),
                            label = "scale"
                        )
                        Box(
                            modifier = Modifier
                                .size((60 * scale).dp)
                                .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.LocationOn, contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(32.dp))
                        }
                        Spacer(Modifier.height(20.dp))
                        Text("Analyzing all route options…", fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onBackground)
                        Spacer(Modifier.height(6.dp))
                        Text("Comparing prices, durations & stops",
                            fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            is OptimizerState.Error -> {
                Box(modifier = Modifier.fillMaxSize().padding(inner), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(12.dp))
                        Text(state.message, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                    }
                }
            }

            is OptimizerState.Success -> {
                val data = state.data
                if (data.routes.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize().padding(inner), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Search, null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(64.dp))
                            Spacer(Modifier.height(16.dp))
                            Text("No routes found", fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onBackground)
                            Text("Try different airports", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    return@Scaffold
                }

                val filtered = when (activeFilter) {
                    "Direct"   -> data.routes.filter { it.type == "direct" }
                    "Cheapest" -> data.routes.sortedBy { it.totalPrice }
                    "Fastest"  -> data.routes.sortedBy { it.totalDurationMinutes }
                    else       -> data.routes
                }

                val cheapestOverall = data.routes.minByOrNull { it.totalPrice }

                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(inner),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Summary banner
                    item {
                        RouteSummaryBanner(
                            totalOptions = data.routes.size,
                            directCount = data.routes.count { it.type == "direct" },
                            connectCount = data.routes.count { it.type == "connecting" },
                            cheapestPrice = data.cheapestPrice.toInt(),
                            cheapestRoute = data.routes.find { it.id == data.cheapestRoute }
                        )
                        Spacer(Modifier.height(8.dp))
                    }

                    // Filter chips
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            filters.forEach { f ->
                                FilterChip(
                                    selected = activeFilter == f,
                                    onClick = { activeFilter = f },
                                    label = { Text(f, fontSize = 13.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.background,
                                        containerColor = MaterialTheme.colorScheme.surface,
                                        labelColor = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                )
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                    }

                    if (filtered.isEmpty()) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(32.dp), Alignment.Center) {
                                Text("No ${activeFilter.lowercase()} routes found",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    } else {
                        items(filtered, key = { it.id }) { route ->
                            RouteOptionCard(
                                route = route,
                                cheapestPrice = data.cheapestPrice,
                                isBestOverall = route.id == data.bestRoute,
                                onBook = {
                                    val from = route.legs.firstOrNull()?.departure?.city ?: route.legs.firstOrNull()?.departure?.airportCode ?: source
                                    val to = route.legs.lastOrNull()?.arrival?.city ?: route.legs.lastOrNull()?.arrival?.airportCode ?: destination
                                    val airline = route.legs.firstOrNull()?.airline ?: ""
                                    val url = "https://www.google.com/search?q=book+flight+from+${from}+to+${to}+${airline}"
                                    uriHandler.openUri(url.replace(" ", "+"))
                                }
                            )
                        }
                        item { Spacer(Modifier.height(24.dp)) }
                    }
                }
            }
        }
    }
}

// ── Summary banner ────────────────────────────────────────────────────────────

@Composable
private fun RouteSummaryBanner(
    totalOptions: Int,
    directCount: Int,
    connectCount: Int,
    cheapestPrice: Int,
    cheapestRoute: RouteOptionDto?
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        border = BorderStroke(0.dp, Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        listOf(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.18f),
                            MaterialTheme.colorScheme.secondary.copy(alpha = 0.12f)
                        )
                    ),
                    RoundedCornerShape(20.dp)
                )
                .padding(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "$totalOptions Routes Found",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 18.sp,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "$directCount direct  •  $connectCount connecting",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    if (cheapestRoute != null) {
                        Spacer(Modifier.height(4.dp))
                        val label = if (cheapestRoute.type == "direct") "Direct flight"
                        else "Via ${cheapestRoute.viaCity ?: cheapestRoute.via}"
                        Text(
                            "Cheapest: $label",
                            fontSize = 12.sp,
                            color = Color(0xFF10B981),
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("From", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "₹${cheapestPrice.formatPrice()}",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

// ── Route option card ─────────────────────────────────────────────────────────

@Composable
fun RouteOptionCard(
    route: RouteOptionDto,
    cheapestPrice: Double,
    isBestOverall: Boolean,
    onBook: () -> Unit
) {
    val tagColor = mapOf(
        "Best Overall"   to Color(0xFF6366F1),
        "Cheapest"       to Color(0xFF10B981),
        "Fastest"        to MaterialTheme.colorScheme.primary,
        "Best Direct"    to Color(0xFF0EA5E9),
        "Budget Connect" to Color(0xFFF59E0B)
    )

    val borderColor = if (isBestOverall) MaterialTheme.colorScheme.primary.copy(alpha = 0.6f)
    else Color.Transparent

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(if (isBestOverall) 6.dp else 2.dp),
        border = if (isBestOverall) BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)) else null
    ) {
        Column(modifier = Modifier.padding(18.dp)) {

            // ── Header row: airline avatar + tags + score ──────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(42.dp)
                            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            route.legs.firstOrNull()?.airline?.take(2)?.uppercase() ?: "??",
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                            fontSize = 13.sp
                        )
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(
                            route.legs.firstOrNull()?.airline ?: "Unknown",
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onBackground
                        )
                        Text(
                            if (route.stops == 0) "Non-stop" else "1 Stop via ${route.viaCity ?: route.via}",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Tags
                Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    route.tags.take(2).forEach { tag ->
                        Box(
                            modifier = Modifier
                                .background(
                                    (tagColor[tag] ?: MaterialTheme.colorScheme.primary).copy(alpha = 0.15f),
                                    RoundedCornerShape(8.dp)
                                )
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                tag,
                                fontSize = 11.sp,
                                color = tagColor[tag] ?: MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))

            // ── Journey visualization ─────────────────────────────────────────
            if (route.type == "direct" && route.legs.size == 1) {
                DirectLegVisual(leg = route.legs[0])
            } else if (route.legs.size >= 2) {
                ConnectingLegsVisual(
                    leg1 = route.legs[0],
                    leg2 = route.legs[1],
                    hub = route.via ?: "",
                    hubCity = route.viaCity ?: "",
                    layoverMinutes = route.layoverMinutes
                )
            }

            Spacer(Modifier.height(16.dp))

            // ── Score bar ──────────────────────────────────────────────────────
            ScoreBar(score = route.score)

            Spacer(Modifier.height(14.dp))

            // ── Price + metadata + Book button ─────────────────────────────────
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        "₹${route.totalPrice.toInt().formatPrice()}",
                        fontSize = 22.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.primary
                    )
                    if (route.savings > 0) {
                        Text(
                            "₹${route.savings.toInt().formatPrice()} more than cheapest",
                            fontSize = 11.sp,
                            color = Color(0xFFF59E0B)
                        )
                    } else {
                        Text("Cheapest option ✓", fontSize = 11.sp, color = Color(0xFF10B981))
                    }
                    val durH = route.totalDurationMinutes / 60
                    val durM = route.totalDurationMinutes % 60
                    Text(
                        "${if (durH > 0) "${durH}h " else ""}${durM}m total",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                Button(
                    onClick = onBook,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    shape = RoundedCornerShape(14.dp),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp)
                ) {
                    Text("Book Now", color = MaterialTheme.colorScheme.background, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

// ── Direct leg visual ─────────────────────────────────────────────────────────

@Composable
private fun DirectLegVisual(leg: RouteLegDto) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(horizontalAlignment = Alignment.Start) {
            Text(
                leg.departure.time.substringAfterLast("T").take(5),
                fontSize = 20.sp, fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(leg.departure.airportCode, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(leg.departure.city ?: "", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
            val dur = leg.durationMinutes ?: 0
            Text(
                "${dur / 60}h ${dur % 60}m",
                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Icon(Icons.Default.Send, null, tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(18.dp))
            Text("Direct", fontSize = 10.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
        }

        Column(horizontalAlignment = Alignment.End) {
            Text(
                leg.arrival.time.substringAfterLast("T").take(5),
                fontSize = 20.sp, fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
            Text(leg.arrival.airportCode, fontSize = 13.sp, fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(leg.arrival.city ?: "", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

// ── Connecting legs visual ────────────────────────────────────────────────────

@Composable
private fun ConnectingLegsVisual(
    leg1: RouteLegDto,
    leg2: RouteLegDto,
    hub: String,
    hubCity: String,
    layoverMinutes: Int
) {
    // Leg 1 card
    LegRow(
        depCode = leg1.departure.airportCode,
        depCity = leg1.departure.city ?: leg1.departure.airportCode,
        arrCode = leg1.arrival.airportCode,
        arrCity = leg1.arrival.city ?: leg1.arrival.airportCode,
        depTime = leg1.departure.time.substringAfterLast("T").take(5),
        arrTime = leg1.arrival.time.substringAfterLast("T").take(5),
        durationMin = leg1.durationMinutes ?: 0,
        airline = leg1.airline,
        price = leg1.price,
        legLabel = "LEG 1"
    )

    // Layover indicator
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .background(Color(0xFFF59E0B), CircleShape)
        )
        Spacer(
            modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(Color(0xFFF59E0B).copy(alpha = 0.4f))
        )
        Box(
            modifier = Modifier
                .background(Color(0xFFF59E0B).copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                .padding(horizontal = 10.dp, vertical = 4.dp)
        ) {
            Text(
                "Layover ${layoverMinutes}m · $hub $hubCity",
                fontSize = 11.sp, color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold
            )
        }
        Spacer(
            modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(Color(0xFFF59E0B).copy(alpha = 0.4f))
        )
        Box(
            modifier = Modifier
                .size(6.dp)
                .background(Color(0xFFF59E0B), CircleShape)
        )
    }

    // Leg 2 card
    LegRow(
        depCode = leg2.departure.airportCode,
        depCity = leg2.departure.city ?: leg2.departure.airportCode,
        arrCode = leg2.arrival.airportCode,
        arrCity = leg2.arrival.city ?: leg2.arrival.airportCode,
        depTime = leg2.departure.time.substringAfterLast("T").take(5),
        arrTime = leg2.arrival.time.substringAfterLast("T").take(5),
        durationMin = leg2.durationMinutes ?: 0,
        airline = leg2.airline,
        price = leg2.price,
        legLabel = "LEG 2"
    )
}

@Composable
private fun LegRow(
    depCode: String, depCity: String,
    arrCode: String, arrCity: String,
    depTime: String, arrTime: String,
    durationMin: Int, airline: String,
    price: Double, legLabel: String
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.background.copy(alpha = 0.6f)
        )
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(legLabel, fontSize = 10.sp, color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold)
                Text(airline, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("₹${price.toInt().formatPrice()}", fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
            }
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(horizontalAlignment = Alignment.Start) {
                    Text(depTime, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground)
                    Text(depCode, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(depCity, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    val h = durationMin / 60; val m = durationMin % 60
                    Text("${if (h > 0) "${h}h " else ""}${m}m", fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Icon(Icons.Default.Send, null, tint = MaterialTheme.colorScheme.primary.copy(alpha = 0.6f),
                        modifier = Modifier.size(14.dp))
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(arrTime, fontSize = 16.sp, fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onBackground)
                    Text(arrCode, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(arrCity, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

// ── Score bar ─────────────────────────────────────────────────────────────────

@Composable
private fun ScoreBar(score: Int) {
    val scoreColor = when {
        score >= 75 -> Color(0xFF10B981)
        score >= 50 -> Color(0xFFF59E0B)
        else        -> Color(0xFFEF4444)
    }
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text("Score", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.width(40.dp))
        Box(
            modifier = Modifier
                .weight(1f)
                .height(6.dp)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(score / 100f)
                    .fillMaxHeight()
                    .clip(CircleShape)
                    .background(
                        Brush.horizontalGradient(listOf(scoreColor.copy(alpha = 0.7f), scoreColor))
                    )
            )
        }
        Text(
            "$score/100",
            fontSize = 12.sp, fontWeight = FontWeight.Bold, color = scoreColor,
            modifier = Modifier.width(50.dp), textAlign = TextAlign.End
        )
    }
}

// ── Extension ─────────────────────────────────────────────────────────────────

private fun Int.formatPrice(): String {
    return if (this >= 100000) "${this / 100000},${"%02d".format((this % 100000) / 1000)},${"%03d".format(this % 1000)}"
    else if (this >= 1000) "${this / 1000},${"%03d".format(this % 1000)}"
    else toString()
}
