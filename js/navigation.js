// Manejo del menú de navegación
(function() {
    'use strict';
    
    const dropdownToggle = document.querySelector('.nav__dropdown > a');
    const dropdownMenu = document.querySelector('.nav__dropdown-menu');
    const navToggle = document.querySelector('.nav__toggle');
    const toggleIcon = document.querySelector('.nav__toggle-icon');
    const navMenu = document.querySelector('.nav__menu');
    
    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownMenu.classList.toggle('is-open');
        });
        
        const dropdownLinks = document.querySelectorAll('.nav__link--sub');
        dropdownLinks.forEach(link => {
            link.addEventListener('click', () => {
                dropdownMenu.classList.remove('is-open');
            });
        });
    }
    
    if (navToggle && toggleIcon && navMenu) {
        navToggle.addEventListener('click', () => {
            const isOpen = navMenu.classList.toggle('is-open');
            const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
            const iconSrc = isOpen 
                ? `${basePath}assets/x.svg` 
                : `${basePath}assets/hamburger.svg`;
            
            toggleIcon.setAttribute('src', iconSrc);
            navToggle.setAttribute('aria-expanded', isOpen);
        });
    }
    
    document.addEventListener('click', (e) => {
        if (dropdownMenu && dropdownMenu.classList.contains('is-open') 
            && !dropdownToggle.contains(e.target) 
            && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('is-open');
        }
        
        if (navMenu && navToggle && toggleIcon) {
            if (navMenu.classList.contains('is-open')
                && !navMenu.contains(e.target)
                && !navToggle.contains(e.target)) {
                navMenu.classList.remove('is-open');
                
                if (dropdownMenu) {
                    dropdownMenu.classList.remove('is-open');
                }
                
                navToggle.setAttribute('aria-expanded', 'false');
                const basePath = window.location.pathname.includes('/pages/') ? '../' : '';
                toggleIcon.setAttribute('src', `${basePath}assets/hamburger.svg`);
            }
        }
    });
    
    const toolboxCardLink = document.querySelector('#toolbox-card-link');
    if (toolboxCardLink && dropdownMenu) {
        toolboxCardLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdownMenu.classList.add('is-open');
            
            const header = document.querySelector('.header');
            if (header) {
                header.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }
    
})();