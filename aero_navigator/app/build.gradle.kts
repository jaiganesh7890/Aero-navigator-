import java.net.Inet4Address
import java.net.NetworkInterface

fun getLocalIpAddress(): String {
    var fallbackIp = "10.0.2.2"
    try {
        val interfaces = NetworkInterface.getNetworkInterfaces()
        while (interfaces.hasMoreElements()) {
            val networkInterface = interfaces.nextElement()
            val name = networkInterface.displayName.lowercase() + " " + networkInterface.name.lowercase()
            if (networkInterface.isLoopback || !networkInterface.isUp || name.contains("virtual") || name.contains("vmware") || name.contains("vbox") || name.contains("wsl")) continue
            
            val addresses = networkInterface.inetAddresses
            while (addresses.hasMoreElements()) {
                val addr = addresses.nextElement()
                if (addr is Inet4Address) {
                    val ip = addr.hostAddress
                    if (ip == "192.168.56.1") continue // Ignore VirtualBox Host-Only
                    
                    if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
                        if (name.contains("wi-fi") || name.contains("wlan")) {
                            return ip
                        }
                        if (fallbackIp == "10.0.2.2") {
                            fallbackIp = ip
                        }
                    }
                }
            }
        }
    } catch (e: Exception) {
        // ignore
    }
    return fallbackIp
}

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt.android)
    alias(libs.plugins.ksp)

    kotlin("kapt")
}

android {
    namespace = "com.simats.aero_navigator"

    compileSdk = 35

    defaultConfig {
        applicationId = "com.simats.aero_navigator"
        minSdk = 24
        targetSdk = 35

        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "BASE_URL_BACKEND", "\"http://${getLocalIpAddress()}:5000/\"")
        buildConfigField("String", "BASE_URL_AI", "\"http://${getLocalIpAddress()}:5001/\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false

            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = "11"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {

    implementation(platform(libs.androidx.compose.bom))

    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)

    testImplementation(libs.junit)

    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)

    debugImplementation(libs.androidx.compose.ui.test.manifest)
    debugImplementation(libs.androidx.compose.ui.tooling)

    // Hilt
    implementation(libs.hilt.android)
    kapt(libs.hilt.compiler)

    // Retrofit
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)

    // Navigation
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.hilt.navigation.compose)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)

    // Socket.IO
    implementation(libs.socket.io.client)

    // Maps
    implementation("org.osmdroid:osmdroid-android:6.1.18")

    // WorkManager for background price checks and alerts
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}

kapt {
    correctErrorTypes = true
}