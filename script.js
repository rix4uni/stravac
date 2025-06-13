const challengesContainer = document.getElementById('challenges-container');
const searchInput = document.getElementById('search');
const tagsContainer = document.getElementById('top-tags');

let allTags = [];
let fullData = [];
let activeTag = 'All';

fetch('https://raw.githubusercontent.com/rix4uni/stravac/refs/heads/main/strava_challenges.json')
  .then(res => res.json())
  .then(data => {
    fullData = data;

    const tagsCount = {};
    data.forEach(challenge => {
      challenge.tags = challenge.tags || []; // Normalize to empty array
      challenge.tags.forEach(tag => {
        tagsCount[tag] = (tagsCount[tag] || 0) + 1;
        allTags.push(tag);
      });
    });

    const tagFrequency = Object.entries(tagsCount)
      .sort((a, b) => b[1] - a[1])
      .map(tag => tag[0]);

    const topTags = tagFrequency.slice(0, 5);
    const moreTags = tagFrequency.slice(5);

    renderTags(topTags, moreTags);
    renderChallenges(data);

    // Search handler
    searchInput.addEventListener('input', () => {
      const keyword = searchInput.value.toLowerCase();
      const filtered = fullData.filter(c =>
        c.name.toLowerCase().includes(keyword) ||
        c.description.toLowerCase().includes(keyword) ||
        c.tags.join().toLowerCase().includes(keyword) ||
        c.challenge_url.includes(keyword) ||  // Search by challenge id
        c.challenge_url.includes(`/challenges/${keyword}`)
      );
      renderChallenges(filtered);
    });
  });

function renderTags(topTags, moreTags) {
  tagsContainer.innerHTML = '';

  // Add "All" tag
  const allTag = document.createElement('div');
  allTag.className = 'tag active';
  allTag.textContent = 'All';
  allTag.onclick = () => {
    activeTag = 'All';
    updateActiveTag(allTag);
    renderChallenges(fullData);
  };
  tagsContainer.appendChild(allTag);

  // Add top tags
  topTags.forEach(tag => {
    const el = document.createElement('div');
    el.className = 'tag';
    el.textContent = tag;
    el.onclick = () => {
      activeTag = tag;
      updateActiveTag(el);
      const filtered = fullData.filter(c => c.tags?.includes(tag));
      renderChallenges(filtered);
    };
    tagsContainer.appendChild(el);
  });

  // "More" button
  if (moreTags.length > 0) {
    const moreBtn = document.createElement('div');
    moreBtn.className = 'tag more-tag';
    moreBtn.textContent = '⊕ More';
    moreBtn.onclick = () => {
      moreTags.forEach(tag => {
        const el = document.createElement('div');
        el.className = 'tag';
        el.textContent = tag;
        el.onclick = () => {
          activeTag = tag;
          updateActiveTag(el);
          const filtered = fullData.filter(c => c.tags?.includes(tag));
          renderChallenges(filtered);
        };
        tagsContainer.insertBefore(el, moreBtn);
      });
      moreBtn.remove();
    };
    tagsContainer.appendChild(moreBtn);
  }
}

function updateActiveTag(selectedTagEl) {
  document.querySelectorAll('.tag').forEach(tag => tag.classList.remove('active'));
  selectedTagEl.classList.add('active');
}

function renderChallenges(challenges) {
  challengesContainer.innerHTML = '';
  challenges.forEach(c => {
    const clubUrl = c.club || '#';
    challengesContainer.innerHTML += `
      <div class="card">
        <img src="${c.cover_url || 'default-cover.png'}" class="card-cover" alt="${c.name || 'No Name'}">
        <div class="card-content">
          <div class="logo-wrapper">
            <img src="${c.logo_url || 'default-logo.png'}" class="card-logo" alt="logo" />
          </div>
          <div class="card-title">${c.name || 'No Title'}</div>
          <div class="card-detail"><strong>Time:</strong> ${c.time || '—'}</div>
          <div class="card-detail"><strong>Task:</strong> ${c.task || '—'}</div>
          <div class="card-detail"><strong>Reward:</strong> ${c.reward || '—'}</div>
          <div class="card-buttons">
            <a href="${c.challenge_url}" target="_blank" class="btn">Join Challenge</a>
            <a href="${clubUrl}" target="_blank" class="btn secondary">Join Club</a>
          </div>
        </div>
      </div>
    `;
  });
}
