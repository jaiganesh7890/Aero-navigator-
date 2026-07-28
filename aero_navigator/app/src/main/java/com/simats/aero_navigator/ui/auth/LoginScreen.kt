package com.simats.aero_navigator.ui.auth

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.R

// ─── Validation helpers ───────────────────────────────────────────────────────

fun isValidEmail(email: String): Boolean =
    android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()

fun isValidPassword(password: String): Boolean = password.length >= 6

fun emailError(email: String, touched: Boolean): String? = when {
    !touched -> null
    email.isBlank() -> "Email is required"
    !isValidEmail(email) -> "Enter a valid email address"
    else -> null
}

fun passwordError(password: String, touched: Boolean): String? = when {
    !touched -> null
    password.isBlank() -> "Password is required"
    password.length < 6 -> "Password must be at least 6 characters"
    else -> null
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

@Composable
fun authFieldColors(isError: Boolean = false) = OutlinedTextFieldDefaults.colors(
    focusedBorderColor   = if (isError) MaterialTheme.colorScheme.error else Color(0xFF64B5F6),
    unfocusedBorderColor = if (isError) MaterialTheme.colorScheme.error
                           else Color.White.copy(alpha = 0.3f),
    focusedLabelColor    = if (isError) MaterialTheme.colorScheme.error else Color(0xFF64B5F6),
    focusedLeadingIconColor   = Color.White,
    unfocusedLeadingIconColor = Color.White.copy(alpha = 0.7f),
    cursorColor          = Color(0xFF64B5F6),
    focusedTextColor     = Color.White,
    unfocusedTextColor   = Color.White,
    unfocusedContainerColor = Color.Transparent,
    focusedContainerColor   = Color.Transparent,
    unfocusedPlaceholderColor = Color.White.copy(alpha = 0.5f),
    focusedPlaceholderColor = Color.White.copy(alpha = 0.5f)
)

@Composable
fun FieldError(message: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 4.dp, top = 4.dp)) {
        Icon(Icons.Default.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(13.dp))
        Spacer(Modifier.width(4.dp))
        Text(message, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
    }
}

@Composable
fun FieldSuccess(message: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(start = 4.dp, top = 4.dp)) {
        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF10B981), modifier = Modifier.size(13.dp))
        Spacer(Modifier.width(4.dp))
        Text(message, color = Color(0xFF10B981), fontSize = 12.sp)
    }
}

@Composable
fun ServerErrorBanner(message: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.error.copy(alpha = 0.10f), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(Icons.Default.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(10.dp))
        Text(message, color = MaterialTheme.colorScheme.error, fontSize = 13.sp, lineHeight = 18.sp)
    }
}

@Composable
fun PasswordVisibilityToggle(visible: Boolean, onClick: () -> Unit) {
    IconButton(
        onClick = onClick,
        modifier = Modifier.size(48.dp)
    ) {
        Icon(
            imageVector = if (visible) Icons.Default.Face else Icons.Default.Lock,
            contentDescription = if (visible) "Hide password" else "Show password",
            tint = Color.White.copy(alpha = 0.7f)
        )
    }
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

@Composable
fun LoginScreen(
    onNavigateToSignup: () -> Unit,
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val focusManager = LocalFocusManager.current
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var emailTouched by remember { mutableStateOf(false) }
    var passwordTouched by remember { mutableStateOf(false) }

    val emailErr = emailError(email, emailTouched)
    val passwordErr = passwordError(password, passwordTouched)
    val formValid = isValidEmail(email) && isValidPassword(password)
    val authState by viewModel.authState.collectAsState()

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) { onLoginSuccess(); viewModel.clearState() }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF070B19))
    ) {
        // Background Image
        Image(
            painter = painterResource(id = R.drawable.login_bg),
            contentDescription = "Background",
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        // Overlay gradient for better readability
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0xFF0F172A).copy(alpha = 0.8f),
                            Color(0xFF0F172A).copy(alpha = 0.95f)
                        ),
                        startY = 0f,
                        endY = 2000f
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(60.dp))

            // Logo
            Box(
                modifier = Modifier.size(80.dp),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.foundation.Image(
                    painter = androidx.compose.ui.res.painterResource(id = R.drawable.app_logo),
                    contentDescription = "Aero Navigator Logo",
                    modifier = Modifier.fillMaxSize().clip(CircleShape)
                )
            }
            
            Text(
                text = "INTELLIGENT",
                color = Color.White,
                fontSize = 14.sp,
                letterSpacing = 4.sp,
                modifier = Modifier.padding(top = 16.dp)
            )
            Text(
                text = "AERO NAVIGATOR",
                color = Color(0xFF64B5F6),
                fontSize = 22.sp,
                letterSpacing = 2.sp,
                fontWeight = FontWeight.Bold,
            )
            
            Row(
                modifier = Modifier.padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(modifier = Modifier.width(30.dp).height(1.dp).background(Color.White.copy(alpha=0.5f)))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Navigate Smarter. Fly Further.",
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 12.sp,
                )
                Spacer(modifier = Modifier.width(8.dp))
                Box(modifier = Modifier.width(30.dp).height(1.dp).background(Color.White.copy(alpha=0.5f)))
            }

            Spacer(modifier = Modifier.height(40.dp))

            // Glassmorphic Form Container
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color(0xFF0A152F).copy(alpha = 0.6f))
                    .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(24.dp))
                    .padding(24.dp)
            ) {
                Column {
                    Text(
                        text = "Welcome Back",
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Sign in to continue your journey",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 4.dp, bottom = 24.dp)
                    )

                    // Email field
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; emailTouched = true },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Email or Username", color = Color.White.copy(alpha = 0.5f)) },
                        leadingIcon = { Icon(Icons.Default.Person, null, tint = Color.White.copy(alpha = 0.7f)) },
                        isError = emailErr != null,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = authFieldColors(emailErr != null)
                    )
                    if (emailErr != null) FieldError(emailErr)

                    Spacer(modifier = Modifier.height(16.dp))

                    // Password field
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; passwordTouched = true },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Password", color = Color.White.copy(alpha = 0.5f)) },
                        leadingIcon = { Icon(Icons.Default.Lock, null, tint = Color.White.copy(alpha = 0.7f)) },
                        trailingIcon = { PasswordVisibilityToggle(passwordVisible) { passwordVisible = !passwordVisible } },
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        isError = passwordErr != null,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = {
                            emailTouched = true; passwordTouched = true
                            focusManager.clearFocus()
                            if (formValid) viewModel.login(email, password)
                        }),
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = authFieldColors(passwordErr != null)
                    )
                    if (passwordErr != null) FieldError(passwordErr)

                    // Forgot Password
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
                        TextButton(onClick = { /* TODO */ }, contentPadding = PaddingValues(0.dp)) {
                            Text("Forgot Password?", color = Color(0xFF64B5F6), fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    if (authState is AuthState.Error) {
                        ServerErrorBanner((authState as AuthState.Error).message)
                        Spacer(modifier = Modifier.height(16.dp))
                    }

                    // Sign In Button
                    if (authState is AuthState.Loading) {
                        Box(Modifier.fillMaxWidth().height(50.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color(0xFF64B5F6), strokeWidth = 3.dp)
                        }
                    } else {
                        Button(
                            onClick = {
                                emailTouched = true; passwordTouched = true
                                if (formValid) viewModel.login(email, password)
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Transparent
                            ),
                            contentPadding = PaddingValues()
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.horizontalGradient(
                                            colors = listOf(Color(0xFF42A5F5), Color(0xFF1E88E5))
                                        )
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Sign In", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }



                    // Sign Up link
                    Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(
                            text = buildAnnotatedString {
                                withStyle(SpanStyle(color = Color.White.copy(alpha = 0.7f))) { append("Don't have an account?  ") }
                                withStyle(SpanStyle(color = Color(0xFF64B5F6), fontWeight = FontWeight.Bold)) { append("Sign Up") }
                            },
                            modifier = Modifier.clickable { onNavigateToSignup() },
                            fontSize = 14.sp
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
