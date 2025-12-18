
(async function() {
  const status = document.getElementById('ai-status');
  
  try {
    
    const lmAvail = await LanguageModel.availability();
    const sumAvail = await Summarizer.availability();
    
    status.textContent = `✓ Ready (LM: ${lmAvail}, Sum: ${sumAvail})`;
    status.style.color = lmAvail === 'readily' || lmAvail === 'available' ? 'green' : 'orange';
  } catch (e) {
    status.textContent = '⚠ Not Available';
    status.style.color = 'orange';
  }
})();

document.getElementById('dashboard').addEventListener('click', () => {
  chrome.tabs.create({ url: 'dashboard.html' });
});


document.getElementById('test-ai').addEventListener('click', async () => {
  console.log('[GrammarGuard] Testing AI features...');
  
  try {
    
    const sumAvail = await Summarizer.availability();
    console.log('Summarizer:', sumAvail);
    
    if (sumAvail === 'readily' || sumAvail === 'available') {
      const session = await Summarizer.create({
        type: 'key-points',
        format: 'plain-text',
        length: 'short'
      });
      const result = await session.summarize('This is a test email about a password reset. Click the link to reset your password.');
      console.log('Summary:', result);
      session.destroy();
      alert('✅ Summarizer works!\n\n' + result);
    } else {
      alert('⚠️ Summarizer status: ' + sumAvail);
    }
  } catch (e) {
    console.error('Test failed:', e);
    alert('❌ Error: ' + e.message);
  }
});
