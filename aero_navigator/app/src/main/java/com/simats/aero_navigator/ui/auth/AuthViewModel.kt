package com.simats.aero_navigator.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.simats.aero_navigator.data.remote.AuthResponse
import com.simats.aero_navigator.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val user: AuthResponse) : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            repository.login(email, password).collect { result ->
                result.fold(
                    onSuccess = { user ->
                        _authState.value = AuthState.Success(user)
                    },
                    onFailure = { error ->
                        _authState.value = AuthState.Error(error.message ?: "Authentication failed")
                    }
                )
            }
        }
    }

    fun signup(name: String, email: String, password: String) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            repository.signup(name, email, password).collect { result ->
                result.fold(
                    onSuccess = { user ->
                        _authState.value = AuthState.Success(user)
                    },
                    onFailure = { error ->
                        _authState.value = AuthState.Error(error.message ?: "Registration failed")
                    }
                )
            }
        }
    }

    fun updateProfile(name: String, password: String?) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            repository.updateProfile(name, password).collect { result ->
                result.fold(
                    onSuccess = { user ->
                        _authState.value = AuthState.Success(user)
                    },
                    onFailure = { error ->
                        _authState.value = AuthState.Error(error.message ?: "Profile update failed")
                    }
                )
            }
        }
    }

    fun logout() {
        repository.logout()
        _authState.value = AuthState.Idle
    }

    fun isLoggedIn(): Boolean {
        return repository.getToken() != null
    }

    fun getCurrentUser() = repository.getCurrentUser()

    fun clearState() {
        _authState.value = AuthState.Idle
    }
}
