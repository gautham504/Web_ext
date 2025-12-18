
// VULNERABLE SUMMARIZER 


document.getElementById('summarize-btn').addEventListener('click', summarizePage);
document.getElementById('copy-btn').addEventListener('click', copySummary);
document.getElementById('clear-btn').addEventListener('click', clearSummary);

async function summarizePage() {
  const button = document.getElementById('summarize-btn');
  const status = document.getElementById('status');
  const summaryContainer = document.getElementById('summary-container');
  const summaryText = document.getElementById('summary-text');
  const debugInfo = document.getElementById('debug-info');
  const contentPreview = document.getElementById('content-preview');
  const wordCount = document.getElementById('word-count');
  const copyBtn = document.getElementById('copy-btn');
  const clearBtn = document.getElementById('clear-btn');
  
  const options = {
    type: document.getElementById('summary-type').value,
    length: document.getElementById('summary-length').value,
    format: document.getElementById('summary-format').value,
    contentSource: document.getElementById('content-source').value
  };
  
  button.disabled = true;
  status.className = 'status loading';
  status.textContent = '⏳ Extracting content...';
  status.classList.remove('hidden');
  summaryContainer.classList.add('hidden');
  copyBtn.classList.add('hidden');
  clearBtn.classList.add('hidden');
  
  try {
   
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractContent,
      args: [options.contentSource]
    });
    
    const extractedData = result.result;
    
    if (!extractedData.content || extractedData.content.trim().length === 0) {
      throw new Error('No content found. Try selecting text or using a different content source.');
    }
    
    status.textContent = '🤖 Generating summary with AI...';
    const availability = await Summarizer.availability();
    
    if (availability === 'no') {
      throw new Error('Summarizer API not available. Enable it in chrome://flags/#summarization-api-for-gemini-nano');
    }
    
    if (availability === 'after-download') {
      status.textContent = '⏳ Downloading AI model... This may take a few minutes.';
    }
  
    const summarizer = await Summarizer.create();
    
    let summary;
    try {
      
      summary = await summarizer.summarize(extractedData.content, {
        context: '',
        type: options.type,
        format: options.format,
        length: options.length
      });
    } catch (e) {
      
      console.log('[Summarizer] Options not supported, using simple mode:', e);
      summary = await summarizer.summarize(extractedData.content);
    }
    
    
    status.className = 'status success';
    status.textContent = '✅ Summary generated successfully!';
    
    setTimeout(() => status.classList.add('hidden'), 2000);
    
    summaryContainer.classList.remove('hidden');
    summaryText.textContent = summary;
    copyBtn.classList.remove('hidden');
    clearBtn.classList.remove('hidden');
    
    const words = summary.split(/\s+/).filter(w => w.length > 0).length;
    wordCount.textContent = `${words} words`;
    
    debugInfo.textContent = 
      `Page: ${extractedData.metadata.title}\n` +
      `URL: ${extractedData.metadata.url}\n` +
      `Content Source: ${getContentSourceLabel(options.contentSource)}\n` +
      `Extracted Length: ${extractedData.content.length} characters\n` +
      `Hidden Elements Found: ${extractedData.metadata.hiddenCount} ⚠️\n\n` +
      `Summary Options (attempted):\n` +
      `  Type: ${options.type}\n` +
      `  Length: ${options.length}\n` +
      `  Format: ${options.format}\n\n` +
      `Model Status: ${availability}\n` +
      `Summary Length: ${summary.length} characters`;
    
    contentPreview.textContent = extractedData.content.substring(0, 1000) + 
                                  (extractedData.content.length > 1000 ? '...' : '');
    
  } catch (error) {
    status.className = 'status error';
    status.textContent = `❌ Error: ${error.message}`;
    console.error('[Summarizer] Error:', error);
  } finally {
    button.disabled = false;
  }
}

// FUNCTION INJECTED INTO PAGE

function extractContent(contentSource) {
  function countHiddenElements() {
    let count = 0;
    const allElements = document.querySelectorAll('*');
    
    allElements.forEach(el => {
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        parseInt(style.fontSize) === 0
      ) {
        if (el.textContent && el.textContent.trim().length > 20) {
          count++;
        }
      }
    });
    
    return count;
  }
  
  function getVisibleText() {
    const textNodes = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const style = window.getComputedStyle(parent);
          
          if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            style.opacity === '0' ||
            parseInt(style.fontSize) === 0 ||
            parent.offsetHeight === 0 ||
            parent.offsetWidth === 0
          ) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent.trim();
      if (text) {
        textNodes.push(text);
      }
    }
    
    return textNodes.join(' ');
  }
  
  function getMainContent() {
    const candidates = [
      document.querySelector('main'),
      document.querySelector('article'),
      document.querySelector('[role="main"]'),
      document.querySelector('.content'),
      document.querySelector('.main-content'),
      document.querySelector('#content'),
      document.querySelector('#main')
    ];
    
    for (const element of candidates) {
      if (element && element.textContent.trim().length > 200) {
        return element.innerText || element.textContent;
      }
    }
    
    return document.body.innerText || document.body.textContent;
  }
  
  const metadata = {
    title: document.title,
    url: window.location.href,
    hiddenCount: 0
  };
  
  let content = '';
  
  switch (contentSource) {
    case 'full-page':
      content = document.body.innerText || document.body.textContent;
      metadata.hiddenCount = countHiddenElements();
      break;
      
    case 'selection':
  
      const selection = window.getSelection().toString();
      if (!selection) {
        throw new Error('No text selected. Please select some text on the page first.');
      }
      content = selection;
      break;
      
    case 'visible':
      content = getVisibleText();
      metadata.hiddenCount = countHiddenElements();
      break;
      
    case 'main-content':
      content = getMainContent();
      metadata.hiddenCount = countHiddenElements();
      break;
      
    default:
      content = document.body.innerText || document.body.textContent;
      break;
  }
  
  return { content, metadata };
}

function getContentSourceLabel(source) {
  const labels = {
    'full-page': 'Full Page (Including Hidden Elements) ⚠️ VULNERABLE',
    'selection': 'User Selected Text Only',
    'visible': 'Visible Content Only (Filtered)',
    'main-content': 'Main Content Area (Smart Detection)'
  };
  return labels[source] || source;
}

function copySummary() {
  const summaryText = document.getElementById('summary-text').textContent;
  navigator.clipboard.writeText(summaryText).then(() => {
    const copyBtn = document.getElementById('copy-btn');
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
  });
}

function clearSummary() {
  document.getElementById('summary-container').classList.add('hidden');
  document.getElementById('copy-btn').classList.add('hidden');
  document.getElementById('clear-btn').classList.add('hidden');
}
