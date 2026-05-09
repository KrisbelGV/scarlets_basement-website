function getBasePath() {
    return window.location.pathname.includes('/pages/') ? '../' : './';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

const USERNAME_REGEX = /^[a-zA-Z0-9-_]+$/;
const MAX_DISCARD_WORDS = 10;
const MAX_PROFILES = 5;
const BATCH_SIZE = 8;
const MAX_CACHED_BATCHES = 3;
const MAX_CACHED_RESULTS = MAX_CACHED_BATCHES * BATCH_SIZE;
const CACHE_KEY = 'scarlet_last_search';
const CACHE_MAX_AGE = 30 * 60 * 1000;

function isValidUsername(username) {
    return typeof username === 'string' && 
           username.length >= 3 && 
           username.length <= 30 && 
           USERNAME_REGEX.test(username);
}

function loadCachedSearch() {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp > CACHE_MAX_AGE) {
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data;
    } catch (e) {
        return null;
    }
}

function saveToSearchCache(results, query, discard = [], profiles = []) {
    try {
        const existing = loadCachedSearch();
        let allCached = existing ? existing.results : [];
        
        const newIds = new Set(results.map(r => r.projectId));
        allCached = allCached.filter(r => !newIds.has(r.projectId));
        allCached = [...results, ...allCached];
        allCached = allCached.slice(0, MAX_CACHED_RESULTS);
        
        const cacheData = {
            results: allCached,
            query: query,
            discard: discard,
            profiles: profiles,
            timestamp: Date.now()
        };
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {}
}

function showCachedResults() {
    const cached = loadCachedSearch();
    if (!cached || cached.results.length === 0) return false;
    
    const cacheNote = document.createElement('p');
    cacheNote.className = 'search-note';
    cacheNote.style.cssText = 'text-align: center; color: var(--color-warn-text); font-size: 0.85rem; margin-bottom: 8px; font-style: italic;';
    
    let noteText = `Showing recent results for "${cached.query}"`;
    if (cached.discard && cached.discard.length > 0) {
        noteText += ` (excluding: ${cached.discard.join(', ')})`;
    }
    if (cached.profiles && cached.profiles.length > 0) {
        noteText += ` (from: ${cached.profiles.join(', ')})`;
    }
    noteText += '. Start a new search to refresh.';
    cacheNote.textContent = noteText;
    
    searchSection.appendChild(cacheNote);
    
    allResults = cached.results;
    currentBatch = 0;
    lastQuery = cached.query;
    
    const resultsContainer = document.createElement('div');
    resultsContainer.className = 'results-container';
    resultsContainer.id = 'search-results';
    
    const grid = document.createElement('div');
    grid.className = 'results-grid';
    grid.id = 'results-grid';
    
    loadBatch(grid);
    
    resultsContainer.appendChild(grid);
    
    if (allResults.length > BATCH_SIZE) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.textContent = 'Show more';
        loadMoreBtn.className = 'btn-load-more';
        loadMoreBtn.addEventListener('click', () => loadBatch(grid, loadMoreBtn));
        resultsContainer.appendChild(loadMoreBtn);
    }
    
    searchSection.appendChild(resultsContainer);
    return true;
}

const toggleBtn = document.querySelector('#toggle-options');
const advancedOptions = document.querySelector('#advanced-options');

if (toggleBtn && advancedOptions) {
    toggleBtn.addEventListener('click', () => {
        advancedOptions.classList.toggle('is-visible');
        toggleBtn.classList.toggle('is-active');
        const isExpanded = advancedOptions.classList.contains('is-visible');
        toggleBtn.setAttribute('aria-expanded', isExpanded);
    });
}

const optionCards = document.querySelectorAll('.option-card');
optionCards.forEach((card, index) => {
    const input = card.querySelector('input[type="text"]');
    const addButton = card.querySelector('.search-btn:not(.search-btn--minus)');
    const list = card.querySelector('.dynamic-list');

    if (addButton && input && list) {
        addButton.addEventListener('click', () => {
            const value = input.value.trim();
            if (value === "") return;
            
            const isProfileList = index === 0;
            const isDiscardList = index === 1;
            const items = Array.from(list.querySelectorAll('li'));
            
            if (isProfileList && items.length >= MAX_PROFILES) {
                showApiMessage(`<strong>Profile limit reached:</strong> You can only add up to ${MAX_PROFILES} profiles.`, 5000);
                return;
            }
            
            if (isDiscardList && items.length >= MAX_DISCARD_WORDS) {
                showApiMessage(`<strong>Discard limit reached:</strong> You can only add up to ${MAX_DISCARD_WORDS} discard words.`, 5000);
                return;
            }
            
            if (isProfileList && !isValidUsername(value)) {
                showApiMessage('<strong>Invalid username format:</strong> Usernames must be 3-30 characters long and can only contain letters, numbers, hyphens and underscores.', 8000);
                return;
            }
            
            const exists = items.some(li => {
                const span = li.querySelector('span');
                return span && span.textContent.trim() === value;
            });
            
            if (exists) {
                if (isProfileList) {
                    showApiMessage('<strong>Duplicate profile:</strong> This profile has already been added.', 5000);
                } else {
                    showApiMessage('<strong>Duplicate word:</strong> This discard word has already been added.', 5000);
                }
                return;
            }
            
            const newItem = document.createElement('li');
            newItem.className = 'dynamic-item';
            newItem.innerHTML = `<span>${escapeHTML(value)}</span>`;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'btn-delete-item';
            deleteBtn.addEventListener('click', () => {
                newItem.remove();
            });

            newItem.appendChild(deleteBtn);
            list.appendChild(newItem);
            input.value = "";
        });
    }
});

const searchForm = document.querySelector('.search-form');
const searchSection = document.querySelector('.search-section');

let allResults = [];
let currentBatch = 0;
let lastQuery = '';

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

if (searchForm && searchSection) {
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const searchBtn = searchForm.querySelector('.search-btn[type="submit"]');
        if (lockedButtons && lockedButtons.has(searchBtn)) return;
        lockButton(searchBtn, 6000);

        const existingResults = document.querySelector('.results-container');
        if (existingResults) existingResults.remove();
        
        const existingLoader = document.querySelector('.loader-container');
        if (existingLoader) existingLoader.remove();
        
        const existingNote = document.querySelector('.search-note');
        if (existingNote) existingNote.remove();
        
        const existingNoResults = document.querySelector('.no-results-message');
        if (existingNoResults) existingNoResults.remove();
        
        const existingMsg = document.querySelector('.api-message-container');
        if (existingMsg) existingMsg.remove();

        const query = document.querySelector('#project-title').value.trim();
        if (!query) {
            showApiMessage('<strong>Search term required:</strong> Please enter a project title to search.', 8000);
            return;
        }

        const profiles = [];
        const profileList = document.querySelectorAll('.option-card:first-child .dynamic-item span');
        const invalidProfiles = [];
        profileList.forEach(span => {
            const name = span.textContent.trim();
            if (isValidUsername(name)) {
                profiles.push(name);
            } else {
                invalidProfiles.push(name);
            }
        });

        if (profiles.length > MAX_PROFILES) {
            showApiMessage(`<strong>Too many profiles:</strong> You can only search by up to ${MAX_PROFILES} profiles at a time. Please remove ${profiles.length - MAX_PROFILES}.`, 8000);
            return;
        }
        
        if (invalidProfiles.length > 0) {
            showApiMessage(`<strong>Invalid profile format:</strong> ${invalidProfiles.join(', ')}. Please remove them before searching.`, 8000);
            return;
        }

        const discard = [];
        const discardList = document.querySelectorAll('.option-card:last-child .dynamic-item span');
        const invalidDiscard = [];
        discardList.forEach(span => {
            const word = span.textContent.trim();
            if (word.toLowerCase() === query.toLowerCase()) {
                invalidDiscard.push(word);
            } else {
                discard.push(word);
            }
        });
        
        if (discard.length > MAX_DISCARD_WORDS) {
            showApiMessage(`<strong>Too many discard words:</strong> You can only search by up to ${MAX_DISCARD_WORDS} discard words at a time. Please remove ${discard.length - MAX_DISCARD_WORDS}.`, 8000);
            return;
        }
        
        if (invalidDiscard.length > 0) {
            showApiMessage(`<strong>Invalid discard format:</strong> "${invalidDiscard.join(', ')}" cannot be the same as your search query. Please remove them before searching.`, 8000);
            return;
        }

        const username = profiles.length > 0 ? getCachedUsername() : null;

        if (profiles.length > 0 && !username) {
            const profileItems = document.querySelectorAll('.option-card:first-child .dynamic-item span');
            const removedNames = [];
            profileItems.forEach(span => {
                removedNames.push(span.textContent.trim());
                const listItem = span.closest('.dynamic-item');
                if (listItem) listItem.remove();
            });
            showApiMessage(`<strong>Login required:</strong> You need to log in on the homepage before using "By following" search. Added profiles have been removed: ${removedNames.join(', ')}.`, 8000);
            return;
        }

        const loader = createLoader(searchSection, 'Searching projects, please wait...');

        try {
            const params = { q: query };
            if (username) params.username = username;
            
            const data = await api.searchProjects(params, discard, profiles);

            loader.remove();

            const results = data.results;
            
            if (results === 'No search results' || !Array.isArray(results) || results.length === 0) {
                if (data.aborted) {
                    showApiMessage('<strong>Request timeout:</strong> The search was interrupted. No results were retrieved. Please try again.', 8000);
                } else {
                    showNoResultsMessage(searchSection, 'No search results found.');
                }
                return;
            }

            const isProfileSearch = results[0]?.projects !== undefined;
            
            if (isProfileSearch) {
                allResults = [];
                const foundProfiles = new Set();
                
                results.forEach(profile => {
                    foundProfiles.add(profile.userName.toLowerCase());
                    profile.projects.forEach(project => {
                        allResults.push({
                            projectId: project.projectId,
                            title: project.title,
                            userName: profile.userName,
                            userId: profile.id
                        });
                    });
                });
                
                const missingProfiles = profiles.filter(p => !foundProfiles.has(p.toLowerCase()));

                if (missingProfiles.length > 0) {
                    missingProfiles.forEach(name => {
                        const profileItems = document.querySelectorAll('.option-card:first-child .dynamic-item span');
                        profileItems.forEach(span => {
                            if (span.textContent.trim().toLowerCase() === name.toLowerCase()) {
                                const listItem = span.closest('.dynamic-item');
                                if (listItem) listItem.remove();
                            }
                        });
                    });
                    
                    const missingList = missingProfiles.join(', ');
                    const isAll = missingProfiles.length === profiles.length;
                    
                    if (isAll) {
                        showApiMessage(`<strong>No following found:</strong> You are not following any of these profiles: ${missingList}. They have been removed from the list.`);
                        allResults = [];
                        return;
                    } else {
                        showApiMessage(`<strong>Some profiles removed:</strong> You are not following: ${missingList}. They have been removed from the list.`);
                    }
                }
            } else {
                allResults = results;
            }

            if (allResults.length === 0) {
                showNoResultsMessage(searchSection, 'No search results found.');
                return;
            }

            const resultsToCache = allResults.slice(0, MAX_CACHED_RESULTS);
            saveToSearchCache(resultsToCache, query, discard, profiles);
            lastQuery = query;

            currentBatch = 0;
            
            const existingNoResultsMsg = searchSection.querySelector('.no-results-message');
            if (existingNoResultsMsg) existingNoResultsMsg.remove();
            
            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'results-container';
            resultsContainer.id = 'search-results';
            
            const grid = document.createElement('div');
            grid.className = 'results-grid';
            grid.id = 'results-grid';
            
            loadBatch(grid);
            
            resultsContainer.appendChild(grid);
            
            if (allResults.length > BATCH_SIZE) {
                const loadMoreBtn = document.createElement('button');
                loadMoreBtn.textContent = 'Show more';
                loadMoreBtn.className = 'btn-load-more';
                loadMoreBtn.addEventListener('click', () => loadBatch(grid, loadMoreBtn));
                resultsContainer.appendChild(loadMoreBtn);
            }
            
            searchSection.appendChild(resultsContainer);

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
            } else if (error.message === 'Request timeout') {
                showApiMessage('<strong>Request timeout:</strong> The server took too long to respond. Please try again.');
            } else if (error.message === 'USER_NOT_FOUND') {
                showApiMessage('<strong>User not found:</strong> This Scratch account does not exist.');
            } else if (error.message === 'No following on profiles') {
                showApiMessage('<strong>No following found:</strong> You are not following any of these profiles.');
            } else if (error.message === 'Invalid discard format') {
                showApiMessage('<strong>Invalid discard:</strong> A discard word cannot be the same as your search query.');
            } else if (error.message === 'RATE_LIMIT') {
                showApiMessage('<strong>Daily limit reached:</strong> Please try again tomorrow.');
            } else if (error.message === 'Too many profiles') {
                showApiMessage('<strong>Too many profiles:</strong> You can only search by up to 5 profiles at a time.', 8000);
            } else if (error.message === 'Too many discard words') {
                showApiMessage('<strong>Too many discard words:</strong> You can only add up to 10 discard words.', 8000);
            } else if (error.message === 'Query contains invalid characters') {
                showApiMessage('<strong>Invalid query:</strong> Your search contains invalid characters.', 8000);
            } else if (error.message === 'Discard contains invalid characters') {
                showApiMessage('<strong>Invalid discard word:</strong> A discard word contains invalid characters.', 8000);
            } else if (error.message === 'Invalid query format' || error.message === 'Required query') {
                showApiMessage('<strong>Invalid search:</strong> Please enter a valid search term.', 8000);
            } else if (error.message === 'Invalid profile format') {
                showApiMessage('<strong>Invalid profile:</strong> One or more profile usernames are invalid. They have been removed.', 8000);
            } else {
                showApiMessage(`<strong>Error:</strong> ${error.message}`);
            }
        }
    });
}

function loadBatch(grid, loadMoreBtn) {
    const start = currentBatch * BATCH_SIZE;
    const end = start + BATCH_SIZE;
    const batch = allResults.slice(start, end);
    
    batch.forEach(project => {
        const card = createProjectCard(project);
        grid.appendChild(card);
    });
    
    currentBatch++;
    
    if (loadMoreBtn && end >= allResults.length) {
        loadMoreBtn.remove();
    }
}

function createProjectCard(project) {
    const basePath = getBasePath();
    const link = document.createElement('a');
    link.className = 'project-link';
    link.href = `https://scratch.mit.edu/projects/${project.projectId}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
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

if (searchSection) {
    showCachedResults();
}