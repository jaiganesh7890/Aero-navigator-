package com.simats.aero_navigator.ui.prediction

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.data.remote.*
import com.simats.aero_navigator.worker.PriceAlertHelper

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PricePredictionScreen(
    source: String,
    destination: String,
    date: String,
    onBack: () -> Unit,
    viewModel: PricePredictionViewModel = hiltViewModel()
) {
    LaunchedEffect(Unit) {
        viewModel.getPrediction(source, destination, date)
    }
    val state = viewModel.state.collectAsState().value

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Price Prediction", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        Text("AI Forecasting Engine", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    Surface(
                        modifier = Modifier.size(40.dp),
                        shape = CircleShape,
                        color = Color(0xFF9C27B0).copy(alpha = 0.2f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Star, 
                                contentDescription = "AI", 
                                tint = Color(0xFF9C27B0),
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Hero Route Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = source.lowercase(),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF00E5FF),
                    maxLines = 1
                )
                Spacer(modifier = Modifier.width(12.dp))
                Icon(
                    Icons.Default.ArrowForward,
                    contentDescription = null,
                    tint = Color(0xFF00E5FF),
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = destination.lowercase(),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF00E5FF),
                    maxLines = 1
                )
            }

            when (state) {
                is PredictionState.Loading, is PredictionState.Idle -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                    }
                }
                is PredictionState.Error -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Error: ${state.message}", color = MaterialTheme.colorScheme.error)
                    }
                }
                is PredictionState.Success -> {
                    PricePredictionContent(state.data, source, destination)
                }
            }
        }
    }
}

@Composable
fun PricePredictionContent(
    data: PredictionResponseDto,
    source: String,
    destination: String
) {
    val context = LocalContext.current
    val p = data.prediction
    var alertPrice by remember { mutableStateOf("") }
    
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            val price = alertPrice.toIntOrNull()
            if (price != null) {
                PriceAlertHelper.setAlert(context, source, destination, price)
                Toast.makeText(context, "Alert set successfully!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
    ) {
        // 1. Main Price Card
        Card(
            modifier = Modifier.fillMaxWidth().shadow(8.dp, RoundedCornerShape(24.dp)),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Current Price", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "₹${p.medium.toInt()}",
                        fontSize = 44.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color(0xFF00E5FF)
                    )
                    Surface(
                        color = Color(0xFF10B981).copy(alpha = 0.1f),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text(
                            "-${p.predictedDropPercent ?: 18}%",
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            color = Color(0xFF10B981),
                            fontWeight = FontWeight.Bold,
                            fontSize = 16.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Predicted to drop to ₹${p.low.toInt()} in 5 days",
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 2. AI Route Insights
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(36.dp),
                        shape = CircleShape,
                        color = Color(0xFF10B981).copy(alpha = 0.15f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(20.dp))
                        }
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("AI Route Insights", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
                
                Spacer(modifier = Modifier.height(20.dp))
                
                data.cheapestRouteSummary?.let { summary ->
                    summary.direct?.let {
                        SimpleRouteRow(
                            icon = Icons.Default.AirplanemodeActive,
                            label = "Direct ($source ➔ $destination)",
                            price = it,
                            isBest = summary.savings <= 0
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    summary.viaHub?.let {
                        SimpleRouteRow(
                            icon = Icons.Default.Link,
                            label = "Via ${summary.bestHub ?: "Hub"} ($source ➔ ${summary.bestHub} ➔ $destination)",
                            price = it,
                            isBest = summary.savings > 0
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 3. AI Recommendation
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Star, contentDescription = null, tint = Color(0xFF9C27B0))
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("AI Recommendation", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
                Spacer(modifier = Modifier.height(16.dp))
                val isWait = p.recommendation == "wait"
                val recColor = if (isWait) Color(0xFFF59E0B) else Color(0xFF10B981)
                
                Text(
                    text = if (isWait) "Wait." else "Book Now.",
                    fontWeight = FontWeight.ExtraBold,
                    color = recColor,
                    fontSize = 18.sp
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Our AI predicts prices will drop by ₹${(p.medium - p.low).toInt()} over the next 5 days. Best booking window: ${p.bestBookingWindow ?: "Instant"}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 22.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 4. 7-Day Forecast Chart
        if (!data.forecast.isNullOrEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("7-Day Forecast", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Surface(
                            color = Color(0xFF10B981).copy(alpha = 0.1f),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Text(
                                "⬇ Dropping",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                fontSize = 12.sp,
                                color = Color(0xFF10B981),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    ModernPriceChart(data = data.forecast, color = Color(0xFF00E5FF))
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Predicted low: ₹${p.low.toInt()}", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Confidence: ${p.confidence}%", fontSize = 14.sp, color = Color(0xFF00E5FF), fontWeight = FontWeight.Bold)
                    }
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }

        // 5. 7-Day History Chart
        if (!data.history.isNullOrEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text("7-Day History", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(modifier = Modifier.height(24.dp))
                    ModernPriceChart(data = data.history, color = Color(0xFF9C27B0))
                }
            }
            Spacer(modifier = Modifier.height(20.dp))
        }

        // 6. Set Price Alert
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(24.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text("Set Price Alert", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                Spacer(modifier = Modifier.height(16.dp))
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = alertPrice,
                        onValueChange = { alertPrice = it },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text("₹ 3500") },
                        leadingIcon = { Icon(Icons.Default.Notifications, contentDescription = null, tint = Color(0xFF00E5FF)) },
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF00E5FF),
                            unfocusedBorderColor = MaterialTheme.colorScheme.surfaceVariant
                        )
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Button(
                        onClick = {
                            val price = alertPrice.toIntOrNull()
                            if (price == null) {
                                Toast.makeText(context, "Invalid price", Toast.LENGTH_SHORT).show()
                                return@Button
                            }

                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                if (ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                                    permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                                } else {
                                    PriceAlertHelper.setAlert(context, source, destination, price)
                                    Toast.makeText(context, "Alert set!", Toast.LENGTH_SHORT).show()
                                }
                            } else {
                                PriceAlertHelper.setAlert(context, source, destination, price)
                                Toast.makeText(context, "Alert set!", Toast.LENGTH_SHORT).show()
                            }
                        },
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.height(56.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00E5FF))
                    ) {
                        Text("Set Alert", color = Color.Black, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // 7. Price Factors
        data.priceFactors?.let { factors ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text("Price Factors", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(modifier = Modifier.height(24.dp))
                    ModernFactorRow("Demand", factors.demand)
                    Spacer(modifier = Modifier.height(16.dp))
                    ModernFactorRow("Competition", factors.competition)
                    Spacer(modifier = Modifier.height(16.dp))
                    ModernFactorRow("Seasonality", factors.seasonality)
                }
            }
        }

        Spacer(modifier = Modifier.height(40.dp))
    }
}

@Composable
fun SimpleRouteRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, price: Int, isBest: Boolean) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.width(8.dp))
            Text(label, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(horizontalAlignment = Alignment.End) {
            Text("₹$price", fontWeight = FontWeight.Bold, color = if(isBest) Color(0xFF00E5FF) else MaterialTheme.colorScheme.onSurface)
            if (isBest) {
                Surface(color = Color(0xFF10B981).copy(alpha = 0.2f), shape = RoundedCornerShape(4.dp)) {
                    Text("Best", color = Color(0xFF10B981), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 4.dp))
                }
            }
        }
    }
}

@Composable
fun ModernPriceChart(data: List<PriceDayDto>, color: Color) {
    if (data.isEmpty()) return
    val minPrice = data.minOf { it.price }
    val maxPrice = data.maxOf { it.price }.coerceAtLeast(minPrice + 1)

    Canvas(modifier = Modifier.fillMaxWidth().height(140.dp)) {
        val w = size.width
        val h = size.height
        val step = w / (data.size - 1).coerceAtLeast(1)

        val points = data.mapIndexed { i, d ->
            Offset(i * step, h - ((d.price - minPrice) / (maxPrice - minPrice) * h).toFloat())
        }

        // Area Gradient
        val fillPath = Path().apply {
            moveTo(0f, h)
            points.forEach { lineTo(it.x, it.y) }
            lineTo(w, h)
            close()
        }
        drawPath(
            path = fillPath,
            brush = Brush.verticalGradient(listOf(color.copy(alpha = 0.4f), Color.Transparent))
        )

        // Line
        val strokePath = Path().apply {
            points.forEachIndexed { i, p -> if (i == 0) moveTo(p.x, p.y) else lineTo(p.x, p.y) }
        }
        drawPath(strokePath, color = color, style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))

        // Dots
        points.forEach { p ->
            drawCircle(color, radius = 5.dp.toPx(), center = p)
            drawCircle(Color.White, radius = 2.dp.toPx(), center = p)
        }
    }
}

@Composable
fun ModernFactorRow(label: String, level: String) {
    val (progress, color) = when (level.lowercase()) {
        "high" -> 0.85f to Color(0xFF10B981)
        "medium" -> 0.5f to Color(0xFFF59E0B)
        else -> 0.25f to Color(0xFF10B981)
    }
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
            Text(level, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = color)
        }
        Spacer(modifier = Modifier.height(8.dp))
        Box(
            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(
                modifier = Modifier.fillMaxWidth(progress).fillMaxHeight().clip(CircleShape).background(color)
            )
        }
    }
}
