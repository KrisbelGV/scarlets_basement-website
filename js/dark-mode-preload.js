var darkModeEnabled = localStorage.getItem('darkMode') === 'enabled';
if (darkModeEnabled) {
    document.documentElement.classList.add('dark-mode');
}