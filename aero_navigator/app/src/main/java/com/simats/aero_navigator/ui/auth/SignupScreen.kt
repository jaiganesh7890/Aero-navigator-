package com.simats.aero_navigator.ui.auth

import androidx.compose.animation.core.*
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.simats.aero_navigator.ui.theme.PremiumPrimary
import com.simats.aero_navigator.ui.theme.PremiumSecondary
import com.simats.aero_navigator.ui.theme.SuccessGreen

// ─── Password strength ────────────────────────────────────────────────────────

private enum class PwdStrength(val label: String, val color: Color, val ordinal2: Int) {
    EMPTY("", Color.Transparent, 0),
    WEAK("Weak", Color(0xFFEF4444), 1),
    FAIR("Fair", Color(0xFFF59E0B), 2),
    GOOD("Good", Color(0xFF10B981), 3),
    STRONG("Strong", Color(0xFF22C55E), 4)
}

private fun calcStrength(pwd: String): PwdStrength {
    if (pwd.isEmpty()) return PwdStrength.EMPTY
    var score = 0
    if (pwd.length >= 8) score++
    if (pwd.any { it.isUpperCase() }) score++
    if (pwd.any { it.isDigit() }) score++
    if (pwd.any { !it.isLetterOrDigit() }) score++
    return when (score) {
        0, 1 -> PwdStrength.WEAK
        2 -> PwdStrength.FAIR
        3 -> PwdStrength.GOOD
        else -> PwdStrength.STRONG
    }
}

private fun nameError(name: String, touched: Boolean): String? = when {
    !touched -> null
    name.isBlank() -> "Full name is required"
    name.trim().length < 2 -> "Name must be at least 2 characters"
    !name.trim().contains(" ") -> "Please enter first and last name"
    else -> null
}

private fun signupEmailError(email: String, touched: Boolean): String? = when {
    !touched -> null
    email.isBlank() -> "Email is required"
    !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches() -> "Enter a valid email address"
    else -> null
}

private fun signupPasswordError(password: String, touched: Boolean): String? = when {
    !touched -> null
    password.isBlank() -> "Password is required"
    password.length < 6 -> "Password must be at least 6 characters"
    else -> null
}

// ─── Signup Screen ────────────────────────────────────────────────────────────

@Composable
fun SignupScreen(
    onNavigateToLogin: () -> Unit,
    onSignupSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel()
) {
    val focusManager = LocalFocusManager.current
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var termsAccepted by remember { mutableStateOf(false) }

    var nameTouched by remember { mutableStateOf(false) }
    var emailTouched by remember { mutableStateOf(false) }
    var passwordTouched by remember { mutableStateOf(false) }
    var termsTouched by remember { mutableStateOf(false) }

    val nameErr = nameError(name, nameTouched)
    val emailErr = signupEmailError(email, emailTouched)
    val passwordErr = signupPasswordError(password, passwordTouched)
    val strength = calcStrength(password)

    val formValid = nameErr == null && emailErr == null && passwordErr == null
        && name.isNotBlank() && email.isNotBlank() && password.isNotBlank()
        && termsAccepted

    val authState by viewModel.authState.collectAsState()

    val infiniteTransition = rememberInfiniteTransition(label = "plane")
    val planeAngle by infiniteTransition.animateFloat(
        initialValue = -6f, targetValue = 6f,
        animationSpec = infiniteRepeatable(tween(2200, easing = EaseInOut), RepeatMode.Reverse),
        label = "plane"
    )

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) { onSignupSuccess(); viewModel.clearState() }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // Subtle top glow — purple for signup
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(Brush.verticalGradient(listOf(PremiumSecondary.copy(alpha = 0.10f), Color.Transparent)))
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(44.dp))

            // Brand logo circle
            Box(
                modifier = Modifier
                    .size(84.dp)
                    .background(Color.Transparent, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.foundation.Image(
                    painter = androidx.compose.ui.res.painterResource(id = com.simats.aero_navigator.R.drawable.app_logo),
                    contentDescription = "Aero Navigator Logo",
                    modifier = Modifier.fillMaxSize().clip(CircleShape)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text("Create Account", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onBackground)
            Spacer(modifier = Modifier.height(6.dp))
            Text("Join Aero-Navigator for AI-powered flight intelligence", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = TextAlign.Center)

            Spacer(modifier = Modifier.height(32.dp))

            // ── Full Name ──
            OutlinedTextField(
                value = name,
                onValueChange = { name = it; nameTouched = true },
                modifier = Modifier.fillMaxWidth().height(62.dp),
                label = { Text("Full Name") },
                leadingIcon = { Icon(Icons.Default.Person, null) },
                isError = nameErr != null,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words, imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = authFieldColors(nameErr != null)
            )
            if (nameErr != null) FieldError(nameErr)
            else if (nameTouched && name.isNotBlank()) FieldSuccess("Looks good!")

            Spacer(modifier = Modifier.height(16.dp))

            // ── Email ──
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; emailTouched = true },
                modifier = Modifier.fillMaxWidth().height(62.dp),
                label = { Text("Email Address") },
                leadingIcon = { Icon(Icons.Default.Email, null) },
                isError = emailErr != null,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = authFieldColors(emailErr != null)
            )
            if (emailErr != null) FieldError(emailErr)
            else if (emailTouched && email.isNotBlank()) FieldSuccess("Valid email address")

            Spacer(modifier = Modifier.height(16.dp))

            // ── Password ──
            OutlinedTextField(
                value = password,
                onValueChange = { password = it; passwordTouched = true },
                modifier = Modifier.fillMaxWidth().height(62.dp),
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, null) },
                trailingIcon = { PasswordVisibilityToggle(passwordVisible) { passwordVisible = !passwordVisible } },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                isError = passwordErr != null,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = {
                    nameTouched = true; emailTouched = true; passwordTouched = true; termsTouched = true
                    focusManager.clearFocus()
                    if (formValid) viewModel.signup(name, email, password)
                }),
                singleLine = true,
                shape = RoundedCornerShape(14.dp),
                colors = authFieldColors(passwordErr != null)
            )
            if (passwordErr != null) FieldError(passwordErr)

            // ── Password strength indicator ──
            if (password.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    listOf(PwdStrength.WEAK, PwdStrength.FAIR, PwdStrength.GOOD, PwdStrength.STRONG).forEachIndexed { i, level ->
                        val filled = strength.ordinal2 > i
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(if (filled) strength.color else MaterialTheme.colorScheme.surfaceVariant)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        strength.label,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = strength.color,
                        modifier = Modifier.widthIn(min = 44.dp)
                    )
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Strong: 8+ chars, uppercase, number & symbol",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── Terms & Conditions ──
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (termsTouched && !termsAccepted)
                            MaterialTheme.colorScheme.error.copy(alpha = 0.05f)
                        else
                            MaterialTheme.colorScheme.surface
                    )
                    .clickable { termsAccepted = !termsAccepted; termsTouched = true }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Checkbox(
                    checked = termsAccepted,
                    onCheckedChange = { termsAccepted = it; termsTouched = true },
                    colors = CheckboxDefaults.colors(
                        checkedColor = PremiumPrimary,
                        uncheckedColor = if (termsTouched && !termsAccepted)
                            MaterialTheme.colorScheme.error
                        else
                            MaterialTheme.colorScheme.onSurfaceVariant.copy(0.5f)
                    )
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = buildAnnotatedString {
                        withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)) { append("I agree to the ") }
                        withStyle(SpanStyle(color = PremiumPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)) { append("Terms of Service") }
                        withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)) { append(" and ") }
                        withStyle(SpanStyle(color = PremiumPrimary, fontWeight = FontWeight.Bold, fontSize = 13.sp)) { append("Privacy Policy") }
                    }
                )
            }
            if (termsTouched && !termsAccepted) {
                Spacer(Modifier.height(4.dp))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Spacer(Modifier.width(4.dp))
                    Icon(Icons.Default.Warning, null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(13.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("You must accept the terms to continue", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // ── Server error ──
            if (authState is AuthState.Error) {
                ServerErrorBanner((authState as AuthState.Error).message)
                Spacer(modifier = Modifier.height(16.dp))
            }

            // ── Create Account button ──
            if (authState is AuthState.Loading) {
                Box(Modifier.fillMaxWidth().height(56.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = PremiumPrimary, strokeWidth = 3.dp)
                }
            } else {
                Button(
                    onClick = {
                        nameTouched = true; emailTouched = true; passwordTouched = true; termsTouched = true
                        if (formValid) viewModel.signup(name, email, password)
                    },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = PremiumPrimary,
                        disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant
                    )
                ) {
                    Text("Create Account", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.background)
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Log in link ──
            Text(
                text = buildAnnotatedString {
                    withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) { append("Already have an account?  ") }
                    withStyle(SpanStyle(color = PremiumPrimary, fontWeight = FontWeight.Bold)) { append("Log In") }
                },
                modifier = Modifier.clickable { onNavigateToLogin() },
                fontSize = 14.sp
            )

            Spacer(modifier = Modifier.height(40.dp))
        }
    }
}
