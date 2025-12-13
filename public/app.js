// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const loginSection = document.getElementById('login-section');
const widgetSection = document.getElementById('widget-section');
const widgetUrlInput = document.getElementById('widgetUrl');
const copyBtn = document.getElementById('copyBtn');
const copySuccess = document.getElementById('copy-success');
const previewBtn = document.getElementById('previewBtn');
const logoutBtn = document.getElementById('logoutBtn');
const errorMessage = document.getElementById('error-message');
const styleOptions = document.querySelectorAll('.style-option');

// Settings checkboxes
const showSongName = document.getElementById('showSongName');
const showArtistName = document.getElementById('showArtistName');
const showProgressBar = document.getElementById('showProgressBar');
const showSpotifyBadge = document.getElementById('showSpotifyBadge');
const showSongCover = document.getElementById('showSongCover');

// Background style controls
const backgroundStyleRadios = document.querySelectorAll('input[name="backgroundStyle"]');
const solidColorControls = document.getElementById('solid-color-controls');
const backgroundColor = document.getElementById('backgroundColor');
const backgroundOpacity = document.getElementById('backgroundOpacity');
const opacityValue = document.getElementById('opacityValue');

// Text style controls
const textColor = document.getElementById('textColor');
const enableTextShadow = document.getElementById('enableTextShadow');
const enableTextGlow = document.getElementById('enableTextGlow');
const textShadowColor = document.getElementById('textShadowColor');
const textGlowColor = document.getElementById('textGlowColor');
const textShadowControls = document.getElementById('textShadowControls');
const textGlowControls = document.getElementById('textGlowControls');

// Border controls
const enableBorder = document.getElementById('enableBorder');
const borderControls = document.getElementById('borderControls');
const borderStyleRadios = document.querySelectorAll('input[name="borderStyle"]');
const borderColor = document.getElementById('borderColor');
const borderGradientColor1 = document.getElementById('borderGradientColor1');
const borderGradientColor2 = document.getElementById('borderGradientColor2');
const borderSolidControls = document.getElementById('borderSolidControls');
const borderGradientControls = document.getElementById('borderGradientControls');

// Liquid Glass controls
const liquidGlassControls = document.getElementById('liquid-glass-controls');
const glassTint = document.getElementById('glassTint');
const glassOpacity = document.getElementById('glassOpacity');
const glassOpacityValue = document.getElementById('glassOpacityValue');
const blurAmount = document.getElementById('blurAmount');
const blurAmountValue = document.getElementById('blurAmountValue');

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    await checkAuthState();
    setupEventListeners();
});

function setupEventListeners() {
    // Login button
    loginBtn.addEventListener('click', () => {
        window.location.href = '/auth/login';
    });

    // Copy button
    copyBtn.addEventListener('click', copyWidgetUrl);

    // Preview button
    previewBtn.addEventListener('click', () => {
        const url = widgetUrlInput.value;
        if (url) {
            window.open(url, '_blank');
        }
    });

    // Logout button
    logoutBtn.addEventListener('click', logout);

    // Style options
    styleOptions.forEach(option => {
        option.addEventListener('click', () => {
            selectStyle(option.dataset.style);
        });
    });

    // Advanced settings toggle
    const advancedSettingsToggle = document.getElementById('advancedSettingsToggle');
    const advancedSettings = document.querySelector('.advanced-settings');
    if (advancedSettingsToggle && advancedSettings) {
        // Add collapsed class by default
        advancedSettings.classList.add('collapsed');

        advancedSettingsToggle.addEventListener('click', () => {
            advancedSettings.classList.toggle('collapsed');
        });
    }

    // Settings checkboxes
    if (showSongName) showSongName.addEventListener('change', handleSettingChange);
    if (showArtistName) showArtistName.addEventListener('change', handleSettingChange);
    if (showProgressBar) showProgressBar.addEventListener('change', handleSettingChange);
    if (showSpotifyBadge) showSpotifyBadge.addEventListener('change', handleSettingChange);
    if (showSongCover) showSongCover.addEventListener('change', handleSettingChange);

    // Background style controls
    if (backgroundStyleRadios.length > 0) {
        backgroundStyleRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                handleBackgroundStyleChange();
                updateBackgroundPreview();
            });
        });
    }
    if (backgroundColor) {
        backgroundColor.addEventListener('change', () => {
            handleSettingChange();
            updateBackgroundPreview();
        });
    }
    if (backgroundOpacity) {
        backgroundOpacity.addEventListener('input', () => {
            handleOpacityChange();
            updateBackgroundPreview();
        });
    }

    // Liquid Glass controls
    if (glassTint) {
        glassTint.addEventListener('input', () => {
            handleSettingChange();
            updateBackgroundPreview();
        });
    }
    if (glassOpacity) {
        glassOpacity.addEventListener('input', () => {
            if (glassOpacityValue) {
                glassOpacityValue.textContent = glassOpacity.value;
            }
            handleSettingChange();
            updateBackgroundPreview();
        });
    }
    if (blurAmount) {
        blurAmount.addEventListener('input', () => {
            if (blurAmountValue) {
                blurAmountValue.textContent = blurAmount.value;
            }
            handleSettingChange();
            updateBackgroundPreview();
        });
    }

    // Text style controls
    if (textColor) {
        textColor.addEventListener('input', () => {
            updateTextStylePreview();
            handleSettingChange();
        });
    }
    if (enableTextShadow) enableTextShadow.addEventListener('change', handleTextShadowChange);
    if (enableTextGlow) enableTextGlow.addEventListener('change', handleTextGlowChange);
    if (textShadowColor) {
        textShadowColor.addEventListener('input', () => {
            updateTextStylePreview();
            handleSettingChange();
        });
    }
    if (textGlowColor) {
        textGlowColor.addEventListener('input', () => {
            updateTextStylePreview();
            handleSettingChange();
        });
    }

    // Border controls
    if (enableBorder) enableBorder.addEventListener('change', handleBorderToggle);
    if (borderStyleRadios.length > 0) {
        borderStyleRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                handleBorderStyleChange();
                updateBorderPreview();
            });
        });
    }
    if (borderColor) {
        borderColor.addEventListener('input', () => {
            updateBorderPreview();
            handleSettingChange();
        });
    }
    if (borderGradientColor1) {
        borderGradientColor1.addEventListener('input', () => {
            updateBorderPreview();
            handleSettingChange();
        });
    }
    if (borderGradientColor2) {
        borderGradientColor2.addEventListener('input', () => {
            updateBorderPreview();
            handleSettingChange();
        });
    }

    // Accent color checkboxes
    const useAccentForBackground = document.getElementById('useAccentForBackground');
    const useAccentForGlassTint = document.getElementById('useAccentForGlassTint');
    const useAccentForText = document.getElementById('useAccentForText');
    const useAccentForShadow = document.getElementById('useAccentForShadow');
    const useAccentForGlow = document.getElementById('useAccentForGlow');
    const useAccentForBorder = document.getElementById('useAccentForBorder');
    const useAccentForGradient1 = document.getElementById('useAccentForGradient1');
    const useAccentForGradient2 = document.getElementById('useAccentForGradient2');

    if (useAccentForBackground) useAccentForBackground.addEventListener('change', () => toggleAccentColorUsage('backgroundColor', useAccentForBackground));
    if (useAccentForGlassTint) useAccentForGlassTint.addEventListener('change', () => toggleAccentColorUsage('glassTint', useAccentForGlassTint));
    if (useAccentForText) useAccentForText.addEventListener('change', () => toggleAccentColorUsage('textColor', useAccentForText));
    if (useAccentForShadow) useAccentForShadow.addEventListener('change', () => toggleAccentColorUsage('textShadowColor', useAccentForShadow));
    if (useAccentForGlow) useAccentForGlow.addEventListener('change', () => toggleAccentColorUsage('textGlowColor', useAccentForGlow));
    if (useAccentForBorder) useAccentForBorder.addEventListener('change', () => toggleAccentColorUsage('borderColor', useAccentForBorder));
    if (useAccentForGradient1) useAccentForGradient1.addEventListener('change', () => toggleAccentColorUsage('borderGradientColor1', useAccentForGradient1));
    if (useAccentForGradient2) useAccentForGradient2.addEventListener('change', () => toggleAccentColorUsage('borderGradientColor2', useAccentForGradient2));
}

function toggleAccentColorUsage(colorInputId, checkbox) {
    const isActive = checkbox.checked;

    // Disable/enable color input
    const colorInput = document.getElementById(colorInputId);
    if (colorInput) {
        if (isActive) {
            colorInput.disabled = true;
            colorInput.style.opacity = '0.5';
            colorInput.style.pointerEvents = 'none';
        } else {
            colorInput.disabled = false;
            colorInput.style.opacity = '1';
            colorInput.style.pointerEvents = 'auto';
        }
    }

    // Save state
    localStorage.setItem(`useAccentFor${colorInputId}`, isActive ? 'true' : 'false');

    handleSettingChange();

    // Update previews
    if (colorInputId === 'backgroundColor') updateBackgroundPreview();
    if (colorInputId === 'glassTint') updateBackgroundPreview();
    if (colorInputId.includes('text')) updateTextStylePreview();
    if (colorInputId.includes('border')) updateBorderPreview();
}

async function checkAuthState() {
    // Check for tokens in URL params (from OAuth callback)
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const expiresIn = urlParams.get('expires_in');
    const error = urlParams.get('error');

    // Show error if authentication failed
    if (error) {
        showError(getErrorMessage(error));
        window.history.replaceState({}, '', '/');
        return;
    }

    // Save tokens from URL if present
    if (accessToken && refreshToken) {
        saveTokens(accessToken, refreshToken, expiresIn);
        window.history.replaceState({}, '', '/');
        showWidgetSection();
    }
    // Check for existing tokens in localStorage
    else if (localStorage.getItem('access_token')) {
        // Check if token needs refreshing
        if (shouldRefreshToken()) {
            console.log('Token expired on startup, attempting refresh...');
            const refreshSuccess = await refreshAccessToken();
            if (refreshSuccess) {
                showWidgetSection();
            }
            // If refresh failed, logout() was already called
        } else {
            showWidgetSection();
        }
    }
}

function saveTokens(accessToken, refreshToken, expiresIn) {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);

    // Calculate expiration time
    const expiresAt = Date.now() + (parseInt(expiresIn) * 1000);
    localStorage.setItem('expires_at', expiresAt);
}

function isTokenExpired() {
    const expiresAt = parseInt(localStorage.getItem('expires_at'));
    if (!expiresAt) return false;
    // Consider token expired if it expires within the next 5 minutes
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return expiresAt <= fiveMinutesFromNow;
}

function shouldRefreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('access_token');
    return refreshToken && (isTokenExpired() || !accessToken);
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refresh_token');

    if (!refreshToken) {
        console.error('No refresh token available');
        logout();
        return false;
    }

    try {
        console.log('Refreshing access token...');
        const response = await fetch('/api/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Token refresh failed:', response.status, errorData);

            if (response.status === 400 || response.status === 401) {
                // Refresh token is invalid or expired
                showError('Session expired. Please login again.');
                logout();
                return false;
            }

            throw new Error(`Failed to refresh token: ${response.status}`);
        }

        const data = await response.json();

        // Save new tokens
        localStorage.setItem('access_token', data.access_token);
        if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
        }
        if (data.expires_in) {
            const expiresAt = Date.now() + (data.expires_in * 1000);
            localStorage.setItem('expires_at', expiresAt.toString());
        }

        console.log('Token refreshed successfully');
        return true;
    } catch (error) {
        console.error('Error refreshing token:', error);
        showError('Failed to refresh session. Please login again.');
        logout();
        return false;
    }
}

function showWidgetSection() {
    loginSection.style.display = 'none';
    widgetSection.style.display = 'block';

    // Initialize selected style
    const selectedStyle = localStorage.getItem('selectedStyle') || 'horizontal';
    selectStyle(selectedStyle);

    // Set up periodic token refresh check (every 10 minutes)
    setInterval(async () => {
        if (shouldRefreshToken()) {
            console.log('Periodic token refresh check - refreshing...');
            await refreshAccessToken();
        }
    }, 10 * 60 * 1000); // Check every 10 minutes

    // Load saved settings
    if (showSongName) {
        showSongName.checked = localStorage.getItem('showSongName') !== 'false';
        showArtistName.checked = localStorage.getItem('showArtistName') !== 'false';
        showProgressBar.checked = localStorage.getItem('showProgressBar') !== 'false';
        showSpotifyBadge.checked = localStorage.getItem('showSpotifyBadge') !== 'false';
        showSongCover.checked = localStorage.getItem('showSongCover') !== 'false';
    }

    // Load background settings
    const savedBackgroundStyle = localStorage.getItem('backgroundStyle') || 'liquid-glass';
    if (backgroundStyleRadios.length > 0) {
        backgroundStyleRadios.forEach(radio => {
            if (radio.value === savedBackgroundStyle) {
                radio.checked = true;
            }
        });
    }

    if (backgroundColor) {
        const savedColor = localStorage.getItem('backgroundColor');
        if (savedColor) backgroundColor.value = savedColor;
    }

    if (backgroundOpacity) {
        const savedOpacity = localStorage.getItem('backgroundOpacity');
        if (savedOpacity) {
            const opacityPercent = Math.round(parseFloat(savedOpacity) * 100);
            backgroundOpacity.value = opacityPercent;
            if (opacityValue) opacityValue.textContent = opacityPercent;
        }
    }

    // Load liquid glass settings
    if (glassTint) {
        const savedGlassTint = localStorage.getItem('glassTint');
        if (savedGlassTint) glassTint.value = savedGlassTint;
    }
    if (glassOpacity) {
        const savedGlassOpacity = localStorage.getItem('glassOpacity');
        if (savedGlassOpacity) {
            const opacityPercent = Math.round(parseFloat(savedGlassOpacity) * 100);
            glassOpacity.value = opacityPercent;
            if (glassOpacityValue) glassOpacityValue.textContent = opacityPercent;
        }
    }
    if (blurAmount) {
        const savedBlurAmount = localStorage.getItem('blurAmount');
        if (savedBlurAmount) {
            blurAmount.value = savedBlurAmount;
            if (blurAmountValue) blurAmountValue.textContent = savedBlurAmount;
        }
    }

    // Trigger background style change to show/hide controls
    if (backgroundStyleRadios.length > 0) {
        handleBackgroundStyleChange();
    }

    // Load text style settings
    if (textColor) {
        const savedTextColor = localStorage.getItem('textColor');
        if (savedTextColor) textColor.value = savedTextColor;
    }
    if (enableTextShadow) {
        enableTextShadow.checked = localStorage.getItem('enableTextShadow') === 'true';
        handleTextShadowChange();
    }
    if (enableTextGlow) {
        enableTextGlow.checked = localStorage.getItem('enableTextGlow') === 'true';
        handleTextGlowChange();
    }
    if (textShadowColor) {
        const savedShadowColor = localStorage.getItem('textShadowColor');
        if (savedShadowColor) textShadowColor.value = savedShadowColor;
    }
    if (textGlowColor) {
        const savedGlowColor = localStorage.getItem('textGlowColor');
        if (savedGlowColor) textGlowColor.value = savedGlowColor;
    }

    // Load border settings
    if (enableBorder) {
        enableBorder.checked = localStorage.getItem('enableBorder') === 'true';
        handleBorderToggle();
    }
    const savedBorderStyle = localStorage.getItem('borderStyle') || 'solid';
    if (borderStyleRadios.length > 0) {
        borderStyleRadios.forEach(radio => {
            if (radio.value === savedBorderStyle) {
                radio.checked = true;
            }
        });
        handleBorderStyleChange();
    }
    if (borderColor) {
        const savedBorderColor = localStorage.getItem('borderColor');
        if (savedBorderColor) borderColor.value = savedBorderColor;
    }
    if (borderGradientColor1) {
        const savedGrad1 = localStorage.getItem('borderGradientColor1');
        if (savedGrad1) borderGradientColor1.value = savedGrad1;
    }
    if (borderGradientColor2) {
        const savedGrad2 = localStorage.getItem('borderGradientColor2');
        if (savedGrad2) borderGradientColor2.value = savedGrad2;
    }

    // Load accent color toggle states
    loadAccentColorToggleStates();

    // Generate and display widget URL
    const accessToken = localStorage.getItem('access_token');
    if (accessToken) {
        const widgetUrl = generateWidgetUrl(accessToken);
        widgetUrlInput.value = widgetUrl;
    }

    // Initialize previews
    updateBackgroundPreview();
    updateTextStylePreview();
    updateBorderPreview();
}

function loadAccentColorToggleStates() {
    const accentCheckboxes = [
        { id: 'useAccentForBackground', inputId: 'backgroundColor' },
        { id: 'useAccentForGlassTint', inputId: 'glassTint' },
        { id: 'useAccentForText', inputId: 'textColor' },
        { id: 'useAccentForShadow', inputId: 'textShadowColor' },
        { id: 'useAccentForGlow', inputId: 'textGlowColor' },
        { id: 'useAccentForBorder', inputId: 'borderColor' },
        { id: 'useAccentForGradient1', inputId: 'borderGradientColor1' },
        { id: 'useAccentForGradient2', inputId: 'borderGradientColor2' }
    ];

    accentCheckboxes.forEach(({ id, inputId }) => {
        const checkbox = document.getElementById(id);
        const colorInput = document.getElementById(inputId);

        // Get saved state or use default (checkbox's current state)
        const savedState = localStorage.getItem(`useAccentFor${inputId}`);
        const isActive = savedState !== null ? savedState === 'true' : checkbox?.checked;

        if (checkbox && colorInput) {
            checkbox.checked = isActive;
            if (isActive) {
                colorInput.disabled = true;
                colorInput.style.opacity = '0.5';
                colorInput.style.pointerEvents = 'none';
            } else {
                colorInput.disabled = false;
                colorInput.style.opacity = '1';
                colorInput.style.pointerEvents = 'auto';
            }
        }
    });
}

function generateWidgetUrl(accessToken) {
    const baseUrl = window.location.origin;
    const selectedStyle = localStorage.getItem('selectedStyle') || 'default';
    const settings = getSettings();

    // Get refresh token from localStorage
    const refreshToken = localStorage.getItem('refresh_token');

    let url = `${baseUrl}/widget.html?token=${encodeURIComponent(accessToken)}&style=${encodeURIComponent(selectedStyle)}`;

    // Include refresh token if available (needed for OBS where localStorage isn't accessible)
    if (refreshToken) {
        url += `&refresh_token=${encodeURIComponent(refreshToken)}`;
    }

    // Add settings as URL parameters
    Object.keys(settings).forEach(key => {
        url += `&${key}=${encodeURIComponent(settings[key])}`;
    });

    return url;
}

function getSettings() {
    if (!showSongName) return {};

    const settings = {
        showSongName: showSongName.checked ? 'true' : 'false',
        showArtistName: showArtistName.checked ? 'true' : 'false',
        showProgressBar: showProgressBar.checked ? 'true' : 'false',
        showSpotifyBadge: showSpotifyBadge.checked ? 'true' : 'false',
        showSongCover: showSongCover.checked ? 'true' : 'false'
    };

    // Add background settings
    if (backgroundStyleRadios.length > 0) {
        const selectedBackground = document.querySelector('input[name="backgroundStyle"]:checked');
        if (selectedBackground) {
            settings.backgroundStyle = selectedBackground.value;

            if (selectedBackground.value === 'solid' && backgroundColor && backgroundOpacity) {
                const opacity = parseInt(backgroundOpacity.value) / 100;
                settings.backgroundColor = backgroundColor.value;
                settings.backgroundOpacity = opacity.toString();
            } else if (selectedBackground.value === 'liquid-glass') {
                if (glassTint) settings.glassTint = glassTint.value;
                if (glassOpacity) {
                    const opacity = parseInt(glassOpacity.value) / 100;
                    settings.glassOpacity = opacity.toString();
                }
                if (blurAmount) settings.blurAmount = blurAmount.value;
            }
        }
    }

    // Add text style settings
    if (textColor) settings.textColor = textColor.value;
    if (enableTextShadow) settings.enableTextShadow = enableTextShadow.checked ? 'true' : 'false';
    if (enableTextGlow) settings.enableTextGlow = enableTextGlow.checked ? 'true' : 'false';
    if (textShadowColor) settings.textShadowColor = textShadowColor.value;
    if (textGlowColor) settings.textGlowColor = textGlowColor.value;

    // Add border settings
    if (enableBorder) settings.enableBorder = enableBorder.checked ? 'true' : 'false';
    if (borderStyleRadios.length > 0) {
        const selectedBorderStyle = document.querySelector('input[name="borderStyle"]:checked');
        if (selectedBorderStyle) {
            settings.borderStyle = selectedBorderStyle.value;
            if (selectedBorderStyle.value === 'solid' && borderColor) {
                settings.borderColor = borderColor.value;
            } else if (selectedBorderStyle.value === 'gradient' && borderGradientColor1 && borderGradientColor2) {
                settings.borderGradientColor1 = borderGradientColor1.value;
                settings.borderGradientColor2 = borderGradientColor2.value;
            }
        }
    }

    // Add accent color flags
    settings.useAccentForBackground = document.getElementById('useAccentForBackground')?.checked ? 'true' : 'false';
    settings.useAccentForGlassTint = document.getElementById('useAccentForGlassTint')?.checked ? 'true' : 'false';
    settings.useAccentForText = document.getElementById('useAccentForText')?.checked ? 'true' : 'false';
    settings.useAccentForShadow = document.getElementById('useAccentForShadow')?.checked ? 'true' : 'false';
    settings.useAccentForGlow = document.getElementById('useAccentForGlow')?.checked ? 'true' : 'false';
    settings.useAccentForBorder = document.getElementById('useAccentForBorder')?.checked ? 'true' : 'false';
    settings.useAccentForGradient1 = document.getElementById('useAccentForGradient1')?.checked ? 'true' : 'false';
    settings.useAccentForGradient2 = document.getElementById('useAccentForGradient2')?.checked ? 'true' : 'false';

    return settings;
}

function handleSettingChange() {
    // Update widget URL when settings change
    const accessToken = localStorage.getItem('access_token');
    if (accessToken && widgetUrlInput) {
        const widgetUrl = generateWidgetUrl(accessToken);
        widgetUrlInput.value = widgetUrl;
    }

    // Save settings to localStorage
    if (showSongName) {
        const settings = getSettings();
        Object.keys(settings).forEach(key => {
            localStorage.setItem(key, settings[key]);
        });
    }
}

function handleBackgroundStyleChange() {
    // Show/hide solid color and liquid glass controls
    const selectedBackground = document.querySelector('input[name="backgroundStyle"]:checked');
    if (selectedBackground) {
        if (solidColorControls) {
            solidColorControls.style.display = selectedBackground.value === 'solid' ? 'block' : 'none';
        }
        if (liquidGlassControls) {
            liquidGlassControls.style.display = selectedBackground.value === 'liquid-glass' ? 'block' : 'none';
        }
    }

    handleSettingChange();
}

function handleOpacityChange() {
    if (opacityValue && backgroundOpacity) {
        opacityValue.textContent = backgroundOpacity.value;
    }
    handleSettingChange();
}

function handleBorderStyleChange() {
    const selectedBorderStyle = document.querySelector('input[name="borderStyle"]:checked');
    if (selectedBorderStyle && borderSolidControls && borderGradientControls) {
        borderSolidControls.style.display = selectedBorderStyle.value === 'solid' ? 'block' : 'none';
        borderGradientControls.style.display = selectedBorderStyle.value === 'gradient' ? 'block' : 'none';
    }
    handleSettingChange();
    updateBorderPreview();
}

function handleTextShadowChange() {
    if (textShadowControls && enableTextShadow) {
        textShadowControls.style.display = enableTextShadow.checked ? 'block' : 'none';
    }
    handleSettingChange();
    updateTextStylePreview();
}

function handleTextGlowChange() {
    if (textGlowControls && enableTextGlow) {
        textGlowControls.style.display = enableTextGlow.checked ? 'block' : 'none';
    }
    handleSettingChange();
    updateTextStylePreview();
}

function handleBorderToggle() {
    if (borderControls && enableBorder) {
        borderControls.style.display = enableBorder.checked ? 'block' : 'none';
    }
    handleSettingChange();
    updateBorderPreview();
}

// Preview Update Functions
function updateBackgroundPreview() {
    const preview = document.querySelector('.background-preview');
    if (!preview) return;

    const selectedBackground = document.querySelector('input[name="backgroundStyle"]:checked');
    if (!selectedBackground) return;

    if (selectedBackground.value === 'transparent') {
        preview.style.background = 'transparent';
        preview.style.backdropFilter = 'none';
    } else if (selectedBackground.value === 'solid' && backgroundColor && backgroundOpacity) {
        const bgColor = backgroundColor.value;
        const opacity = parseInt(backgroundOpacity.value) / 100;

        // Convert hex to rgba
        const hex = bgColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        preview.style.background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        preview.style.backdropFilter = 'none';
    } else if (selectedBackground.value === 'liquid-glass') {
        const glassTintColor = glassTint ? glassTint.value : '#ffffff';
        const glassTintOpacity = glassOpacity ? parseInt(glassOpacity.value) / 100 : 0.3;
        const blur = blurAmount ? blurAmount.value : 40;

        // Convert hex to rgba for the tint
        const hex = glassTintColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Apply the actual tint opacity
        preview.style.background = `rgba(${r}, ${g}, ${b}, ${glassTintOpacity})`;
        preview.style.backdropFilter = `blur(${blur}px)`;
        preview.style.boxShadow = `
            inset 0 1px 2px rgba(255, 255, 255, 0.3),
            inset 0 -1px 2px rgba(0, 0, 0, 0.2)
        `;
    }
}

function updateTextStylePreview() {
    const preview = document.getElementById('textStylePreview');
    if (!preview) return;

    const textElements = preview.querySelectorAll('p');
    if (!textElements.length) return;

    // Apply text color
    const currentTextColor = textColor ? textColor.value : '#ffffff';
    textElements.forEach(el => {
        el.style.color = currentTextColor;
    });

    // Apply text shadow
    const enableShadow = enableTextShadow ? enableTextShadow.checked : false;
    const shadowColor = textShadowColor ? textShadowColor.value : '#000000';
    const shadowStyle = enableShadow ? `2px 2px 4px ${shadowColor}` : 'none';

    // Apply text glow
    const enableGlow = enableTextGlow ? enableTextGlow.checked : false;
    const glowColor = textGlowColor ? textGlowColor.value : '#1DB954';

    let finalTextShadow = shadowStyle;

    if (enableGlow) {
        const glowStyle = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 30px ${glowColor}`;
        finalTextShadow = shadowStyle !== 'none' ? `${shadowStyle}, ${glowStyle}` : glowStyle;
    }

    textElements.forEach(el => {
        el.style.textShadow = finalTextShadow;
    });
}

function updateBorderPreview() {
    const preview = document.getElementById('borderPreview');
    if (!preview) return;

    const isEnabled = enableBorder ? enableBorder.checked : false;

    if (isEnabled) {
        const selectedBorderStyle = document.querySelector('input[name="borderStyle"]:checked');
        if (selectedBorderStyle) {
            if (selectedBorderStyle.value === 'solid' && borderColor) {
                preview.style.border = `3px solid ${borderColor.value}`;
                preview.style.borderImage = 'none';
            } else if (selectedBorderStyle.value === 'gradient' && borderGradientColor1 && borderGradientColor2) {
                preview.style.border = '3px solid transparent';
                preview.style.borderImage = `linear-gradient(45deg, ${borderGradientColor1.value}, ${borderGradientColor2.value}) 1`;
            }
        }
    } else {
        preview.style.border = 'none';
        preview.style.borderImage = 'none';
    }
}

function selectStyle(style) {
    // Remove active class from all options
    styleOptions.forEach(option => option.classList.remove('active'));

    // Add active class to selected option
    const selectedOption = document.querySelector(`[data-style="${style}"]`);
    if (selectedOption) {
        selectedOption.classList.add('active');
    }

    // Save selected style
    localStorage.setItem('selectedStyle', style);

    // Update widget URL if it exists
    const accessToken = localStorage.getItem('access_token');
    if (accessToken && widgetUrlInput) {
        const widgetUrl = generateWidgetUrl(accessToken);
        widgetUrlInput.value = widgetUrl;
    }
}

function copyWidgetUrl() {
    widgetUrlInput.select();
    widgetUrlInput.setSelectionRange(0, 99999); // For mobile devices

    navigator.clipboard.writeText(widgetUrlInput.value).then(() => {
        // Show success message
        copySuccess.style.display = 'block';
        copyBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Copied!
        `;

        setTimeout(() => {
            copySuccess.style.display = 'none';
            copyBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                Copy
            `;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        showError('Failed to copy URL. Please copy manually.');
    });
}

function logout() {
    if (confirm('Are you sure you want to disconnect Spotify?')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('expires_at');

        // Reload to show login page
        window.location.reload();
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';

    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function getErrorMessage(errorCode) {
    const errorMessages = {
        'authentication_failed': 'Authentication failed. Please try again.',
        'token_exchange_failed': 'Failed to complete authentication. Please try again.',
        'access_denied': 'Access denied. Please grant the required permissions.'
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}
