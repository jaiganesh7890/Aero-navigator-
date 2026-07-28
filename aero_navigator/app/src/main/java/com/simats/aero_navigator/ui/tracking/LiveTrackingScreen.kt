package com.simats.aero_navigator.ui.tracking

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import org.osmdroid.config.Configuration
import org.osmdroid.tileprovider.tilesource.TileSourceFactory
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker
import org.osmdroid.views.overlay.Polyline

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LiveTrackingScreen(
    flightId: String,
    onBack: () -> Unit,
    viewModel: LiveTrackingViewModel = hiltViewModel()
) {
    val context = LocalContext.current
    var isSatelliteMode by remember { mutableStateOf(false) }
    
    LaunchedEffect(Unit) {
        val prefs = context.getSharedPreferences("osmdroid", Context.MODE_PRIVATE)
        Configuration.getInstance().load(context, prefs)
        viewModel.initTracking(flightId)
    }

    val flight = viewModel.flightDetails.collectAsState().value
    val liveLoc = viewModel.liveLocation.collectAsState().value

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Column {
                        Text(
                            text = flight?.airline ?: "Live Tracking",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp
                        )
                        Text(
                            text = flight?.flightNumber ?: "Fetching flight details...",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { isSatelliteMode = !isSatelliteMode }) {
                        Icon(
                            imageVector = if (isSatelliteMode) Icons.Default.Terrain else Icons.Default.Layers,
                            contentDescription = "Toggle Map Mode",
                            tint = if (isSatelliteMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                )
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // Map Layer (Fullscreen)
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    MapView(ctx).apply {
                        setTileSource(if (isSatelliteMode) TileSourceFactory.USGS_SAT else TileSourceFactory.MAPNIK)
                        setMultiTouchControls(true)
                        controller.setZoom(6.0)
                        controller.setCenter(GeoPoint(20.5937, 78.9629))
                        
                        // Add MyLocationOverlay
                        val locationOverlay = org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay(
                            org.osmdroid.views.overlay.mylocation.GpsMyLocationProvider(ctx), this
                        )
                        locationOverlay.enableMyLocation()
                        // Ensure it shows the blue dot and compass
                        locationOverlay.enableFollowLocation()
                        this.overlays.add(locationOverlay)
                    }
                },
                update = { mapView ->
                    mapView.setTileSource(if (isSatelliteMode) TileSourceFactory.USGS_SAT else TileSourceFactory.MAPNIK)
                    
                    // Manage MyLocationOverlay
                    val locationOverlay = mapView.overlays.find { it is org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay } as? org.osmdroid.views.overlay.mylocation.MyLocationNewOverlay
                    if (locationOverlay != null && !locationOverlay.isMyLocationEnabled) {
                        locationOverlay.enableMyLocation()
                    }

                    if (liveLoc != null) {
                        val geoPoint = GeoPoint(liveLoc.latitude, liveLoc.longitude)
                        
                        // Find or create flight marker without clearing all overlays
                        val existingMarker = mapView.overlays.find { it is Marker && it.title != null && it.title.endsWith("is here") } as? Marker
                        
                        if (existingMarker != null) {
                            existingMarker.position = geoPoint
                            existingMarker.title = "${flight?.flightNumber ?: "Flight"} is here"
                        } else {
                            val marker = Marker(mapView)
                            marker.position = geoPoint
                            marker.setAnchor(Marker.ANCHOR_CENTER, Marker.ANCHOR_CENTER)
                            marker.icon = context.getDrawable(android.R.drawable.ic_menu_send)
                            marker.title = "${flight?.flightNumber ?: "Flight"} is here"
                            mapView.overlays.add(marker)
                        }
                        
                        mapView.controller.animateTo(geoPoint, 7.0, 1000L)
                    }
                }
            )

            // Flight Path Info (Top Overlay)
            AnimatedVisibility(
                visible = flight != null,
                enter = expandVertically(),
                exit = shrinkVertically(),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(16.dp)
            ) {
                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f)),
                    modifier = Modifier.fillMaxWidth().shadow(4.dp, RoundedCornerShape(20.dp))
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        AirportCode(code = flight?.departure?.airportCode ?: "---", label = "DEPART")
                        
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                            Icon(
                                Icons.Default.AirplanemodeActive, 
                                contentDescription = null, 
                                tint = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.size(24.dp)
                            )
                            Box(modifier = Modifier.height(2.dp).fillMaxWidth(0.6f).background(MaterialTheme.colorScheme.outlineVariant))
                        }

                        AirportCode(code = flight?.arrival?.airportCode ?: "---", label = "ARRIVE")
                    }
                }
            }

            // Floating Data Card Layer (Bottom)
            if (liveLoc != null) {
                Card(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(16.dp)
                        .fillMaxWidth()
                        .shadow(12.dp, RoundedCornerShape(24.dp)),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.98f)
                    )
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier.size(8.dp).background(Color(0xFF00C853), CircleShape)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "LIVE TELEMETRY",
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                    fontSize = 12.sp,
                                    letterSpacing = 1.sp
                                )
                            }
                            
                            IconButton(onClick = { /* Refresh logic if needed */ }) {
                                Icon(Icons.Default.Refresh, contentDescription = "Refresh", modifier = Modifier.size(18.dp))
                            }
                        }
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            ModernTelemetryStat(
                                icon = Icons.Default.Height,
                                label = "ALTITUDE", 
                                value = "${liveLoc.altitude.toInt()} ft",
                                color = Color(0xFF2196F3)
                            )
                            ModernTelemetryStat(
                                icon = Icons.Default.Speed,
                                label = "GROUND SPEED", 
                                value = "${liveLoc.speed.toInt()} km/h",
                                color = Color(0xFFFFC107)
                            )
                            ModernTelemetryStat(
                                icon = Icons.Default.Navigation,
                                label = "HEADING", 
                                value = "${liveLoc.heading.toInt()}°",
                                color = Color(0xFFE91E63)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AirportCode(code: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = code, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
fun ModernTelemetryStat(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(color.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = label,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value,
            fontSize = 16.sp,
            fontWeight = FontWeight.ExtraBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
