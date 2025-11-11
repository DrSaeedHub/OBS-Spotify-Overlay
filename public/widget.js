// DOM Elements
const widgetContainer = document.querySelector('.widget-container');
const widgetContent = document.getElementById('widget-content');
const loading = document.getElementById('loading');
const trackDisplay = document.getElementById('track-display');
const notPlaying = document.getElementById('not-playing');
const errorDisplay = document.getElementById('error-display');
const errorMessage = document.getElementById('error-message');

// Track display elements
const albumCover = document.getElementById('album-cover');
const trackName = document.getElementById('track-name');
const trackArtist = document.getElementById('track-artist');
const trackAlbum = document.getElementById('track-album');

// Progress bar elements
const currentTimeElement = document.getElementById('current-time');
const totalTimeElement = document.getElementById('total-time');
const progressFill = document.getElementById('progress-fill');

// State
let refreshInterval;
let progressInterval;
let nearEndTimeout = null;
let nearEndInterval = null;
let currentTrackData = null;
let accessToken = null;
let refreshToken = null;
let tokenExpiresAt = null;
let trackStartTime = null;
let trackDuration = null;
let trackProgress = null;
let currentAccentColor = null;
let colorThief = null;
let isRefreshingToken = false;
let notPlayingTimeout = null;
let overlayIdleState = 'playing'; // 'playing' | 'idleVisible' | 'idleHidden' | 'error'
let lastProgressValue = null;
let stagnantProgressCount = 0;

// Initialize
window.addEventListener('DOMContentLoaded', async () => {
    getAccessToken();
    applyStyle();
    applySettings();

    // Ensure we have refresh_token - check URL as fallback if not in localStorage
    if (!refreshToken) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRefreshToken = urlParams.get('refresh_token');
        if (urlRefreshToken) {
            refreshToken = urlRefreshToken;
            console.log('Using refresh_token from URL parameters');

            // Try to save URL refresh_token to localStorage for future use
            try {
                localStorage.setItem('refresh_token', refreshToken);
                console.log('Saved refresh_token from URL to localStorage');
            } catch (e) {
                console.log('Could not save refresh_token to localStorage (will use URL)');
            }
        }
    }

    // If we have refresh_token, we can always get a new access_token
    // So check if current token is expired or missing, and refresh immediately if needed
    if (refreshToken && (!accessToken || shouldRefreshToken()) && !isRefreshingToken) {
        console.log('Getting or refreshing access token on startup...');
        await refreshAccessToken();
    }

    // If we still don't have an access token after refresh attempt, show error
    if (!accessToken) {
        if (!refreshToken) {
            showError('No access token or refresh token found. Please login again.');
        } else {
            showError('Failed to get access token. Please refresh the page.');
        }
        return;
    }

    // Start fetching track data
    fetchCurrentTrack();
    // Refresh every 5 seconds
    refreshInterval = setInterval(fetchCurrentTrack, 5000);

    // Proactive token refresh - check every 30 seconds and refresh 5 minutes before expiration
    setInterval(async () => {
        if (shouldRefreshToken() && !isRefreshingToken) {
            console.log('Proactive token refresh check - refreshing token before expiration');
            await refreshAccessToken();
            // After refreshing, fetch current track with new token
            if (accessToken) {
                fetchCurrentTrack();
            }
        }
    }, 30000); // Check every 30 seconds

    // Initialize Color Thief
    colorThief = new ColorThief();

    // Listen for messages from parent window
    window.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'getAccentColor') {
            // Send the current accent color back to the parent
            if (currentAccentColor) {
                event.source.postMessage({
                    action: 'accentColor',
                    color: currentAccentColor
                }, '*');
            }
        }
    });

    // Extract accent color from album cover when it loads
    albumCover.addEventListener('load', () => extractAndApplyAccentColor());

    // Also try to extract if album cover is already loaded
    if (albumCover.complete && albumCover.naturalHeight !== 0) {
        setTimeout(() => extractAndApplyAccentColor(), 100);
    }
});

// Helper function to convert RGB to hex
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Function to extract and apply accent color
function extractAndApplyAccentColor() {
    if (!colorThief) return;

    try {
        const dominantColor = colorThief.getColor(albumCover);
        const hexColor = rgbToHex(dominantColor[0], dominantColor[1], dominantColor[2]);
        currentAccentColor = hexColor;
        console.log('Extracted accent color:', hexColor); // Debug log
        // Apply accent colors if enabled
        applyAccentColors();
    } catch (error) {
        console.error('Error extracting accent color:', error);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
    if (progressInterval) {
        clearInterval(progressInterval);
    }
});

// Utility functions
function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function updateProgress() {
    if (!trackDuration || !trackProgress) return;

    // Calculate current progress based on elapsed time
    const now = Date.now();
    const elapsed = now - trackStartTime;
    const currentProgress = trackProgress + elapsed;
    const remaining = Math.max(trackDuration - currentProgress, 0);

    // Update progress bar
    const progressPercentage = Math.min((currentProgress / trackDuration) * 100, 100);
    progressFill.style.width = `${progressPercentage}%`;

    // Update time display
    currentTimeElement.textContent = formatTime(currentProgress);
    totalTimeElement.textContent = formatTime(trackDuration);

    if (remaining <= 3000) {
        startNearEndPolling();
    }

    // Stop updating if track is finished
    if (currentProgress >= trackDuration) {
        clearInterval(progressInterval);
        progressInterval = null;
        stopNearEndPolling();
    }
}

function startProgressTracking(progress, duration) {
    // Clear existing interval
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    stopNearEndPolling();

    trackStartTime = Date.now();
    trackDuration = duration;
    trackProgress = progress;
    scheduleNearEndCheck(duration, progress);

    // Update immediately
    updateProgress();

    // Update every second
    progressInterval = setInterval(updateProgress, 1000);
}

function scheduleNearEndCheck(duration, progress) {
    if (!duration || progress === undefined) return;

    const remaining = duration - progress;

    if (nearEndTimeout) {
        clearTimeout(nearEndTimeout);
        nearEndTimeout = null;
    }

    if (remaining <= 3000) {
        startNearEndPolling();
    } else {
        nearEndTimeout = setTimeout(() => {
            startNearEndPolling();
        }, remaining - 3000);
    }
}

function startNearEndPolling() {
    if (nearEndInterval) return;
    console.log('Entering near-end polling mode (1s interval)');
    nearEndInterval = setInterval(() => {
        fetchCurrentTrack();
    }, 1000);
}

function stopNearEndPolling() {
    if (nearEndTimeout) {
        clearTimeout(nearEndTimeout);
        nearEndTimeout = null;
    }
    if (nearEndInterval) {
        clearInterval(nearEndInterval);
        nearEndInterval = null;
        console.log('Exiting near-end polling mode');
    }
}

function getAccessToken() {
    // Strategy: Try localStorage first (if available), fall back to URL parameters
    // This works best because:
    // 1. localStorage is faster and persists across page refreshes (if available)
    // 2. URL parameters work as fallback when localStorage isn't available (OBS Browser Source)

    try {
        // First: Try to get from localStorage (preferred method)
        accessToken = localStorage.getItem('access_token');
        refreshToken = localStorage.getItem('refresh_token');
        const storedExpiresAt = localStorage.getItem('expires_at');
        if (storedExpiresAt) {
            tokenExpiresAt = parseInt(storedExpiresAt);
        }

        console.log('Read tokens from localStorage:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            hasExpiresAt: !!tokenExpiresAt
        });
    } catch (e) {
        // localStorage not available (cross-origin or OBS Browser Source)
        console.log('Cannot access localStorage, will use URL parameters');
    }

    // Fallback: If not in localStorage, get from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (!accessToken) {
        accessToken = urlParams.get('token');
    }
    if (!refreshToken) {
        refreshToken = urlParams.get('refresh_token');
    }

    // If we got tokens from URL but no expires_at, assume token might be expired
    // We'll check and refresh on startup if needed
    if ((accessToken || refreshToken) && !tokenExpiresAt) {
        // Set expiration to now (will trigger immediate refresh check)
        tokenExpiresAt = Date.now();
    }

    console.log('Final token state:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasExpiresAt: !!tokenExpiresAt,
        source: accessToken ? 'localStorage or URL' : 'URL only'
    });
}

function isTokenExpired() {
    if (!tokenExpiresAt) return false;
    // Consider token expired if it expires within the next 5 minutes
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return tokenExpiresAt <= fiveMinutesFromNow;
}

function shouldRefreshToken() {
    return refreshToken && (isTokenExpired() || !accessToken);
}

function applyStyle() {
    const urlParams = new URLSearchParams(window.location.search);
    const style = urlParams.get('style') || 'default';

    const widgetContainer = document.querySelector('.widget-container');
    if (widgetContainer) {
        // Remove all existing style classes
        widgetContainer.className = 'widget-container';

        // Add the selected style class
        if (style !== 'default') {
            widgetContainer.classList.add(style);
        }
    }
}

function applySettings() {
    const urlParams = new URLSearchParams(window.location.search);

    // Get settings from URL params, default to true if not specified
    const showSongName = urlParams.get('showSongName') !== 'false';
    const showArtistName = urlParams.get('showArtistName') !== 'false';
    const showProgressBar = urlParams.get('showProgressBar') !== 'false';
    const showSpotifyBadge = urlParams.get('showSpotifyBadge') !== 'false';
    const showSongCover = urlParams.get('showSongCover') !== 'false';

    // Apply visibility settings
    const albumCoverContainer = document.querySelector('.album-cover-container');
    const progressContainer = document.querySelector('.progress-container');
    const spotifyBadge = document.getElementById('spotify-badge');

    if (trackName) trackName.style.display = showSongName ? 'block' : 'none';
    if (trackArtist) trackArtist.style.display = showArtistName ? 'block' : 'none';
    if (progressContainer) progressContainer.style.display = showProgressBar ? 'block' : 'none';
    if (spotifyBadge) spotifyBadge.style.display = showSpotifyBadge ? 'inline-flex' : 'none';
    if (albumCoverContainer) albumCoverContainer.style.display = showSongCover ? 'block' : 'none';

    // Apply background settings
    const widgetContainer = document.querySelector('.widget-container');
    if (widgetContainer) {
        const backgroundStyle = urlParams.get('backgroundStyle') || 'transparent';

        if (backgroundStyle === 'transparent') {
            // Transparent background
            widgetContainer.style.background = 'transparent';
            widgetContainer.style.backdropFilter = 'none';
            widgetContainer.classList.remove('liquid-glass');
        } else if (backgroundStyle === 'solid') {
            // Solid color background
            const bgColor = urlParams.get('backgroundColor') || '#000000';
            const opacity = urlParams.get('backgroundOpacity') || '0.85';

            // Convert hex color to rgba
            const hex = bgColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            widgetContainer.style.background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            widgetContainer.style.backdropFilter = 'none';
            widgetContainer.classList.remove('liquid-glass');
        } else if (backgroundStyle === 'liquid-glass') {
            // Liquid Glass effect
            widgetContainer.classList.add('liquid-glass');

            const glassTint = urlParams.get('glassTint') || '#ffffff';
            const glassOpacity = urlParams.get('glassOpacity') || '0.3';
            const blurAmount = urlParams.get('blurAmount') || '40';

            // Only apply colors if accent color is NOT enabled
            const useAccentForBackground = urlParams.get('useAccentForBackground') === 'true';
            const useAccentForGlassTint = urlParams.get('useAccentForGlassTint') === 'true';

            if (!useAccentForBackground && !useAccentForGlassTint) {
                // Convert hex to rgba for tint
                const hex = glassTint.replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);

                widgetContainer.style.background = `rgba(${r}, ${g}, ${b}, ${glassOpacity})`;
            }

            widgetContainer.style.backdropFilter = `blur(${blurAmount}px)`;
            widgetContainer.style.boxShadow = `
                inset 0 1px 2px rgba(255, 255, 255, 0.3),
                inset 0 -1px 2px rgba(0, 0, 0, 0.2),
                0 12px 32px rgba(0, 0, 0, 0.3),
                0 4px 16px rgba(0, 0, 0, 0.2)
            `;
        }
    }

    // Apply text style settings
    const textColor = urlParams.get('textColor') || '#ffffff';
    const enableShadow = urlParams.get('enableTextShadow') === 'true';
    const enableGlow = urlParams.get('enableTextGlow') === 'true';
    const shadowColor = urlParams.get('textShadowColor') || '#000000';
    const glowColor = urlParams.get('textGlowColor') || '#1DB954';

    // Apply text color
    if (trackName) trackName.style.color = textColor;
    if (trackArtist) trackArtist.style.color = textColor;

    // Apply text shadow
    const shadowStyle = enableShadow ? `2px 2px 4px ${shadowColor}` : 'none';
    if (trackName) trackName.style.textShadow = shadowStyle;
    if (trackArtist) trackArtist.style.textShadow = shadowStyle;

    // Apply text glow
    if (enableGlow) {
        const glowStyle = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 30px ${glowColor}`;
        if (trackName) trackName.style.textShadow = shadowStyle !== 'none' ? `${shadowStyle}, ${glowStyle}` : glowStyle;
        if (trackArtist) trackArtist.style.textShadow = shadowStyle !== 'none' ? `${shadowStyle}, ${glowStyle}` : glowStyle;
    }

    // Apply border settings
    const enableBorder = urlParams.get('enableBorder') === 'true';
    if (enableBorder && widgetContainer) {
        const borderStyle = urlParams.get('borderStyle') || 'solid';

        if (borderStyle === 'solid') {
            const borderColor = urlParams.get('borderColor') || '#ffffff';
            widgetContainer.style.border = `2px solid ${borderColor}`;
        } else if (borderStyle === 'gradient') {
            const gradColor1 = urlParams.get('borderGradientColor1') || '#1DB954';
            const gradColor2 = urlParams.get('borderGradientColor2') || '#ffffff';
            widgetContainer.style.border = '2px solid transparent';
            widgetContainer.style.borderImage = `linear-gradient(45deg, ${gradColor1}, ${gradColor2}) 1`;
        }
    } else if (widgetContainer) {
        widgetContainer.style.border = 'none';
        widgetContainer.style.borderImage = 'none';
    }
}

async function fetchCurrentTrack() {
    try {
        // Check if token needs refreshing before making the request
        if (shouldRefreshToken() && !isRefreshingToken) {
            console.log('Token expired or missing, refreshing...');
            const refreshed = await refreshAccessToken();
            if (!refreshed) {
                if (!accessToken) {
                    showError('No access token available');
                } else {
                    console.log('Token refresh failed, will retry soon without interrupting display');
                }
                return;
            }
        }

        if (!accessToken) {
            showError('No access token available');
            return;
        }

        const response = await fetch('/api/current-track', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.status === 401) {
            // Token expired, try to refresh
            console.log('Received 401, attempting token refresh...');
            await refreshAccessToken();
            if (accessToken) {
                // Retry the request with new token
                return await fetchCurrentTrack();
            } else {
                showError('Session expired. Please login again.');
                return;
            }
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch track: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.isPlaying && data.track) {
            const progress = data.track.progress;
            if (typeof progress === 'number') {
                if (progress === lastProgressValue) {
                    stagnantProgressCount += 1;
                    if (stagnantProgressCount >= 3) {
                        console.log('Progress unchanged across 3 polls, treating as not playing.');
                        stagnantProgressCount = 0;
                        lastProgressValue = null;
                        currentTrackData = null;
                        showNotPlaying();
                        return;
                    }
                } else {
                    stagnantProgressCount = 0;
                    lastProgressValue = progress;
                }
            } else {
                stagnantProgressCount = 0;
                lastProgressValue = null;
            }

            displayTrack(data.track);
        } else {
            stagnantProgressCount = 0;
            lastProgressValue = null;
            showNotPlaying();
        }
    } catch (error) {
        console.error('Error fetching track:', error);
        showError('Failed to load current track');
    }
}

async function refreshAccessToken() {
    if (isRefreshingToken) {
        console.log('Token refresh already in progress, waiting...');
        return;
    }

    isRefreshingToken = true;

    try {
        // Priority: Always check URL first (for OBS where localStorage isn't available)
        // Then check variable, then localStorage
        let storedRefreshToken = null;

        // First: Check URL parameters (most reliable for OBS Browser Source)
        const urlParams = new URLSearchParams(window.location.search);
        storedRefreshToken = urlParams.get('refresh_token');

        // Second: Check our variable (might have been set from URL on load)
        if (!storedRefreshToken && refreshToken) {
            storedRefreshToken = refreshToken;
        }

        // Third: Try localStorage (for same-origin scenarios)
        if (!storedRefreshToken) {
            try {
                storedRefreshToken = localStorage.getItem('refresh_token');
            } catch (e) {
                // Can't access localStorage (OBS Browser Source scenario - this is normal)
                console.log('Cannot access localStorage (normal in OBS Browser Source)');
            }
        }

        if (!storedRefreshToken) {
            console.error('No refresh token available');
            showError('Session expired. Please login again.');
            isRefreshingToken = false;
            return;
        }

        // Store refresh token in variable for future use
        refreshToken = storedRefreshToken;

        console.log('Attempting to refresh access token...');
        const response = await fetch('/api/refresh-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh_token: storedRefreshToken })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Token refresh failed:', response.status, errorData);

            if (response.status === 400 || response.status === 401) {
                // Refresh token is invalid or expired
                showError('Session expired. Please login again.');
                // Clear invalid tokens
                try {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('expires_at');
                } catch (e) {
                    // Ignore localStorage errors
                }
                accessToken = null;
                refreshToken = null;
                tokenExpiresAt = null;
                return false;
            }

            throw new Error(`Failed to refresh token: ${response.status}`);
        }

        const data = await response.json();
        accessToken = data.access_token;

        // Spotify may return a new refresh_token (preserve it if provided, otherwise keep existing)
        if (data.refresh_token) {
            refreshToken = data.refresh_token;
        } else {
            // Preserve existing refresh_token (important for OBS where it comes from URL)
            // If we don't have one, try to get it from URL again
            if (!refreshToken) {
                const urlParams = new URLSearchParams(window.location.search);
                refreshToken = urlParams.get('refresh_token');
            }
        }

        // Update expiration time
        if (data.expires_in) {
            tokenExpiresAt = Date.now() + (data.expires_in * 1000);
        } else {
            // Default to 55 minutes if not provided
            tokenExpiresAt = Date.now() + (55 * 60 * 1000);
        }

        // Always try to save to localStorage (if available)
        // This allows the widget to use localStorage as primary storage when available
        // and only fall back to URL parameters when localStorage isn't accessible (OBS)
        try {
            localStorage.setItem('access_token', accessToken);
            console.log('Saved new access_token to localStorage');

            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
                console.log('Saved refresh_token to localStorage');
            }

            if (tokenExpiresAt) {
                localStorage.setItem('expires_at', tokenExpiresAt.toString());
                console.log('Saved expires_at to localStorage');
            }

            console.log('Token data successfully saved to localStorage');
        } catch (e) {
            // Can't update localStorage (e.g., in OBS Browser Source with restricted permissions)
            // This is okay - we'll continue using URL parameters as fallback
            console.log('Cannot save to localStorage (normal in some OBS configurations). Using URL parameters as fallback.');
        }

        console.log('Token refreshed successfully');
        return true;
    } catch (error) {
        console.error('Error refreshing token:', error);
        // Keep existing tokens for transient errors and retry soon
        tokenExpiresAt = Date.now();
        return false;
    } finally {
        isRefreshingToken = false;
    }
}

function displayTrack(track) {
    // Check if track has changed
    const trackChanged = !currentTrackData || currentTrackData.id !== track.id;

    if (!trackChanged && track.isPlaying) {
        // Same track, just update progress if needed
        if (track.progress !== undefined && track.duration !== undefined) {
            startProgressTracking(track.progress, track.duration);
        }
        return;
    }

    // Animate track change if it changed
    if (trackChanged) {
        animateTrackChange(track);
    }

    currentTrackData = track;
    overlayIdleState = 'playing';
    stagnantProgressCount = 0;
    if (typeof track.progress === 'number') {
        lastProgressValue = track.progress;
    } else {
        lastProgressValue = null;
    }

    // Update progress bar if track is playing
    if (track.isPlaying && track.progress !== undefined && track.duration !== undefined) {
        startProgressTracking(track.progress, track.duration);
    } else {
        // Clear progress if not playing
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        stopNearEndPolling();
        progressFill.style.width = '0%';
        currentTimeElement.textContent = '0:00';
        totalTimeElement.textContent = track.duration ? formatTime(track.duration) : '0:00';
    }

    // Show track display
    if (notPlayingTimeout) {
        clearTimeout(notPlayingTimeout);
        notPlayingTimeout = null;
    }

    if (widgetContainer) {
        widgetContainer.style.display = 'flex';
    }
    if (widgetContent) {
        widgetContent.style.display = 'block';
    }

    loading.style.display = 'none';
    notPlaying.style.display = 'none';
    errorDisplay.style.display = 'none';
    trackDisplay.style.display = 'flex';

    // Trigger animation
    trackDisplay.style.animation = 'none';
    setTimeout(() => {
        trackDisplay.style.animation = 'fadeIn 0.5s ease';
    }, 10);
}

function animateTrackChange(track) {
    const albumCoverContainer = document.querySelector('.album-cover-container');
    const progressFillElement = document.querySelector('.progress-fill');

    if (!albumCoverContainer) return;

    // Step 1: Start animations - fade out cover and reset progress bar
    albumCoverContainer.classList.add('changing');

    // Animate progress bar reset
    if (progressFillElement) {
        // Store current progress for animation
        const currentWidth = progressFillElement.style.width || '0%';
        progressFillElement.style.setProperty('--current-progress', currentWidth);
        progressFillElement.classList.add('resetting');

        // Remove resetting class after animation
        setTimeout(() => {
            progressFillElement.classList.remove('resetting');
            progressFillElement.style.width = '0%';
        }, 800);
    }

    // Step 2: Animate text fade out
    trackName.classList.add('changing');
    trackArtist.classList.add('changing');

    // Step 3: Update text content after fade out
    setTimeout(() => {
        trackName.textContent = track.name;
        trackArtist.textContent = track.artists;
        trackAlbum.textContent = track.album;

        // Remove changing classes and add entering classes
        trackName.classList.remove('changing');
        trackArtist.classList.remove('changing');
        trackName.classList.add('entering');
        trackArtist.classList.add('entering');

        // Remove entering classes after animation
        setTimeout(() => {
            trackName.classList.remove('entering');
            trackArtist.classList.remove('entering');
        }, 700);
    }, 400);

    // Step 3: After fade out, load new image and wait for it to load before animating
    setTimeout(() => {
        // Image loading phase

        // Create a new image element to preload the cover
        const newImg = new Image();
        newImg.crossOrigin = 'anonymous';

        // Wait for the new image to load before animating
        newImg.onload = function () {
            // Now that image is loaded, update the actual album cover
            albumCover.crossOrigin = 'anonymous';
            albumCover.src = track.image || '';
            albumCover.alt = `${track.name} by ${track.artists}`;

            // Reset accent color when track changes
            currentAccentColor = null;

            // Remove changing class and add entering class to trigger animation
            albumCoverContainer.classList.remove('changing');
            albumCoverContainer.classList.add('entering');

            // Extract accent color from new cover
            extractAndApplyAccentColor();

            // Remove entering class after animation completes (1.2s + buffer)
            setTimeout(() => {
                albumCoverContainer.classList.remove('entering');
            }, 1300);
        };

        // Handle image load error
        newImg.onerror = function () {
            // If image fails to load, still proceed with animation but show without image
            albumCover.crossOrigin = 'anonymous';
            albumCover.src = track.image || '';
            albumCover.alt = `${track.name} by ${track.artists}`;

            currentAccentColor = null;
            albumCoverContainer.classList.remove('changing');
            albumCoverContainer.classList.add('entering');

            setTimeout(() => {
                albumCoverContainer.classList.remove('entering');
            }, 1300);
        };

        // Start loading the new image
        newImg.src = track.image || '';
    }, 600);
}

function showNotPlaying() {
    // Clear progress tracking
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    stopNearEndPolling();

    if (notPlayingTimeout) {
        clearTimeout(notPlayingTimeout);
        notPlayingTimeout = null;
    }

    if (overlayIdleState === 'idleHidden') {
        hideOverlay();
        return;
    }

    if (overlayIdleState === 'idleVisible') {
        return;
    }

    overlayIdleState = 'idleVisible';

    if (widgetContainer) {
        widgetContainer.style.display = 'flex';
    }
    if (widgetContent) {
        widgetContent.style.display = 'block';
    }

    loading.style.display = 'none';
    trackDisplay.style.display = 'none';
    errorDisplay.style.display = 'none';
    notPlaying.style.display = 'flex';

    notPlayingTimeout = setTimeout(() => {
        overlayIdleState = 'idleHidden';
        hideOverlay();
        notPlayingTimeout = null;
    }, 5000);
}

function showError(message) {
    // Clear progress tracking
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    stopNearEndPolling();

    if (notPlayingTimeout) {
        clearTimeout(notPlayingTimeout);
        notPlayingTimeout = null;
    }

    overlayIdleState = 'error';

    if (widgetContainer) {
        widgetContainer.style.display = 'flex';
    }
    if (widgetContent) {
        widgetContent.style.display = 'block';
    }

    loading.style.display = 'none';
    trackDisplay.style.display = 'none';
    notPlaying.style.display = 'none';
    errorDisplay.style.display = 'flex';

    errorMessage.textContent = message;
}

function hideOverlay() {
    loading.style.display = 'none';
    trackDisplay.style.display = 'none';
    notPlaying.style.display = 'none';
    errorDisplay.style.display = 'none';

    if (widgetContent) {
        widgetContent.style.display = 'none';
    }
    if (widgetContainer) {
        widgetContainer.style.display = 'none';
    }
}

function applyAccentColors() {
    if (!currentAccentColor) return;

    const urlParams = new URLSearchParams(window.location.search);
    const widgetContainer = document.querySelector('.widget-container');

    // Apply background accent color
    const useAccentForBackground = urlParams.get('useAccentForBackground') === 'true';
    if (useAccentForBackground && widgetContainer) {
        const backgroundStyle = urlParams.get('backgroundStyle');
        const hex = currentAccentColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        if (backgroundStyle === 'solid') {
            const opacity = urlParams.get('backgroundOpacity') || '0.85';
            widgetContainer.style.background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        } else if (backgroundStyle === 'liquid-glass') {
            const glassOpacity = urlParams.get('glassOpacity') || '0.3';
            const blurAmount = urlParams.get('blurAmount') || '40';
            widgetContainer.style.background = `rgba(${r}, ${g}, ${b}, ${glassOpacity})`;
            widgetContainer.style.backdropFilter = `blur(${blurAmount}px)`;
        }
    }

    // Apply glass tint accent color
    const useAccentForGlassTint = urlParams.get('useAccentForGlassTint') === 'true';
    if (useAccentForGlassTint && widgetContainer) {
        const backgroundStyle = urlParams.get('backgroundStyle');
        if (backgroundStyle === 'liquid-glass') {
            const glassOpacity = urlParams.get('glassOpacity') || '0.3';
            const blurAmount = urlParams.get('blurAmount') || '40';
            const hex = currentAccentColor.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            widgetContainer.style.background = `rgba(${r}, ${g}, ${b}, ${glassOpacity})`;
            widgetContainer.style.backdropFilter = `blur(${blurAmount}px)`;
        }
    }

    // Apply text accent colors
    const useAccentForText = urlParams.get('useAccentForText') === 'true';
    if (useAccentForText) {
        if (trackName) trackName.style.color = currentAccentColor;
        if (trackArtist) trackArtist.style.color = currentAccentColor;
    }

    // Apply shadow accent color
    const useAccentForShadow = urlParams.get('useAccentForShadow') === 'true';
    if (useAccentForShadow) {
        const enableShadow = urlParams.get('enableTextShadow') === 'true';
        if (enableShadow) {
            const shadowStyle = `2px 2px 4px ${currentAccentColor}`;
            if (trackName) trackName.style.textShadow = shadowStyle;
            if (trackArtist) trackArtist.style.textShadow = shadowStyle;
        }
    }

    // Apply glow accent color
    const useAccentForGlow = urlParams.get('useAccentForGlow') === 'true';
    if (useAccentForGlow) {
        const enableGlow = urlParams.get('enableTextGlow') === 'true';
        if (enableGlow) {
            const glowStyle = `0 0 10px ${currentAccentColor}, 0 0 20px ${currentAccentColor}, 0 0 30px ${currentAccentColor}`;
            if (trackName) trackName.style.textShadow = glowStyle;
            if (trackArtist) trackArtist.style.textShadow = glowStyle;
        }
    }

    // Apply border accent color
    const useAccentForBorder = urlParams.get('useAccentForBorder') === 'true';
    if (useAccentForBorder && widgetContainer) {
        const enableBorder = urlParams.get('enableBorder') === 'true';
        if (enableBorder) {
            widgetContainer.style.border = `2px solid ${currentAccentColor}`;
        }
    }

    // Apply gradient accent colors
    const useAccentForGradient1 = urlParams.get('useAccentForGradient1') === 'true';
    const useAccentForGradient2 = urlParams.get('useAccentForGradient2') === 'true';
    if (useAccentForGradient1 || useAccentForGradient2 && widgetContainer) {
        const enableBorder = urlParams.get('enableBorder') === 'true';
        const borderStyle = urlParams.get('borderStyle');
        if (enableBorder && borderStyle === 'gradient') {
            const gradColor1 = useAccentForGradient1 ? currentAccentColor : (urlParams.get('borderGradientColor1') || '#1DB954');
            const gradColor2 = useAccentForGradient2 ? currentAccentColor : (urlParams.get('borderGradientColor2') || '#ffffff');
            widgetContainer.style.border = '2px solid transparent';
            widgetContainer.style.borderImage = `linear-gradient(45deg, ${gradColor1}, ${gradColor2}) 1`;
        }
    }
}

// Handle album cover load errors
albumCover.addEventListener('error', function () {
    // Fallback to a placeholder if image fails to load
    this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect width="300" height="300" fill="%231e1e1e"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23b3b3b3" font-family="sans-serif" font-size="24"%3ENo Image%3C/text%3E%3C/svg%3E';
});
