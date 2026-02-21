document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const loginToggle = document.getElementById('login-toggle');
    const registerToggle = document.getElementById('register-toggle');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');

    const API_BASE_URL = 'https://rental-marketplace-so44.onrender.com/api';

    checkInitialTab();

    function checkInitialTab() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('form') === 'register') {
            showRegister();
        } else {
            showLogin();
        }
    }

    function showLogin() {
        loginToggle.classList.add('active');
        registerToggle.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
        clearErrors();
        // Clear URL parameters to prevent showing register on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    function showRegister() {
        registerToggle.classList.add('active');
        loginToggle.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
        clearErrors();
        // Update URL to show register form
        window.history.replaceState({}, document.title, `${window.location.pathname}?form=register`);
    }

    loginToggle.addEventListener('click', function (e) {
        e.preventDefault();
        showLogin();
    });

    registerToggle.addEventListener('click', function (e) {
        e.preventDefault();
        showRegister();
    });

    switchToRegister.addEventListener('click', function (e) {
        e.preventDefault();
        showRegister();
    });

    switchToLogin.addEventListener('click', function (e) {
        e.preventDefault();
        showLogin();
    });

    function clearErrors() {
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach((msg) => (msg.textContent = ''));
    }

    function showError(inputId, message) {
        const errorElement = document.getElementById(`${inputId}-error`);
        if (errorElement) errorElement.textContent = message;
    }

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    function isValidPassword(password) {
        const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
        return re.test(password);
    }

    // LOGIN
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearErrors();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        let isValid = true;

        if (!email) {
            showError('login-email', 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('login-email', 'Please enter a valid email');
            isValid = false;
        }

        if (!password) {
            showError('login-password', 'Password is required');
            isValid = false;
        } else if (password.length < 8) {
            showError('login-password', 'Password must be at least 8 characters');
            isValid = false;
        }

        if (isValid) {
            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }

                // Store token and basic user info
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify({
                    name: data.user.name,
                    email: data.user.email,
                    id: data.user._id
                }));

                // Fetch complete user profile from database
                const profileResponse = await fetch(`${API_BASE_URL}/user/profile`, {
                    headers: {
                        'Authorization': `Bearer ${data.token}`
                    }
                });
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    localStorage.setItem('profile', JSON.stringify(profileData));
                }

                window.location.href = 'Home.html';
            } catch (error) {
                showError('login-password', error.message);
            }
        }
    });

    // REGISTER
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        clearErrors();

        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        let isValid = true;

        if (!name) {
            showError('register-name', 'Full name is required');
            isValid = false;
        }

        if (!email) {
            showError('register-email', 'Email is required');
            isValid = false;
        } else if (!isValidEmail(email)) {
            showError('register-email', 'Please enter a valid email');
            isValid = false;
        }

        if (!password) {
            showError('register-password', 'Password is required');
            isValid = false;
        } else if (!isValidPassword(password)) {
            showError(
                'register-password',
                'Password must be at least 8 characters with at least 1 letter and 1 number'
            );
            isValid = false;
        }

        if (password !== confirmPassword) {
            showError('register-confirm', 'Passwords do not match');
            isValid = false;
        }

        if (isValid) {
            const userData = {
                name,
                email,
                password
            };

            try {
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userData),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                // Automatically log in after registration
                const loginResponse = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email, password }),
                });

                const loginData = await loginResponse.json();

                if (!loginResponse.ok) {
                    throw new Error(loginData.message || 'Auto-login failed');
                }

                // Store token and basic user info
                localStorage.setItem('authToken', loginData.token);
                localStorage.setItem('user', JSON.stringify({
                    name: loginData.user.name,
                    email: loginData.user.email,
                    id: loginData.user._id
                }));

                // Redirect to home page
                window.location.href = 'Home.html';
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('already taken')) {
                    showError('register-email', error.message);
                } else {
                    showError('register-confirm', error.message);
                }
            }
        }
    });

    // Show appropriate form based on URL or default to login
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('form') === 'register') {
        showRegister();
    } else {
        showLogin();
    }
});