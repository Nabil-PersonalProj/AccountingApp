const companyNameInput = document.getElementById('companyNameInput');
const saveCompanyBtn = document.getElementById('saveCompanyBtn');
const cancelCompanyBtn = document.getElementById('cancelCompanyBtn');

saveCompanyBtn.addEventListener('click', async () => {
  const name = companyNameInput.value.trim();
  if (!name) {
    window.api.showMessage('Company name is required!');
    return;
  }

  try {
    const response = await window.api.addCompany(name);
    if (!response.success) {
      window.api.showMessage(response.message);
      return;
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
