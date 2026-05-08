(function() {
    'use strict';
    
    const darkModeToggle = document.querySelector('#dark-mode-toggle');
    
    if (darkModeToggle) {
        if (localStorage.getItem('darkMode') === 'enabled') {
            darkModeToggle.checked = true;
        }
        
        darkModeToggle.addEventListener('change', () => {
            document.body.classList.add('dark-mode-transitioning');
            
            if (darkModeToggle.checked) {
                document.documentElement.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'enabled');
            } else {
                document.documentElement.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'disabled');
            }
            
            setTimeout(() => {
                document.body.classList.remove('dark-mode-transitioning');
            }, 500);
        });
    }
    
    const clearCacheBtn = document.querySelector('#clear-cache-btn');
    const cacheCount = document.querySelector('#cache-count');
    const cacheSize = document.querySelector('#cache-size');
    const settingsToast = document.querySelector('#settings-toast');
    
    function updateCacheStats() {
        let entryCount = 0;
        let totalSize = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            const value = localStorage.getItem(key);
            entryCount++;
            totalSize += (key.length + value.length) * 2;
        }
        
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            const value = sessionStorage.getItem(key);
            entryCount++;
            totalSize += (key.length + value.length) * 2;
        }
        
        let sizeDisplay;
        if (totalSize < 1024) {
            sizeDisplay = totalSize + ' B';
        } else if (totalSize < 1048576) {
            sizeDisplay = (totalSize / 1024).toFixed(1) + ' KB';
        } else {
            sizeDisplay = (totalSize / 1048576).toFixed(2) + ' MB';
        }
        
        if (cacheCount) cacheCount.textContent = entryCount + ' entries';
        if (cacheSize) cacheSize.textContent = sizeDisplay;
    }
    
    function showToast(message, duration = 3000) {
        if (!settingsToast) return;
        const messageEl = settingsToast.querySelector('.settings-toast__message');
        if (messageEl) messageEl.textContent = message;
        settingsToast.classList.add('is-visible');
        setTimeout(() => {
            settingsToast.classList.remove('is-visible');
        }, duration);
    }

    if (clearCacheBtn) {
        clearCacheBtn.addEventListener('click', () => {
            const confirmed = confirm(
                'Are you sure you want to clear all cache data?\n\n' +
                'This will remove:\n' +
                '- Search history and cached results\n' +
                '- Login session data\n' +
                '- Theme preferences\n\n' +
                'You will be redirected to the homepage.'
            );
            
            if (confirmed) {
                localStorage.clear();
                sessionStorage.clear();
                
                document.documentElement.classList.remove('dark-mode');
                if (darkModeToggle) darkModeToggle.checked = false;

                if (typeof window.resetFirstVisitModal === 'function') {
                    window.resetFirstVisitModal();
                }
                
                updateCacheStats();
                showToast('Cache cleared! Redirecting...');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 2000);
            }
        });
    }
    
    updateCacheStats();
    
})();