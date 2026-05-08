const API_BASE_URL = 'https://scarlets-basement-proxy.vercel.app/api';

const api = {
  _globalRetryUntil: null,
  
  async request(endpoint, options = {}) {
    if (this._globalRetryUntil && Date.now() < this._globalRetryUntil) {
      const remaining = Math.ceil((this._globalRetryUntil - Date.now()) / 1000);
      const cached = JSON.parse(localStorage.getItem('scarlet_global_retry') || '{}');
      const reason = cached.reason || 'unknown';
      throw new Error('GLOBAL_RETRY:' + remaining + ':' + reason);
    }
    
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (response.ok) {
          return await response.json();
        }

        const errorData = await response.json().catch(() => ({}));
        const retryAfter = response.headers.get('Retry-After');

        if (response.status === 404) {
          throw new Error(errorData.code === 'NOT_FOUND' ? 'NOT_FOUND' : 'USER_NOT_FOUND');
        }

        if (response.status === 422) {
          throw new Error(errorData.error || 'Invalid request');
        }

        if (response.status === 429 && errorData.code === 'TOO_MANY_REQUESTS') {
          throw new Error('TOO_MANY_REQUESTS');
        }

        if (response.status === 429) {
          api.onRateLimit?.();
          return { results: 'No search results' };
        }

        if (response.status === 502 && errorData.code === 'SCRATCH_DOWN') {
          const waitSeconds = retryAfter || errorData.details?.retryAfterSeconds || 30;
          this._cacheGlobalRetry(waitSeconds, 'scratch_down');
          throw new Error('SCRATCH_DOWN:' + waitSeconds);
        }

        if (response.status === 502 && errorData.code === 'UPSTASH_EXHAUSTED') {
          const waitSeconds = retryAfter || errorData.details?.retryAfterSeconds || 3600;
          const reason = waitSeconds <= 86400 ? 'upstash_daily' : 'upstash_monthly';
          this._cacheGlobalRetry(waitSeconds, reason);
          throw new Error('UPSTASH_EXHAUSTED:' + waitSeconds + ':' + reason);
        }

        if (response.status === 503 && errorData.code === 'SERVER_BUSY') {
          if (attempts >= maxAttempts - 1) {
            throw new Error('MAX_ATTEMPTS');
          }
          
          const waitTime = ((retryAfter || errorData.details?.retryAfterSeconds || 6) * 1000) - 500;
          
          attempts++;
          await new Promise(resolve => setTimeout(resolve, Math.max(0, waitTime)));
          continue;
        }

        if (response.status === 503) {
          throw new Error(errorData.error || 'Service unavailable');
        }

        throw new Error(errorData.error || `Request failed with status ${response.status}`);

      } catch (error) {
        if (error.message.startsWith('GLOBAL_RETRY:') ||
            error.message.startsWith('SCRATCH_DOWN:') ||
            error.message.startsWith('UPSTASH_EXHAUSTED:')) {
          throw error;
        }
        
        if (error.message === 'USER_NOT_FOUND' || 
            error.message === 'NOT_FOUND' ||
            error.message === 'Invalid request' ||
            error.message === 'TOO_MANY_REQUESTS' ||
            error.message === 'MAX_ATTEMPTS') {
          throw error;
        }

        if (error.name === 'AbortError') {
          if (attempts >= maxAttempts - 1) {
            throw new Error('Request timeout');
          }
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 6000));
          continue;
        }

        if (attempts >= maxAttempts - 1) {
          throw error;
        }
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 6000));
      }
    }

    throw new Error('Maximum attempts reached');
  },

  _cacheGlobalRetry(seconds, reason) {
    const retryUntil = Date.now() + (seconds * 1000);
    
    if (!this._globalRetryUntil || retryUntil > this._globalRetryUntil) {
      this._globalRetryUntil = retryUntil;
      
      try {
        const cacheData = {
          retryUntil: retryUntil,
          reason: reason,
          timestamp: Date.now()
        };
        localStorage.setItem('scarlet_global_retry', JSON.stringify(cacheData));
      } catch (e) {}
      
      if (seconds <= 3600) {
        const remaining = seconds * 1000;
        setTimeout(() => {
          this._globalRetryUntil = null;
          try { localStorage.removeItem('scarlet_global_retry'); } catch (e) {}
        }, remaining);
      }
    }
  },

  _loadCachedRetry() {
    try {
      const cached = localStorage.getItem('scarlet_global_retry');
      if (cached) {
        const cacheData = JSON.parse(cached);
        const retryUntil = cacheData.retryUntil;
        const cacheAge = Date.now() - cacheData.timestamp;
        
        if (cacheAge > 86400000) {
          localStorage.removeItem('scarlet_global_retry');
          return;
        }
        
        if (retryUntil > Date.now()) {
          this._globalRetryUntil = retryUntil;
          const remaining = retryUntil - Date.now();
          
          if (remaining <= 3600000) {
            setTimeout(() => {
              this._globalRetryUntil = null;
              try { localStorage.removeItem('scarlet_global_retry'); } catch (e) {}
            }, remaining);
          }
        } else {
          localStorage.removeItem('scarlet_global_retry');
        }
      }
    } catch (e) {}
  },

  onRateLimit: null,

  getUserData(username) {
    return this.request(`/userdata/${encodeURIComponent(username)}`);
  },

  searchProjects(params, discard = [], profiles = []) {
    const queryParts = [];
    
    for (const [key, value] of Object.entries(params)) {
      queryParts.push(`${key}=${encodeURIComponent(value)}`);
    }
    
    for (const word of discard) {
      queryParts.push(`discard=${encodeURIComponent(word)}`);
    }
    
    for (const profile of profiles) {
      queryParts.push(`profile=${encodeURIComponent(profile)}`);
    }
    
    const queryString = queryParts.join('&');
    return this.request(`/search?${queryString}`);
  },

  findStudio(projectId, tags = []) {
    const queryString = tags.map(tag => `tag=${encodeURIComponent(tag)}`).join('&');
    return this.request(`/findastudio/${projectId}${queryString ? '?' + queryString : ''}`);
  },

  checkIndex(projectId) {
    return this.request(`/isitindex/${projectId}`);
  },

  getFollowingProjects(username) {
    return this.request(`/anewview/${encodeURIComponent(username)}`);
  }
};

api._loadCachedRetry();