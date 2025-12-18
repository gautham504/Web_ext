
// INTELLIGENT CONTENT EXTRACTION


console.log('[GrammarGuard] 🔍 Universal content scanner loaded');


setTimeout(() => {
  scanPageForSensitiveData();
}, 3000);

async function scanPageForSensitiveData() {
  console.log('[GrammarGuard] 🚀 Starting intelligent page scan...');
  
  const pageData = {
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title,
    
    
    visibleText: document.body.innerText,
    
    
    formData: captureFormFields(),
    
    pageType: identifyPageType(),
    
    timestamp: Date.now()
  };
  
  console.log('[GrammarGuard] 📊 Page data captured:', {
    textLength: pageData.visibleText.length,
    formFields: pageData.formData.length,
    pageType: pageData.pageType
  });
  
  
  chrome.runtime.sendMessage({
    type: 'INTELLIGENT_SCAN',
    data: pageData
  });
}

function captureFormFields() {
  const fields = [];
  
  
  document.querySelectorAll('input, textarea').forEach(input => {
    const value = input.value;
    
    
    if (value && value.length > 0) {
      fields.push({
        type: input.type,
        name: input.name || input.id || 'unnamed',
        placeholder: input.placeholder,
        value: value,
        label: findLabelForInput(input)
      });
    }
  });
  
  return fields;
}

function findLabelForInput(input) {
  
  const label = document.querySelector(`label[for="${input.id}"]`);
  if (label) return label.textContent.trim();
  
  
  const parentLabel = input.closest('label');
  if (parentLabel) return parentLabel.textContent.trim();
  
  return null;
}

function identifyPageType() {
  const url = window.location.href.toLowerCase();
  const text = document.body.innerText.toLowerCase();
  
  
  if (url.includes('login') || text.includes('sign in') || text.includes('password')) {
    return 'authentication';
  }
  if (url.includes('checkout') || text.includes('credit card') || text.includes('payment')) {
    return 'payment';
  }
  if (url.includes('settings') || url.includes('account') || url.includes('profile')) {
    return 'account_management';
  }
  if (url.includes('mail') || url.includes('inbox')) {
    return 'email';
  }
  
  return 'general';
}


const observer = new MutationObserver(() => {
  
  scanPageForSensitiveData();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
