
// VULNERABLE SUMMARIZER 


console.log('[Summarizer] Content script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    console.log('[Summarizer] Extracting page content...');
    
    const content = extractPageContent();
    
    console.log('[Summarizer] Extracted', content.length, 'characters');
    
    sendResponse({ 
      success: true, 
      content: content,
      metadata: {
        title: document.title,
        url: window.location.href,
        contentLength: content.length,
        hasHiddenElements: detectHiddenElements()
      }
    });
    
    return true; 
  }
});

function extractPageContent() {
  const allText = document.body.innerText || document.body.textContent;
  
  return allText;
}

function detectHiddenElements() {
  const hiddenElements = [];
  
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach(el => {
    const style = window.getComputedStyle(el);
   
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0' ||
      parseInt(style.fontSize) === 0 ||
      el.offsetHeight === 0 ||
      el.offsetWidth === 0
    ) {
      if (el.textContent && el.textContent.trim().length > 20) {
        hiddenElements.push({
          tag: el.tagName,
          text: el.textContent.substring(0, 100),
          reason: getHiddenReason(style, el)
        });
      }
    }
  });
  
  return hiddenElements.length > 0;
}

function getHiddenReason(style, el) {
  if (style.display === 'none') return 'display:none';
  if (style.visibility === 'hidden') return 'visibility:hidden';
  if (style.opacity === '0') return 'opacity:0';
  if (parseInt(style.fontSize) === 0) return 'font-size:0';
  if (el.offsetHeight === 0) return 'zero height';
  if (el.offsetWidth === 0) return 'zero width';
  return 'unknown';
}

console.log('[Summarizer] Ready to extract content');
