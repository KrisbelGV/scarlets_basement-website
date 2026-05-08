document.addEventListener('DOMContentLoaded', () => {
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
    
    function setupInfoAlert(alertId) {
        const alertBox = document.querySelector(`#${alertId}`);
        if (!alertBox) return;
        
        if (isAlertClosed(alertId)) {
            alertBox.style.display = 'none';
        } else {
            alertBox.style.display = 'block';
        }
        
        const closeBtn = alertBox.querySelector('.info__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                alertBox.style.display = 'none';
                saveClosedAlert(alertId);
            });
        }
    }
    
    const securityAlert = document.querySelector('#security-alert');
    if (securityAlert) {
        if (isAlertClosed('security-alert')) {
            securityAlert.style.display = 'none';
        }
        const closeBtn = securityAlert.querySelector('.security-alert__close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                securityAlert.style.display = 'none';
                saveClosedAlert('security-alert');
            });
        }
    }
    
    setupInfoAlert('info-search');
    setupInfoAlert('info-view');
    setupInfoAlert('info-indexed');
    
    const viewSection = document.querySelector('#auto-load-section');
    if (viewSection) {
        const username = getCachedUsername();
        const infoView = document.querySelector('#info-view');
        
        if (!username) {
            if (infoView) infoView.style.display = 'none';
            
            const existingLoader = document.querySelector('.loader-container');
            if (existingLoader) existingLoader.remove();
            
            const msg = document.createElement('div');
            msg.className = 'info';
            msg.style.cssText = 'margin-bottom: 0; text-align: center;';
            msg.innerHTML = `
                <button class="info__close" aria-label="Close alert" type="button">
                    <img src="../assets/x_yellow.svg" alt="Close">
                </button>
                <strong>Login required:</strong> You need to log in on the homepage to see projects from your following.
                <br><br>
                <a href="../index.html" style="color: var(--color-warn-text); font-weight: 700; text-decoration: underline;">Go to login page</a>
            `;
            msg.querySelector('.info__close').addEventListener('click', () => msg.remove());
            viewSection.appendChild(msg);
        } else {
            if (infoView) {
                const ALERTS_CACHE_KEY = 'scarlet_closed_alerts';
                const cached = localStorage.getItem(ALERTS_CACHE_KEY);
                const closed = cached ? JSON.parse(cached) : [];
                if (!closed.includes('info-view')) {
                    infoView.style.display = 'block';
                }
                const closeBtn = infoView.querySelector('.info__close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => {
                        infoView.style.display = 'none';
                        const cached2 = localStorage.getItem(ALERTS_CACHE_KEY);
                        const closed2 = cached2 ? JSON.parse(cached2) : [];
                        if (!closed2.includes('info-view')) {
                            closed2.push('info-view');
                            localStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(closed2));
                        }
                    });
                }
            }
            loadFollowingProjects(viewSection, username);
        }
    }
});