(function() {
    'use strict';
    
    function applyDarkMode() {
        const darkModeSetting = localStorage.getItem('darkMode');
        if (darkModeSetting === 'enabled') {
            document.documentElement.classList.add('dark-mode');
        } else {
            document.documentElement.classList.remove('dark-mode');
        }
    }
    
    applyDarkMode();
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'darkMode') {
            applyDarkMode();
        }
    });
    
})();