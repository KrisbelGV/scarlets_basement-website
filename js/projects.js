function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
}

function createLoader(container, message = 'Loading projects, please wait') {
    const loaderContainer = document.createElement('div');
    loaderContainer.className = 'loader-container';
    loaderContainer.innerHTML = `
        <div class="loader-card">
            <div class="spinner"></div>
            <p style="color: var(--color-base-black); font-weight: 700;">${message}</p>
        </div>
    `;
    container.appendChild(loaderContainer);
    return loaderContainer;
}

function showNoResultsMessage(container, message, duration = 8000) {
    const existingMsg = container.querySelector('.no-results-message');
    if (existingMsg) existingMsg.remove();
    
    const noResults = document.createElement('p');
    noResults.className = 'no-results-message';
    noResults.style.cssText = 'text-align: center; color: var(--color-base-black); padding: 2rem; font-weight: 700;';
    noResults.textContent = message;
    container.appendChild(noResults);
    
    if (duration > 0) {
        setTimeout(() => {
            if (noResults.parentNode) {
                noResults.remove();
            }
        }, duration);
    }
    
    return noResults;
}

function renderCachedView(container, cacheData) {
    const allProjects = cacheData.projects;
    
    const existingMsg = container.querySelector('.no-results-message');
    if (existingMsg) existingMsg.remove();
    
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'results-container';
    
    const grid = document.createElement('div');
    grid.className = 'results-grid';
    
    allProjects.forEach(project => {
        const card = createFollowingProjectCard(project);
        grid.appendChild(card);
    });
    
    resultsContainer.appendChild(grid);
    container.appendChild(resultsContainer);
    
    if (cacheData.aborted) {
        const note = document.createElement('p');
        note.className = 'no-results-message';
        note.style.cssText = 'text-align: center; color: var(--color-warn-text); font-size: 0.85rem; margin-top: 1rem; font-style: italic;';
        note.textContent = 'Cached results. Some data may be incomplete.';
        container.appendChild(note);
        
        setTimeout(() => {
            if (note.parentNode) {
                note.remove();
            }
        }, 8000);
    }
}

async function loadFollowingProjects(container, username) {
    const cached = localStorage.getItem('scarlet_view_cache');
    if (cached) {
        try {
            const cacheData = JSON.parse(cached);
            if (Date.now() - cacheData.timestamp < 24 * 60 * 60 * 1000 && cacheData.username === username) {
                renderCachedView(container, cacheData);
                
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.textContent = 'Show more (load fresh)';
                loadMoreBtn.className = 'btn-load-more';
                loadMoreBtn.addEventListener('click', () => {
                    container.querySelector('.results-container').remove();
                    loadMoreBtn.remove();
                    loadFollowingProjectsFresh(container, username);
                });
                container.appendChild(loadMoreBtn);
                return;
            }
        } catch (e) {}
    }
    
    loadFollowingProjectsFresh(container, username);
}

async function loadFollowingProjectsFresh(container, username) {
    const loader = createLoader(container, 'Loading projects from your following, please wait...');
    
    try {
        const data = await api.getFollowingProjects(username);
        
        loader.remove();

        const results = data.results;
        
        if (results === 'No search results' || !Array.isArray(results) || results.length === 0) {
            if (data.aborted) {
                showApiMessage('<strong>Request timeout:</strong> The request was interrupted. No projects from your following could be loaded. Please try again.', 8000);
            } else {
                showNoResultsMessage(container, 'No projects found from your following.');
            }
            return;
        }
        
        const allProjects = [];
        results.forEach(profile => {
            profile.projects.forEach(project => {
                allProjects.push({
                    projectId: project.projectId,
                    title: project.title,
                    userName: profile.userName,
                    userId: profile.id
                });
            });
        });
        
        if (allProjects.length === 0) {
            if (data.aborted) {
                showApiMessage('<strong>Request timeout:</strong> The request was interrupted. No projects from your following could be loaded. Please try again.', 8000);
            } else {
                showNoResultsMessage(container, 'No projects found from your following.');
            }
            return;
        }
        
        let currentBatch = 0;
        const BATCH_SIZE = 8;
        
        const existingMsg = container.querySelector('.no-results-message');
        if (existingMsg) existingMsg.remove();
        
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-container';
        
        const grid = document.createElement('div');
        grid.className = 'results-grid';
        
        function loadBatch() {
            const start = currentBatch * BATCH_SIZE;
            const end = start + BATCH_SIZE;
            const batch = allProjects.slice(start, end);
            
            batch.forEach(project => {
                const card = createFollowingProjectCard(project);
                grid.appendChild(card);
            });
            
            currentBatch++;
            
            if (end >= allProjects.length && loadMoreBtn) {
                loadMoreBtn.remove();
            }
        }
        
        loadBatch();

        const cacheView = {
            projects: allProjects.slice(0, 8),
            username: username,
            totalCount: allProjects.length,
            aborted: data.aborted,
            timestamp: Date.now()
        };
        localStorage.setItem('scarlet_view_cache', JSON.stringify(cacheView));
        
        resultsContainer.appendChild(grid);
        
        let loadMoreBtn = null;
        if (allProjects.length > BATCH_SIZE) {
            loadMoreBtn = document.createElement('button');
            loadMoreBtn.textContent = 'Show more';
            loadMoreBtn.className = 'btn-load-more';
            loadMoreBtn.addEventListener('click', () => loadBatch());
            resultsContainer.appendChild(loadMoreBtn);
        }
        
        container.appendChild(resultsContainer);
        
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
        } else if (error.message === 'USER_NOT_FOUND') {
            showApiMessage('<strong>User not found:</strong> Your cached session is invalid. Please log in again.');
        } else {
            showApiMessage(`<strong>Error:</strong> ${error.message}`);
        }
    }
}

function createFollowingProjectCard(project) {
    const basePath = getBasePath();
    const link = document.createElement('a');
    link.className = 'project-link';
    link.href = `https://scratch.mit.edu/projects/${project.projectId}`;
    link.target = '_blank';
    
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
        <img src="https://uploads.scratch.mit.edu/get_image/project/${project.projectId}_480x360.png" 
             alt="Project thumbnail" class="project-img"
             onerror="this.src='${basePath}assets/default_thumbnail.svg'">
        <div class="card-body">
            <img src="https://uploads.scratch.mit.edu/get_image/user/${project.userId}_32x32.png" 
                 alt="Profile" class="profile-icon"
                 onerror="this.src='${basePath}assets/default_profile.svg'">
            <div class="card-header">
                <h2>${escapeHTML(project.title)}</h2>
                <h3>${escapeHTML(project.userName)}</h3>
            </div>
        </div>
    `;
    
    link.appendChild(card);
    return link;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}