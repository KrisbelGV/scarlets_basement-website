function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function createIndexedLoader(container, message = 'Checking index status, please wait') {
    const existingLoader = document.querySelector('.indexed-loader-container');
    if (existingLoader) existingLoader.remove();
    
    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'indexed-loader-container';
    loaderContainer.innerHTML = `
        <div class="indexed-loader-card">
            <div class="indexed-spinner"></div>
            <p class="indexed-loader-message">${message}</p>
        </div>
    `;
    container.appendChild(loaderContainer);
    return loaderContainer;
}

const indexedForm = document.querySelector('.indexed-form');
const indexedSection = document.querySelector('.indexed-section');

if (indexedForm && indexedSection) {
    indexedForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = indexedForm.querySelector('.indexed-btn[type="submit"]');
        if (lockedButtons && lockedButtons.has(submitBtn)) return;
        lockButton(submitBtn, 6000);

        const existingResult = document.querySelector('.indexed-result-container');
        if (existingResult) existingResult.remove();
        
        const existingLoader = document.querySelector('.indexed-loader-container');
        if (existingLoader) existingLoader.remove();
        
        const existingMsg = document.querySelector('.api-message-container');
        if (existingMsg) existingMsg.remove();

        const projectId = document.querySelector('#indexed-id').value.trim();
        if (!projectId) {
            showApiMessage('<strong>Project ID required:</strong> Please enter a Scratch project ID.', 8000);
            return;
        }

        const idNum = Number(projectId);
        if (!Number.isInteger(idNum) || idNum <= 0 || idNum >= 10000000000) {
            showApiMessage('<strong>Invalid project ID:</strong> Project IDs must be between 1 and 9,999,999,999.', 8000);
            return;
        }

        const loader = createIndexedLoader(indexedSection);

        try {
            const data = await api.checkIndex(projectId);

            loader.remove();

            const result = data.results;
            const isIndexed = data.message === 'Index';
            const projectData = result.projectId ? result : (result.results || result);
            
            if (!projectData.projectId && !result.projectId) {
                if (data.aborted) {
                    showApiMessage('<strong>Request timeout:</strong> The check was interrupted. Could not verify index status. Please try again.', 8000);
                } else {
                    showApiMessage('<strong>Project not found:</strong> This project ID does not exist on Scratch.', 8000);
                }
                return;
            }
            
            const resultContainer = document.createElement('div');
            resultContainer.className = 'indexed-result-container';
            
            const link = document.createElement('a');
            link.className = 'project-link';
            link.href = `https://scratch.mit.edu/projects/${projectId}`;
            link.target = '_blank';
            
            const card = document.createElement('div');
            card.className = 'indexed-project-card';
            
            const title = projectData.title || 'Untitled Project';
            const author = projectData.userName || 'Unknown';
            const userId = projectData.userId;
            const stats = projectData.stats || {};
            
            card.innerHTML = `
                <img src="https://uploads.scratch.mit.edu/get_image/project/${projectData.projectId || projectId}_480x360.png" 
                     alt="Project thumbnail" class="indexed-project-thumbnail"
                     onerror="this.src='${getBasePath()}assets/default_thumbnail.svg'">
                
                <div class="indexed-project-info">
                    <img src="${userId ? `https://uploads.scratch.mit.edu/get_image/user/${userId}_48x48.png` : getBasePath() + 'assets/default_profile.svg'}" 
                         alt="Author profile" class="indexed-project-profile"
                         onerror="this.src='${getBasePath()}assets/default_profile.svg'">
                    <div class="indexed-project-details">
                        <h2 class="indexed-project-title">${escapeHTML(title)}</h2>
                        <p class="indexed-project-author">${escapeHTML(author)}</p>
                    </div>
                </div>
                
                <div class="indexed-project-stats">
                    <div class="indexed-stat-item">
                        <img src="${getBasePath()}assets/view.svg" alt="Views" class="indexed-stat-icon">
                        <span class="indexed-stat-value">${stats.views ? stats.views.toLocaleString() : '...'}</span>
                    </div>
                    <div class="indexed-stat-item">
                        <img src="${getBasePath()}assets/heart.svg" alt="Loves" class="indexed-stat-icon">
                        <span class="indexed-stat-value">${stats.loves ? stats.loves.toLocaleString() : '...'}</span>
                    </div>
                    <div class="indexed-stat-item">
                        <img src="${getBasePath()}assets/star.svg" alt="Stars" class="indexed-stat-icon">
                        <span class="indexed-stat-value">${stats.favorites ? stats.favorites.toLocaleString() : '...'}</span>
                    </div>
                    <div class="indexed-stat-item">
                        <img src="${getBasePath()}assets/remix.svg" alt="Remixes" class="indexed-stat-icon">
                        <span class="indexed-stat-value">${stats.remixes ? stats.remixes.toLocaleString() : '...'}</span>
                    </div>
                </div>
                
                <div class="indexed-status ${isIndexed ? 'indexed-status--success' : 'indexed-status--warning'}">
                    ${isIndexed ? '✓ This project is indexed' : '⚠ This project is not indexed'}
                </div>
            `;
            
            link.appendChild(card);
            resultContainer.appendChild(link);
            indexedSection.appendChild(resultContainer);

        } catch (error) {
            loader.remove();
            
            // Manejar errores globales de retry
            if (error.message.startsWith('GLOBAL_RETRY:')) {
                const parts = error.message.split(':');
                const seconds = parseInt(parts[1]);
                const reason = parts[2] || 'unknown';
                lockAllButtons(seconds, reason);
                return;
            }
            
            if (error.message.startsWith('SCRATCH_DOWN:')) {
                const seconds = parseInt(error.message.split(':')[1]);
                lockAllButtons(seconds, 'scratch_down');
                return;
            }
            
            if (error.message.startsWith('UPSTASH_EXHAUSTED:')) {
                const parts = error.message.split(':');
                const seconds = parseInt(parts[1]);
                const reason = parts[2] || 'upstash_daily';
                lockAllButtons(seconds, reason);
                return;
            }
            
            if (error.message === 'MAX_ATTEMPTS') {
                showApiMessage('<strong>Server is busy:</strong> The server is processing another request. Please try again in a few seconds.', 8000);
            } else if (error.message === 'TOO_MANY_REQUESTS') {
                showApiMessage('<strong>Too many requests:</strong> Please wait for your current request to finish before making a new one.', 8000);
            } else if (error.message === 'RATE_LIMIT') {
                showApiMessage('<strong>Daily limit reached:</strong> Please try again tomorrow.');
            } else if (error.message === 'Request timeout') {
                showApiMessage('<strong>Request timeout:</strong> The server took too long to respond. Please try again.');
            } else if (error.message === 'USER_NOT_FOUND' || error.message === 'NOT_FOUND') {
                showApiMessage('<strong>Project not found:</strong> This project ID does not exist on Scratch.');
            } else if (error.message === 'Invalid project ID') {
                showApiMessage('<strong>Invalid project ID:</strong> Please enter a valid Scratch project ID.');
            } else {
                showApiMessage(`<strong>Error:</strong> ${error.message}`);
            }
        }
    });
}