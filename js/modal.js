(function() {
    'use strict';
    
    const FIRST_VISIT_KEY = 'scarlet_first_visit_accepted';
    
    function isFirstVisitAccepted() {
        try {
            if (localStorage.getItem(FIRST_VISIT_KEY) === 'true') {
                return true;
            }
        } catch (e) {}
        
        try {
            if (sessionStorage.getItem(FIRST_VISIT_KEY) === 'true') {
                return true;
            }
        } catch (e) {}
        
        return false;
    }
    
    function setFirstVisitAccepted() {
        try {
            localStorage.setItem(FIRST_VISIT_KEY, 'true');
        } catch (e) {
            try {
                sessionStorage.setItem(FIRST_VISIT_KEY, 'true');
            } catch (e2) {}
        }
    }
    
    if (isFirstVisitAccepted()) {
        return;
    }
    
    function getBasePath() {
        return window.location.pathname.includes('/pages/') ? '../' : './';
    }
    
    function createModal() {
        const basePath = getBasePath();
        
        const overlay = document.createElement('div');
        overlay.className = 'first-visit-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'first-visit-title');
        
        overlay.innerHTML = `
            <div class="first-visit-modal">
                <img class="first-visit-modal__logo" src="${basePath}assets/logo.png" alt="Scarlet's Basement Logo">
                
                <h2 class="first-visit-modal__title" id="first-visit-title">Nice to see you here!</h2>
                
                <div class="first-visit-modal__text">
                    <p style="margin-bottom: 0.75rem;">
                        <strong>Important:</strong> Scarlet's Basement is an independent companion tool and is 
                        <strong>not affiliated, associated, authorized, endorsed by, or in any way officially connected 
                        to Scratch or the Scratch Foundation</strong>.
                    </p>
                    <p style="margin-bottom: 0.75rem;">
                        This service acts as a filtering layer on top of Scratch's public information. By using this tool, 
                        you acknowledge that search results depend entirely on the public Scratch API and may be incomplete 
                        or outdated.
                    </p>
                    <p>
                        <strong>By continuing to use this site, you accept our terms of service and privacy policies.</strong> 
                        For more details, visit our <a href="./pages/about.html" style="color: var(--color-btn-green); font-weight: 700;">About page</a>.
                    </p>
                </div>
                
                <button class="first-visit-modal__btn" id="first-visit-accept-btn" type="button">
                    Understood!
                </button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        requestAnimationFrame(() => {
            overlay.classList.add('is-visible');
        });
        
        const acceptBtn = overlay.querySelector('#first-visit-accept-btn');
        acceptBtn.addEventListener('click', () => {
            overlay.classList.remove('is-visible');
            setFirstVisitAccepted();
            setTimeout(() => {
                overlay.remove();
            }, 300);
        });
        
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                acceptBtn.click();
            }
        });
        
        setTimeout(() => acceptBtn.focus(), 100);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createModal);
    } else {
        createModal();
    }
    
    window.resetFirstVisitModal = function() {
        try {
            localStorage.removeItem(FIRST_VISIT_KEY);
        } catch (e) {}
        try {
            sessionStorage.removeItem(FIRST_VISIT_KEY);
        } catch (e) {}
    };
    
})();