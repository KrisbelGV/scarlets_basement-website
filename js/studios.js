function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

const REGEX_HASHTAG = /(?<=#)\w+/g;
const MAX_TAGS = 3;
const BATCH_SIZE = 8;
const MAX_CACHED_STUDIOS = 24;
const STUDIO_CACHE_KEY = 'scarlet_last_studio';
const STUDIO_CACHE_MAX_AGE = 30 * 60 * 1000;

function loadCachedStudios() {
    try {
        const cached = sessionStorage.getItem(STUDIO_CACHE_KEY);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp > STUDIO_CACHE_MAX_AGE) {
            sessionStorage.removeItem(STUDIO_CACHE_KEY);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

function saveToStudioCache(studios, projectId, tags = []) {
    try {
        const existing = loadCachedStudios();
        let allCached = existing ? existing.studios : [];
        
        const newIds = new Set(studios.map(s => s.id));
        allCached = allCached.filter(s => !newIds.has(s.id));
        allCached = [...studios, ...allCached];
        allCached = allCached.slice(0, MAX_CACHED_STUDIOS);
        
        const cacheData = {
            studios: allCached,
            projectId: projectId,
            tags: tags,
            timestamp: Date.now()
        };
        sessionStorage.setItem(STUDIO_CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {}
}

function showCachedStudios() {
    const cached = loadCachedStudios();
    if (!cached || cached.studios.length === 0) return false;
    
    const cacheNote = document.createElement('p');
    cacheNote.style.cssText = 'text-align: center; color: var(--color-warn-text); font-size: 0.85rem; margin-bottom: 8px; font-style: italic;';
    
    let noteText = `Showing recent results for project #${cached.projectId}`;
    if (cached.tags && cached.tags.length > 0) {
        noteText += ` (tags: ${cached.tags.join(', ')})`;
    }
    noteText += '. Start a new search to refresh.';
    cacheNote.textContent = noteText;
    
    studioSection.appendChild(cacheNote);
    
    allStudios = cached.studios;
    currentBatch = 0;
    
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'studio-results-container';
    
    const grid = document.createElement('div');
    grid.className = 'studio-results-grid';
    grid.id = 'studio-results-grid';
    
    loadStudioBatch(grid);
    
    resultsContainer.appendChild(grid);
    
    if (allStudios.length > BATCH_SIZE) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.textContent = 'Show more';
        loadMoreBtn.className = 'studio-btn-load-more';
        loadMoreBtn.addEventListener('click', () => loadStudioBatch(grid, loadMoreBtn));
        resultsContainer.appendChild(loadMoreBtn);
    }
    
    studioSection.appendChild(resultsContainer);
    return true;
}

const studioToggleBtn = document.querySelector('#toggle-studio-options');
const studioAdvancedOptions = document.querySelector('#studio-advanced-options');

if (studioToggleBtn && studioAdvancedOptions) {
    studioToggleBtn.addEventListener('click', () => {
        studioAdvancedOptions.classList.toggle('is-visible');
        studioToggleBtn.classList.toggle('is-active');
        const isExpanded = studioAdvancedOptions.classList.contains('is-visible');
        studioToggleBtn.setAttribute('aria-expanded', isExpanded);
    });
}

const studioOptionCards = document.querySelectorAll('.studio-option-card');
studioOptionCards.forEach(card => {
    const input = card.querySelector('input[type="text"]');
    const addButton = card.querySelector('.studio-btn--small');
    const list = card.querySelector('.studio-dynamic-list');

    if (addButton && input && list) {
        addButton.addEventListener('click', () => {
            const value = input.value.trim();
            if (value === "") return;

            const items = list.querySelectorAll('li');
            
            if (items.length >= MAX_TAGS) {
                showApiMessage(`<strong>Tag limit reached:</strong> You can only add up to ${MAX_TAGS} tags.`, 5000);
                return;
            }

            const firstWord = value.split(/\s+/)[0];
            const cleanValue = firstWord.startsWith('#') ? firstWord.substring(1) : firstWord;
            
            if (cleanValue.length === 0) return;
            
            const exists = Array.from(items).some(li => {
                const span = li.querySelector('span');
                return span && span.textContent.trim() === cleanValue;
            });

            if (exists) {
                showApiMessage('<strong>Duplicate tag:</strong> This tag has already been added.', 5000);
                return;
            }

            const newItem = document.createElement('li');
            newItem.className = 'studio-dynamic-item';
            newItem.innerHTML = `<span>${escapeHTML(cleanValue)}</span>`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'studio-btn-delete-item';
            deleteBtn.addEventListener('click', () => {
                newItem.remove();
            });

            newItem.appendChild(deleteBtn);
            list.appendChild(newItem);
            input.value = "";
        });
    }
});

const studioForm = document.querySelector('.studio-form');
const studioSection = document.querySelector('.studio-section');

let allStudios = [];
let currentBatch = 0;

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

if (studioForm && studioSection) {
    studioForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const searchBtn = studioForm.querySelector('.studio-btn[type="submit"]');
        if (lockedButtons && lockedButtons.has(searchBtn)) return;
        lockButton(searchBtn, 6000);

        const existingResults = document.querySelector('.studio-results-container');
        if (existingResults) existingResults.remove();
        
        const existingLoader = document.querySelector('.studio-loader-container');
        if (existingLoader) existingLoader.remove();
        
        const existingNoResults = document.querySelector('.no-results-message');
        if (existingNoResults) existingNoResults.remove();
        
        const existingMsg = document.querySelector('.api-message-container');
        if (existingMsg) existingMsg.remove();

        const projectId = document.querySelector('#studio-id').value.trim();
        if (!projectId) {
            showApiMessage('<strong>Project ID required:</strong> Please enter a Scratch project ID.', 8000);
            return;
        }

        const idNum = Number(projectId);
        if (!Number.isInteger(idNum) || idNum <= 0 || idNum >= 10000000000) {
            showApiMessage('<strong>Invalid project ID:</strong> Project IDs must be between 1 and 9,999,999,999.', 8000);
            return;
        }

        const tags = [];
        const tagList = document.querySelectorAll('.studio-dynamic-item span');
        tagList.forEach(span => {
            const text = span.textContent.trim();
            if (text) tags.push(text);
        });

        if (tags.length > MAX_TAGS) {
            showApiMessage(`<strong>Too many tags:</strong> You can only search with up to ${MAX_TAGS} tags. Please remove ${tags.length - MAX_TAGS}.`, 8000);
            return;
        }

        const loader = document.createElement('div');
        loader.className = 'studio-loader-container';
        loader.innerHTML = `
            <div class="studio-loader-card">
                <div class="studio-spinner"></div>
                <p style="color: var(--color-base-black); font-weight: 700;">Finding studios, please wait...</p>
            </div>
        `;
        studioSection.appendChild(loader);

        try {
            const data = await api.findStudio(projectId, tags);

            loader.remove();

            const results = data.results;
            if (results === 'No search results' || !Array.isArray(results) || results.length === 0) {
                showNoResultsMessage(studioSection, 'No studios found.');
                return;
            }

            allStudios = results;
            currentBatch = 0;
            
            const studiosToCache = allStudios.slice(0, MAX_CACHED_STUDIOS);
            saveToStudioCache(studiosToCache, projectId, tags);
            
            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'studio-results-container';
            
            const grid = document.createElement('div');
            grid.className = 'studio-results-grid';
            grid.id = 'studio-results-grid';
            
            loadStudioBatch(grid);
            
            resultsContainer.appendChild(grid);
            
            if (allStudios.length > BATCH_SIZE) {
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.textContent = 'Show more';
                loadMoreBtn.className = 'studio-btn-load-more';
                loadMoreBtn.addEventListener('click', () => loadStudioBatch(grid, loadMoreBtn));
                resultsContainer.appendChild(loadMoreBtn);
            }
            
            studioSection.appendChild(resultsContainer);

        } catch (error) {
            loader.remove();
            
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
            } else if (error.message === 'No project or user tags') {
                showApiMessage('<strong>No tags found:</strong> This project has no tags in its title, description or instructions. Add tags manually or try a different project.');
            } else if (error.message === 'USER_NOT_FOUND') {
                showApiMessage('<strong>Project not found:</strong> This project ID does not exist on Scratch.');
            } else if (error.message === 'Invalid project ID') {
                showApiMessage('<strong>Invalid project ID:</strong> Please enter a valid Scratch project ID.');
            } else if (error.message === 'Too many tags') {
                showApiMessage(`<strong>Too many tags:</strong> You can only search with up to ${MAX_TAGS} tags.`, 8000);
            } else if (error.message === 'Tag contains invalid characters') {
                showApiMessage('<strong>Invalid tag:</strong> A tag contains invalid characters.', 8000);
            } else if (error.message === 'Invalid tag format') {
                showApiMessage('<strong>Invalid tag:</strong> Please enter a valid tag.', 8000);
            } else {
                showApiMessage(`<strong>Error:</strong> ${error.message}`);
            }
        }
    });
}

function loadStudioBatch(grid, loadMoreBtn) {
    const start = currentBatch * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const batch = allStudios.slice(start, end);
    
    batch.forEach(studio => {
        const card = createStudioCard(studio);
        grid.appendChild(card);
    });
    
    currentBatch++;
    
    if (loadMoreBtn && end >= allStudios.length) {
        loadMoreBtn.remove();
    }
}

function createStudioCard(studio) {
    const basePath = getBasePath();
    const link = document.createElement('a');
    link.className = 'studio-link';
    link.href = `https://scratch.mit.edu/studios/${studio.id}`;
    link.target = '_blank';
    
    const card = document.createElement('div');
    card.className = 'studio-card';
    card.innerHTML = `
        <img src="https://uploads.scratch.mit.edu/get_image/gallery/${studio.id}_480x360.png" 
             alt="Studio thumbnail" class="studio-card-img"
             onerror="this.src='${basePath}assets/default_thumbnail.svg'">
        <h3 class="studio-card-title">${escapeHTML(studio.title)}</h3>
    `;
    
    link.appendChild(card);
    return card;
}

if (studioSection) {
    showCachedStudios();
}