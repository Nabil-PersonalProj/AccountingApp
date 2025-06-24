const companyNameInput = document.getElementById('companyNameInput');
const saveCompanyBtn = document.getElementById('saveCompanyBtn');
const cancelCompanyBtn = document.getElementById('cancelCompanyBtn');

saveCompanyBtn.addEventListener('click', async () => {
  const name = companyNameInput.value.trim();
  if (!name) {
    window.api.showMessage('Company name is required!');
    return;
  }
  console.log('[addCompanyRenderer] adding: ', name);

  try {
    const response = await window.api.addCompany(name);
    if (!response.success) {
      window.api.showMessage(response.message);
      return;
    }

    window.api.send('log-to-console', `[AddCompanyRenderer] Test`);
    
    //  If part of a carry forward flow, notify the main window
    if (response.newCompanyId) {
      console.log('[addCompanyRenderer] initiating next part of carry forward');
      window.api.send('carry-forward-after-company-created', response.newCompanyId);
    }
    
    window.api.send('refresh-companies');
    window.close();
  } catch (error) {
    console.error('Error adding company:', error);
    window.api.showMessage('Failed to add company.');
  }
});

cancelCompanyBtn.addEventListener('click', () => {
  window.close();
});
