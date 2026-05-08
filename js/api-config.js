const lockedButtons = new Set();

function lockButton(button, duration = 6000) {
    if (!button || lockedButtons.has(button)) return;
    
    lockedButtons.add(button);
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
    button.style.pointerEvents = 'none';
    
    setTimeout(() => {
        button.disabled = false;
        button.style.opacity = '';
        button.style.cursor = '';
        button.style.pointerEvents = '';
        lockedButtons.delete(button);
    }, duration);
}

let globalLockTimer = null;

function lockAllButtons(seconds, reason) {
    const duration = seconds * 1000;
    
    const allSubmitBtns = document.querySelectorAll(
        '.search-btn[type="submit"], .studio-btn[type="submit"], .indexed-btn[type="submit"], .login-card__btn, .reload-btn'
    );
    
    allSubmitBtns.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        btn.style.pointerEvents = 'none';
    });
    
    if (globalLockTimer) clearTimeout(globalLockTimer);
    
    if (seconds <= 3600) {
        globalLockTimer = setTimeout(() => {
            allSubmitBtns.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.cursor = '';
                btn.style.pointerEvents = '';
            });
            globalLockTimer = null;
        }, duration);
    }
    
    updateRetryMessage(seconds, reason);
}

function updateRetryMessage(totalSeconds, reason) {
    let remaining = totalSeconds;
    
    const updateInterval = setInterval(() => {
        if (remaining <= 0) {
            clearInterval(updateInterval);
            const existingRetry = document.querySelector('.retry-message-container');
            if (existingRetry) existingRetry.remove();
            
            const allSubmitBtns = document.querySelectorAll(
                '.search-btn[type="submit"], .studio-btn[type="submit"], .indexed-btn[type="submit"], .login-card__btn, .reload-btn'
            );
            allSubmitBtns.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.cursor = '';
                btn.style.pointerEvents = '';
            });
            return;
        }
        
        let retryContainer = document.querySelector('.retry-message-container');
        if (!retryContainer) {
            retryContainer = document.createElement('div');
            retryContainer.className = 'retry-message-container api-message-container';
            retryContainer.style.cssText = 'width: 75%; max-width: 75rem; align-self: center; margin-bottom: 16px;';
            
            const msg = document.createElement('div');
            msg.className = 'info';
            msg.style.cssText = 'margin-bottom: 0;';
            msg.innerHTML = `<span id="retry-message"></span>`;
            retryContainer.appendChild(msg);
            
            const section = document.querySelector('.search-section') || 
                        document.querySelector('.studio-section') || 
                        document.querySelector('.indexed-section') || 
                        document.querySelector('.view-section') || 
                        document.querySelector('main');
            if (section) section.prepend(retryContainer);
        }
        
        const messageEl = document.getElementById('retry-message');
        if (messageEl) {
            const waitText = formatWaitTime(remaining);
            
            if (reason === 'scratch_down') {
                messageEl.innerHTML = `<strong>Scratch API is temporarily unavailable.</strong> Please try again in ${waitText}.`;
            } else if (reason === 'upstash_daily') {
                messageEl.innerHTML = `<strong>Service unavailable.</strong> Please try again tomorrow.`;
            } else if (reason === 'upstash_monthly') {
                messageEl.innerHTML = `<strong>Our server has reached its maximum requests.</strong> It should reset within the next few days.`;
            } else {
                messageEl.innerHTML = `<strong>Service temporarily unavailable.</strong> Please try again in ${waitText}.`;
            }
        }
        
        remaining--;
    }, 1000);
}

function formatWaitTime(totalSeconds) {
    if (totalSeconds <= 0) return 'a moment';
    
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

api.onRateLimit = function() {
    showApiMessage('<strong>Daily limit reached:</strong> You have made too many requests today. Try again tomorrow.', 0);
};

function getCachedUsername() {
    try {
        const cached = localStorage.getItem('scarlet_userdata');
        if (cached) {
            const data = JSON.parse(cached);
            if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
                return data.data?.userName || null;
            }
        }
    } catch (e) {}
    return null;
}

function showApiMessage(message, duration = 10000) {
    const existing = document.querySelector('.api-message-container:not(.retry-message-container)');
    if (existing) existing.remove();
    
    const basePath = window.location.pathname.includes('/pages/') ? '../' : './';
    
    const container = document.createElement('div');
    container.className = 'api-message-container';
    container.style.cssText = 'width: 75%; max-width: 75rem; align-self: center; margin-bottom: 16px;';
    
    const msg = document.createElement('div');
    msg.className = 'info';
    msg.style.cssText = 'margin-bottom: 0;';
    msg.innerHTML = `
        <button class="info__close" aria-label="Close alert" type="button">
            <img src="${basePath}assets/x_yellow.svg" alt="Close">
        </button>
        <span>${message}</span>
    `;
    msg.querySelector('.info__close').addEventListener('click', () => container.remove());
    
    container.appendChild(msg);
    
    const section = document.querySelector('.search-section') || 
                document.querySelector('.studio-section') || 
                document.querySelector('.indexed-section') || 
                document.querySelector('.view-section') || 
                document.querySelector('main');
    if (section) section.prepend(container);
    
    if (duration > 0) {
        setTimeout(() => container.remove(), duration);
    }
}