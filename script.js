const challengesContainer = document.getElementById('challenges-container');
const searchInput = document.getElementById('search');
const clearSearchBtn = document.getElementById('clear-search');
const sortSelect = document.getElementById('sort-select');
const tagsContainer = document.getElementById('top-tags');
const statusTabsContainer = document.getElementById('status-tabs');
const emptyStateContainer = document.getElementById('empty-state');
const resetFiltersBtn = document.getElementById('reset-filters-btn');

// Stats Counters
const statsTotalEl = document.getElementById('stats-total');
const statsRunningEl = document.getElementById('stats-running');
const statsUpcomingEl = document.getElementById('stats-upcoming');

let fullData = [];
let activeStatus = 'all';
let activeTag = 'All';
let currentSearchKeyword = '';
let currentSortOption = 'popular';

fetch('strava_challenges.json')
  .then(res => res.json())
  .catch(() => fetch('https://raw.githubusercontent.com/rix4uni/stravac/refs/heads/main/strava_challenges.json').then(res => res.json()))
  .then(data => {
    // Keep only active challenges (running or upcoming)
    fullData = data.filter(c => c.status && c.status.toLowerCase() !== 'ended');

    updateStatsCounters(fullData);
    setupEventListeners();
    buildTagFilters(fullData);
    applyFiltersAndRender();
  });

function updateStatsCounters(data) {
  const total = data.length;
  const running = data.filter(c => c.status && c.status.toLowerCase() === 'running').length;
  const upcoming = data.filter(c => c.status && c.status.toLowerCase() === 'upcoming').length;

  if (statsTotalEl) statsTotalEl.textContent = total;
  if (statsRunningEl) statsRunningEl.textContent = running;
  if (statsUpcomingEl) statsUpcomingEl.textContent = upcoming;
}

function setupEventListeners() {
  // Status tab clicks
  if (statusTabsContainer) {
    statusTabsContainer.querySelectorAll('.status-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        statusTabsContainer.querySelectorAll('.status-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeStatus = tab.dataset.status;
        applyFiltersAndRender();
      });
    });
  }

  // Search input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearchKeyword = searchInput.value.trim().toLowerCase();
      if (clearSearchBtn) {
        clearSearchBtn.style.display = currentSearchKeyword ? 'block' : 'none';
      }
      applyFiltersAndRender();
    });
  }

  // Clear search
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      currentSearchKeyword = '';
      clearSearchBtn.style.display = 'none';
      applyFiltersAndRender();
    });
  }

  // Custom Sort Dropdown
  const sortDropdown = document.getElementById('sort-dropdown');
  const dropdownTrigger = document.getElementById('dropdown-trigger');
  const selectedSortLabel = document.getElementById('selected-sort-label');
  const dropdownItems = document.querySelectorAll('.dropdown-item');

  if (dropdownTrigger && sortDropdown) {
    dropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      sortDropdown.classList.toggle('open');
      const isOpen = sortDropdown.classList.contains('open');
      dropdownTrigger.setAttribute('aria-expanded', isOpen);
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!sortDropdown.contains(e.target)) {
        sortDropdown.classList.remove('open');
        dropdownTrigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Dropdown item selection
    dropdownItems.forEach(item => {
      item.addEventListener('click', () => {
        dropdownItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        currentSortOption = item.dataset.value;
        const icon = item.querySelector('.item-icon').textContent;
        const text = item.querySelector('.item-text').textContent;
        if (selectedSortLabel) {
          selectedSortLabel.textContent = `${icon} ${text}`;
        }

        sortDropdown.classList.remove('open');
        dropdownTrigger.setAttribute('aria-expanded', 'false');
        applyFiltersAndRender();
      });
    });
  }

  // Reset filters
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener('click', resetAllFilters);
  }
}

function resetAllFilters() {
  activeStatus = 'all';
  activeTag = 'All';
  currentSearchKeyword = '';
  currentSortOption = 'popular';

  if (searchInput) searchInput.value = '';
  if (clearSearchBtn) clearSearchBtn.style.display = 'none';

  const dropdownItems = document.querySelectorAll('.dropdown-item');
  const selectedSortLabel = document.getElementById('selected-sort-label');
  if (dropdownItems.length) {
    dropdownItems.forEach(i => i.classList.toggle('active', i.dataset.value === 'popular'));
    if (selectedSortLabel) selectedSortLabel.textContent = '🔥 Most Popular';
  }

  if (statusTabsContainer) {
    statusTabsContainer.querySelectorAll('.status-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.status === 'all');
    });
  }

  buildTagFilters(fullData);
  applyFiltersAndRender();
}

function buildTagFilters(data) {
  if (!tagsContainer) return;
  tagsContainer.innerHTML = '';

  const tagCounts = {};
  data.forEach(c => {
    (c.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => ({ name: entry[0], count: entry[1] }));

  // Add "All" tag
  const allEl = createTagPill('All', data.length, activeTag === 'All');
  allEl.onclick = () => {
    activeTag = 'All';
    updateActiveTagPill(allEl);
    applyFiltersAndRender();
  };
  tagsContainer.appendChild(allEl);

  const topTags = sortedTags.slice(0, 6);
  const moreTags = sortedTags.slice(6);

  topTags.forEach(t => {
    const el = createTagPill(t.name, t.count, activeTag === t.name);
    el.onclick = () => {
      activeTag = t.name;
      updateActiveTagPill(el);
      applyFiltersAndRender();
    };
    tagsContainer.appendChild(el);
  });

  if (moreTags.length > 0) {
    const moreBtn = document.createElement('div');
    moreBtn.className = 'tag more-tag';
    moreBtn.innerHTML = `<span>⊕ More (${moreTags.length})</span>`;
    moreBtn.onclick = () => {
      moreTags.forEach(t => {
        const el = createTagPill(t.name, t.count, activeTag === t.name);
        el.onclick = () => {
          activeTag = t.name;
          updateActiveTagPill(el);
          applyFiltersAndRender();
        };
        tagsContainer.insertBefore(el, moreBtn);
      });
      moreBtn.remove();
    };
    tagsContainer.appendChild(moreBtn);
  }
}

function createTagPill(name, count, isActive) {
  const el = document.createElement('div');
  el.className = `tag ${isActive ? 'active' : ''}`;
  el.innerHTML = `
    <span>${name}</span>
    <span class="tag-count">${count}</span>
  `;
  return el;
}

function updateActiveTagPill(selectedEl) {
  document.querySelectorAll('.tags .tag').forEach(t => t.classList.remove('active'));
  selectedEl.classList.add('active');
}

function applyFiltersAndRender() {
  let result = [...fullData];

  // Filter by status tab
  if (activeStatus !== 'all') {
    result = result.filter(c => c.status && c.status.toLowerCase() === activeStatus);
  }

  // Filter by activity tag
  if (activeTag !== 'All') {
    result = result.filter(c => (c.tags || []).includes(activeTag));
  }

  // Filter by keyword
  if (currentSearchKeyword) {
    result = result.filter(c =>
      (c.name || '').toLowerCase().includes(currentSearchKeyword) ||
      (c.description || '').toLowerCase().includes(currentSearchKeyword) ||
      (c.task || '').toLowerCase().includes(currentSearchKeyword) ||
      (c.reward || '').toLowerCase().includes(currentSearchKeyword) ||
      (c.tags || []).join(' ').toLowerCase().includes(currentSearchKeyword) ||
      (c.challenge_url || '').includes(currentSearchKeyword)
    );
  }

  // Sort results
  result.sort((a, b) => {
    if (currentSortOption === 'popular') {
      const pA = parseInt(a.participants || 0, 10);
      const pB = parseInt(b.participants || 0, 10);
      return pB - pA;
    } else if (currentSortOption === 'days-asc') {
      const dA = parseInt(a.challenge_days || 999, 10);
      const dB = parseInt(b.challenge_days || 999, 10);
      return dA - dB;
    } else if (currentSortOption === 'days-desc') {
      const dA = parseInt(a.challenge_days || 0, 10);
      const dB = parseInt(b.challenge_days || 0, 10);
      return dB - dA;
    } else if (currentSortOption === 'name') {
      return (a.name || '').localeCompare(b.name || '');
    }
    return 0;
  });

  renderChallenges(result);
}

function renderChallenges(challenges) {
  challengesContainer.innerHTML = '';

  if (challenges.length === 0) {
    if (emptyStateContainer) emptyStateContainer.style.display = 'block';
    return;
  }

  if (emptyStateContainer) emptyStateContainer.style.display = 'none';

  challenges.forEach(c => {
    const clubUrl = c.club || '';
    const statusClass = (c.status || '').toLowerCase() === 'running' ? 'running' : 'upcoming';
    const statusText = (c.status || '').toUpperCase();
    const formattedParticipants = formatParticipantCount(c.participants);
    const decodedReward = decodeUnicode(c.reward);

    const tagsHtml = (c.tags || []).map(t => `<span class="card-tag-pill">${t}</span>`).join('');

    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.innerHTML = `
      <div class="card-header-media">
        <img src="${c.cover_url || 'default-cover.png'}" class="card-cover" alt="${escapeHtml(c.name || 'Challenge')}" loading="lazy" />
        <div class="card-cover-overlay"></div>
        
        ${formattedParticipants ? `
          <div class="participant-badge" title="Active Participants">
            <span>👥</span> ${formattedParticipants} Athletes
          </div>
        ` : ''}

        <div class="status-badge ${statusClass}">
          <span class="status-dot">${statusText}</span>
          <span class="days-count">${c.challenge_days || 0} Days</span>
        </div>

        <div class="card-logo-wrapper">
          <img src="${c.logo_url || 'default-logo.png'}" class="card-logo" alt="Logo" loading="lazy" />
        </div>
      </div>

      <div class="card-body">
        <h3 class="card-title">${escapeHtml(c.name || 'Untitled Challenge')}</h3>
        
        <div class="card-time">
          <span>📅</span> ${escapeHtml(c.time || 'Dates not specified')}
        </div>

        ${c.task ? `
          <div class="card-section task">
            <div class="card-section-label">🎯 Challenge Task</div>
            <div class="card-section-text">${escapeHtml(c.task)}</div>
          </div>
        ` : ''}

        ${decodedReward ? `
          <div class="card-section reward">
            <div class="card-section-label">🎁 Reward</div>
            <div class="card-section-text">${escapeHtml(decodedReward)}</div>
          </div>
        ` : ''}

        ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ''}

        <div class="card-actions">
          <a href="${c.challenge_url}" target="_blank" rel="noopener" class="btn btn-primary">
            <span>Join Challenge</span> ↗
          </a>
          ${clubUrl ? `
            <a href="${clubUrl}" target="_blank" rel="noopener" class="btn btn-secondary">
              Join Club
            </a>
          ` : ''}
        </div>
      </div>
    `;

    challengesContainer.appendChild(cardEl);
  });
}

function formatParticipantCount(count) {
  if (!count) return null;
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toLocaleString();
}

function decodeUnicode(str) {
  if (!str) return '';
  try {
    return JSON.parse(`"${str.replace(/"/g, '\\"')}"`);
  } catch {
    return str;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
