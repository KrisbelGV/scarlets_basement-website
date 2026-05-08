(function() {
    'use strict';
    
    const tutorialLoginSection = document.querySelector('.tutorial-login-section');
    if (!tutorialLoginSection) return;
    
    const basePath = window.location.pathname.includes('/pages/') ? '../' : './';
    const USERNAME_REGEX = /^[a-zA-Z0-9-_]+$/;
    
    let loginContainer = null;
    let userSummary = null;
    let errorInfoBox = null;
    let queueInfoBox = null;
    let massiveInfoBox = null;
    let infoTimeouts = {};

    const CACHE_KEY = 'scarlet_userdata';
    const CACHE_DURATION = 24 * 60 * 60 * 1000;

    function saveToCache(data) {
        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    }

    function getFromCache() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const cacheData = JSON.parse(cached);
        const age = Date.now() - cacheData.timestamp;
        
        if (age > CACHE_DURATION) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        
        return cacheData.data;
    }

    function clearCache() {
        localStorage.removeItem(CACHE_KEY);
    }

    const ALERTS_CACHE_KEY = 'scarlet_closed_alerts';

    function getClosedAlerts() {
        const cached = localStorage.getItem(ALERTS_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    }

    function saveClosedAlert(alertId) {
        const closed = getClosedAlerts();
        if (!closed.includes(alertId)) {
            closed.push(alertId);
            localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(closed));
        }
    }

    function isAlertClosed(alertId) {
        return getClosedAlerts().includes(alertId);
    }
    
    function isValidUsername(username) {
        return typeof username === 'string' && 
               username.length >= 3 && 
               username.length <= 30 && 
               USERNAME_REGEX.test(username);
    }
    
    function createUserSummary() {
        const summary = document.createElement('div');
        summary.className = 'user-summary';
        summary.id = 'user-summary';
        summary.innerHTML = `
            <div class="user-summary__loader">
                <div class="loader-pulse"></div>
                <img src="${basePath}assets/scratch_head.svg" alt="Scratch pet icon" class="loader-image">
                <p class="loader-text" id="loader-message">Loading user data, please wait</p>
                <p class="loader-subtext" style="color: var(--color-warn-header); font-size: 0.85rem; margin-top: 8px; text-align: center;" id="loader-subtext"></p>
            </div>
        
            <div class="user-summary__result" id="user-summary-result">
                <div class="user-data">
                    <img src="${basePath}assets/default_profile.svg" alt="Profile" class="user-profile-photo" id="profile-photo">
                    <h1 class="user-name" id="display-name">Username</h1>
                </div>
            
                <div class="stats-main">
                    <div class="stat-col">
                        <span class="stat-value" id="stat-following">0</span>
                        <span class="stat-label">Following</span>
                    </div>
                    <div class="stat-col">
                        <span class="stat-value" id="stat-followers">0</span>
                        <span class="stat-label">Followers</span>
                    </div>
                </div>
            
                <div class="stats-projects">
                    <span>Shared Projects: <strong><span class="stat-value stat-value--small" id="stat-projects">0</span></strong></span>
                </div>
            
                <div class="stats-icons-row">
                    <div class="stat-item">
                        <div class="icon-wrapper"><img src="${basePath}assets/view.svg" alt=""></div> 
                        <span class="stat-value stat-value--small" id="stat-views">0</span>
                    </div>
                    <div class="stat-item">
                        <div class="icon-wrapper"><img src="${basePath}assets/heart.svg" alt=""></div> 
                        <span class="stat-value stat-value--small" id="stat-loves">0</span>
                    </div>
                    <div class="stat-item">
                        <div class="icon-wrapper"><img src="${basePath}assets/star.svg" alt=""></div> 
                        <span class="stat-value stat-value--small" id="stat-favorites">0</span>
                    </div>
                </div>

                <p class="stats-note" id="stats-note" style="display: none; font-size: 0.8rem; color: var(--color-warn-text); text-align: center; margin-top: 8px; font-style: italic;"></p>
            
                <button class="reload-btn" id="reload-btn">Reload</button>
            </div>
        `;
        
        return summary;
    }
    
    function showInfo(box, message, duration = 5000) {
        if (!box) return;
        const messageEl = box.querySelector('span') || box;
        if (messageEl) messageEl.innerHTML = message;
        box.style.display = 'block';
        
        const key = box.id;
        if (infoTimeouts[key]) clearTimeout(infoTimeouts[key]);
        if (duration > 0) {
            infoTimeouts[key] = setTimeout(() => {
                box.style.display = 'none';
            }, duration);
        }
    }
    
    function hideInfo(box) {
        if (!box) return;
        box.style.display = 'none';
        const key = box.id;
        if (infoTimeouts[key]) {
            clearTimeout(infoTimeouts[key]);
            delete infoTimeouts[key];
        }
    }
    
    function showError(message) {
        if (!errorInfoBox) errorInfoBox = document.querySelector('#error-info');
        showInfo(errorInfoBox, message, 8000);
    }
    
    function showQueueInfo() {
        if (!queueInfoBox) queueInfoBox = document.querySelector('#queue-info');
        showInfo(queueInfoBox, '<strong>Queue is full:</strong> The server is experiencing high demand. Please try again in a minute.', 8000);
        loginContainer.classList.add('is-open');
        userSummary.classList.remove('is-loading', 'is-finished');
    }
    
    function showMassiveInfo(message) {
        if (!massiveInfoBox) massiveInfoBox = document.querySelector('#massive-info');
        showInfo(massiveInfoBox, message, 0);
    }
    
    function hideMassiveInfo() {
        if (!massiveInfoBox) massiveInfoBox = document.querySelector('#massive-info');
        hideInfo(massiveInfoBox);
    }
    
    function updateLoaderMessage(message, subtext) {
        const loaderMessage = document.querySelector('#loader-message');
        const loaderSubtext = document.querySelector('#loader-subtext');
        if (loaderMessage) loaderMessage.textContent = message;
        if (loaderSubtext) loaderSubtext.textContent = subtext || '';
    }
    
    function populateUserData(data) {
        const userName = data.userName || 'Unknown';
        const userId = data.id;
        const isMassiveByFollowers = data.followers >= 200;
        const isMassiveByFollowing = data.following >= 200;
        const isMassiveAccount = isMassiveByFollowers || isMassiveByFollowing || data.aborted;

        document.querySelector('#display-name').textContent = userName;
        
        const profilePhoto = document.querySelector('#profile-photo');
        const scratchImage = `https://uploads.scratch.mit.edu/get_image/user/${userId}_90x90.png`;
        const fallbackImage = `${basePath}assets/default_profile.svg`;
        
        if (userId) {
            const img = new Image();
            img.onload = () => {
                profilePhoto.src = scratchImage;
            };
            img.onerror = () => {
                profilePhoto.src = fallbackImage;
            };
            img.src = scratchImage;
        } else {
            profilePhoto.src = fallbackImage;
        }
        
        if (isMassiveByFollowers) {
            document.querySelector('#stat-followers').textContent = '≥200';
        } else {
            animateSimpleCounter(document.querySelector('#stat-followers'), data.followers || 0);
        }
        
        if (isMassiveByFollowing) {
            document.querySelector('#stat-following').textContent = '≥200';
        } else {
            animateSimpleCounter(document.querySelector('#stat-following'), data.following || 0);
        }
        
        if (isMassiveByFollowers || isMassiveByFollowing) {
            if (data.aborted) {
                showMassiveInfo('<strong>Massive account detected:</strong> Stats may be incomplete due to account size and request timeout. Values shown are approximate.');
            } else {
                showMassiveInfo('<strong>Massive account detected:</strong> This account has too many followers or following. Try with a smaller account for a better experience.');
            }
        } else if (data.aborted) {
            showMassiveInfo('<strong>Massive account detected:</strong> Request timeout forced early termination. Values shown are approximate.');
        } else {
            hideMassiveInfo();
        }
        
        if (data.aborted) {
            document.querySelector('#stat-projects').textContent = data.stats.sharedProjects || '...';
            document.querySelector('#stat-views').textContent = data.stats.views ? '~' + data.stats.views.toLocaleString() : '...';
            document.querySelector('#stat-loves').textContent = data.stats.loves ? '~' + data.stats.loves.toLocaleString() : '...';
            document.querySelector('#stat-favorites').textContent = data.stats.favorites ? '~' + data.stats.favorites.toLocaleString() : '...';
            
            const statsNote = document.querySelector('#stats-note');
            statsNote.style.display = 'block';
            statsNote.innerHTML = 'Some data may be incomplete due to request timeout. Values shown are approximate.';
        } else {
            document.querySelector('#stats-note').style.display = 'none';
            animateSimpleCounter(document.querySelector('#stat-projects'), data.stats.sharedProjects || 0);
            animateStatCounter(document.querySelector('#stat-views'), data.stats.views || 0);
            animateStatCounter(document.querySelector('#stat-loves'), data.stats.loves || 0);
            animateStatCounter(document.querySelector('#stat-favorites'), data.stats.favorites || 0);
        }
    }
    
    function animateSimpleCounter(element, target) {
        const duration = 1500;
        const frameRate = 50;
        let current = 0;
        const totalSteps = duration / frameRate;
        const increment = target / totalSteps;
        
        const timer = setInterval(() => {
            current += increment;
            
            if (current >= target) {
                element.textContent = target;
                clearInterval(timer);
            } else {
                element.textContent = Math.floor(current);
            }
        }, frameRate);
    }
    
    function animateStatCounter(element, target) {
        const duration = 2000;
        const frameRate = 50;
        let current = 0;
        const totalSteps = duration / frameRate;
        const increment = target / totalSteps;
        
        const parentItem = element.closest('.stat-item');
        const iconImg = parentItem ? parentItem.querySelector('img:not(.floating-particle)') : null;
        
        const timer = setInterval(() => {
            const previousDisplay = Math.floor(current);
            current += increment;
            const currentDisplay = Math.floor(current);
            
            if (currentDisplay !== previousDisplay && currentDisplay <= target) {
                element.textContent = currentDisplay.toLocaleString();
                if (iconImg) {
                    createFloatingParticle(parentItem, iconImg.src);
                }
            }
            
            if (current >= target) {
                element.textContent = target.toLocaleString();
                clearInterval(timer);
            }
        }, frameRate);
    }
    
    function createFloatingParticle(container, imgSrc) {
        const iconWrapper = container.querySelector('.icon-wrapper');
        if (!iconWrapper) return;
        
        const particle = document.createElement('img');
        particle.src = imgSrc;
        particle.classList.add('floating-particle');
        
        const randomDuration = (0.8 + Math.random() * 0.7).toFixed(2);
        const randomOffsetX = (Math.random() * 40 - 20).toFixed(0);
        
        particle.style.setProperty('--duration', `${randomDuration}s`);
        particle.style.setProperty('--offset-x', `${randomOffsetX}px`);
        
        iconWrapper.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1500);
    }
    
    function init() {
        const sharedAlerts = document.createElement('div');
        sharedAlerts.id = 'shared-alerts';
        sharedAlerts.style.cssText = 'flex: 1; display: flex; flex-direction: column; gap: 16px;';
        
        const tutorialContainer = tutorialLoginSection.querySelector('.tutorial-container');
        if (tutorialContainer) {
            tutorialContainer.after(sharedAlerts);
        } else {
            tutorialLoginSection.appendChild(sharedAlerts);
        }
        
        const securityAlert = document.createElement('aside');
        securityAlert.className = 'security-alert';
        securityAlert.id = 'security-alert';
        securityAlert.innerHTML = `
            <button class="security-alert__close" aria-label="Close alert">
                <img src="${basePath}assets/x.svg" alt="Close">
            </button>
            <strong>SECURITY ALERT:</strong> Protect your Scratch account. Never enter your password on any site but the official Scratch website (scratch.mit.edu).
        `;
        sharedAlerts.appendChild(securityAlert);
        
        errorInfoBox = document.createElement('aside');
        errorInfoBox.className = 'info info--no-margin';
        errorInfoBox.id = 'error-info';
        errorInfoBox.style.display = 'none';
        errorInfoBox.innerHTML = `
            <button class="info__close" aria-label="Close alert" type="button">
                <img src="${basePath}assets/x_yellow.svg" alt="Close">
            </button>
            <span id="error-message"></span>
        `;
        sharedAlerts.appendChild(errorInfoBox);
        
        queueInfoBox = document.createElement('aside');
        queueInfoBox.className = 'info info--no-margin';
        queueInfoBox.id = 'queue-info';
        queueInfoBox.style.display = 'none';
        queueInfoBox.innerHTML = `
            <button class="info__close" aria-label="Close alert" type="button">
                <img src="${basePath}assets/x_yellow.svg" alt="Close">
            </button>
            <strong>Queue is full:</strong> The server is experiencing high demand. Please try again in a minute.
        `;
        sharedAlerts.appendChild(queueInfoBox);
        
        loginContainer = document.createElement('div');
        loginContainer.className = 'login-container is-open';
        loginContainer.id = 'login-container';
        loginContainer.innerHTML = `
            <article class="login-card">
                <h1 class="login-card__title">Welcome to Scarlet's Basement!</h1>
                <p class="login-card__subtitle">Log in to access all features</p>
                
                <input class="login-card__input" type="text" id="username" placeholder="Enter your Scratch username">
                
                <div class="login-card__permissions">
                    <p class="login-card__permissions-header">BY LOGGING IN, YOU AUTHORIZE SCARLET'S BASEMENT TO ACCESS YOUR PUBLIC SCRATCH INFORMATION:</p>
                    <ul class="login-card__permissions-list">
                        <li>➦ Your Shared Projects</li>
                        <li>👤 Your Follower Count</li>
                        <li>🔔 Your Following Count</li>
                    </ul>
                    <label class="login-card__checkbox-label">
                        <input type="checkbox" id="auth-check">
                        I understand and authorize these permissions.
                    </label>
                </div>
                
                <button class="login-card__btn" type="button" id="launch-btn">Start!</button>
                <p class="login-footer">Click the green flag to watch the tutorial.</p>
            </article>
        `;
        sharedAlerts.appendChild(loginContainer);
        
        massiveInfoBox = document.createElement('aside');
        massiveInfoBox.className = 'info info--no-margin';
        massiveInfoBox.id = 'massive-info';
        massiveInfoBox.style.display = 'none';
        massiveInfoBox.innerHTML = `
            <button class="info__close" aria-label="Close alert" type="button">
                <img src="${basePath}assets/x_yellow.svg" alt="Close">
            </button>
            <span id="massive-message"></span>
        `;
        sharedAlerts.appendChild(massiveInfoBox);
        
        userSummary = createUserSummary();
        sharedAlerts.appendChild(userSummary);
        
        setupLoginHandler();
        setupAlertClose();
        setupErrorInfoClose();
        setupQueueInfoClose();
        setupMassiveInfoClose();
        setupReloadButton();

        const cachedData = getFromCache();
        if (cachedData) {
            loginContainer.classList.remove('is-open');
            userSummary.classList.add('is-finished');
            populateUserData(cachedData);
        }
    }
    
    function setupLoginHandler() {
        const loginBtn = loginContainer.querySelector('.login-card__btn');
        if (!loginBtn) return;
        
        loginBtn.addEventListener('click', async () => {
            const username = loginContainer.querySelector('#username').value.trim();
            const authCheck = loginContainer.querySelector('#auth-check').checked;
            
            hideInfo(errorInfoBox);
            hideInfo(queueInfoBox);
            
            if (!username) {
                showError('<strong>Username required:</strong> Please enter your Scratch username.');
                return;
            }
            
            if (!isValidUsername(username)) {
                showError('<strong>Invalid username:</strong> Usernames must be 3-30 characters long and can only contain letters, numbers, hyphens and underscores.');
                return;
            }
            
            if (!authCheck) {
                showError('<strong>Authorization required:</strong> Please check the authorization box to continue.');
                return;
            }
            
            loginContainer.classList.remove('is-open');
            userSummary.classList.add('is-loading');
            userSummary.classList.remove('is-finished');
            updateLoaderMessage('Loading user data, please wait');
            
            try {
                const data = await api.getUserData(username);

                saveToCache(data);

                userSummary.classList.remove('is-loading');
                userSummary.classList.add('is-finished');
                populateUserData(data);
            } catch (error) {
                if (error.message.startsWith('GLOBAL_RETRY:')) {
                    const parts = error.message.split(':');
                    const seconds = parseInt(parts[1]);
                    const reason = parts[2] || 'unknown';
                    lockAllButtons(seconds, reason);
                    userSummary.classList.remove('is-loading', 'is-finished');
                    loginContainer.classList.add('is-open');
                    return;
                }
                
                if (error.message.startsWith('SCRATCH_DOWN:')) {
                    const seconds = parseInt(error.message.split(':')[1]);
                    lockAllButtons(seconds, 'scratch_down');
                    userSummary.classList.remove('is-loading', 'is-finished');
                    loginContainer.classList.add('is-open');
                    return;
                }
                
                if (error.message.startsWith('UPSTASH_EXHAUSTED:')) {
                    const parts = error.message.split(':');
                    const seconds = parseInt(parts[1]);
                    const reason = parts[2] || 'upstash_daily';
                    lockAllButtons(seconds, reason);
                    userSummary.classList.remove('is-loading', 'is-finished');
                    loginContainer.classList.add('is-open');
                    return;
                }
                
                if (error.message === 'MAX_ATTEMPTS') {
                    showApiMessage('<strong>Server is busy:</strong> The server is processing another request. Please try again in a few seconds.', 8000);
                } else if (error.message === 'USER_NOT_FOUND') {
                    showError('<strong>User not found:</strong> This Scratch account does not exist. Please check the username and try again.');
                } else if (error.message === 'TOO_MANY_REQUESTS') {
                    showError('<strong>Too many requests:</strong> Please wait for your current request to finish before making a new one.');
                } else if (error.message === 'RATE_LIMIT') {
                    showError('<strong>Daily limit reached:</strong> You have made too many requests today. Please try again tomorrow.');
                } else if (error.message === 'Request timeout') {
                    showError('<strong>Request timeout:</strong> The server took too long to respond. Please try again.');
                } else {
                    showError('<strong>Error:</strong> Unable to connect to the server. Please check your connection and try again.');
                    console.error('Fetch error:', error);
                }
                
                userSummary.classList.remove('is-loading', 'is-finished');
                loginContainer.classList.add('is-open');
            }
        });
    }
    
    function setupAlertClose() {
        const alertBox = document.querySelector('#security-alert');
        if (!alertBox) return;
        
        if (isAlertClosed('security-alert')) {
            alertBox.style.display = 'none';
        }
        
        const closeBtn = alertBox.querySelector('.security-alert__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                alertBox.style.display = 'none';
                saveClosedAlert('security-alert');
            });
        }
    }
    
    function setupErrorInfoClose() {
        if (!errorInfoBox) return;
        const closeBtn = errorInfoBox.querySelector('.info__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => hideInfo(errorInfoBox));
        }
    }
    
    function setupQueueInfoClose() {
        if (!queueInfoBox) return;
        const closeBtn = queueInfoBox.querySelector('.info__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => hideInfo(queueInfoBox));
        }
    }
    
    function setupMassiveInfoClose() {
        if (!massiveInfoBox) return;
        const closeBtn = massiveInfoBox.querySelector('.info__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => hideInfo(massiveInfoBox));
        }
    }
    
    function setupReloadButton() {
    const reloadBtn = userSummary.querySelector('#reload-btn');
    if (reloadBtn) {
        reloadBtn.addEventListener('click', async () => {
            const username = document.querySelector('#display-name').textContent;
            if (!username || username === 'Username') return;
            
            const lastReload = localStorage.getItem('scarlet_reload_timestamp');
            const COOLDOWN = 30 * 60 * 1000;
            
            if (lastReload) {
                const elapsed = Date.now() - parseInt(lastReload);
                if (elapsed < COOLDOWN) {
                    const remaining = Math.ceil((COOLDOWN - elapsed) / 60000);
                    showError(`<strong>Reload cooldown:</strong> Please wait ${remaining} minute(s) before reloading your data.`);
                    return;
                }
            }
            
            hideInfo(errorInfoBox);
            hideInfo(queueInfoBox);
            
            userSummary.classList.add('is-loading');
            userSummary.classList.remove('is-finished');
            updateLoaderMessage('Reloading user data, please wait');
            
            try {
                const data = await api.getUserData(username);

                saveToCache(data);
                localStorage.setItem('scarlet_reload_timestamp', Date.now().toString());

                userSummary.classList.remove('is-loading');
                userSummary.classList.add('is-finished');
                populateUserData(data);
            } catch (error) {
                if (error.message.startsWith('GLOBAL_RETRY:')) {
                    const parts = error.message.split(':');
                    const seconds = parseInt(parts[1]);
                    const reason = parts[2] || 'unknown';
                    lockAllButtons(seconds, reason);
                    userSummary.classList.remove('is-loading', 'is-finished');
                    loginContainer.classList.add('is-open');
                    return;
                }
                
                if (error.message.startsWith('SCRATCH_DOWN:')) {
                    const seconds = parseInt(error.message.split(':')[1]);
                    lockAllButtons(seconds, 'scratch_down');
                    userSummary.classList.remove('is-loading', 'is-finished');
                    loginContainer.classList.add('is-open');
                    return;
                }
                
                if (error.message.startsWith('UPSTASH_EXHAUSTED:')) {
                    const parts = error.message.split(':');
                    const seconds = parseInt(parts[1]);
                    const reason = parts[2] || 'upstash_daily';
                    lockAllButtons(seconds, reason);
                    userSummary.classList.remove('is-loading', 'is-finished');
                    loginContainer.classList.add('is-open');
                    return;
                }
                
                if (error.message === 'MAX_ATTEMPTS') {
                    showError('<strong>Server is busy:</strong> The server is processing another request. Please try again in a few seconds.');
                } else if (error.message === 'USER_NOT_FOUND') {
                    showError('<strong>User not found:</strong> This Scratch account does not exist. Please check the username and try again.');
                } else if (error.message === 'TOO_MANY_REQUESTS') {
                    showError('<strong>Too many requests:</strong> Please wait for your current request to finish before making a new one.');
                } else if (error.message === 'RATE_LIMIT') {
                    showError('<strong>Daily limit reached:</strong> You have made too many requests today. Please try again tomorrow.');
                } else {
                    showError('<strong>Error:</strong> Something went wrong. Please try again.');
                }
                
                userSummary.classList.remove('is-loading', 'is-finished');
                loginContainer.classList.add('is-open');
            }
        });
    }
}
    
    init();
    
})();