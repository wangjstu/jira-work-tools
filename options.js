document.addEventListener('DOMContentLoaded', function() {
  var checkbox = document.getElementById('enableNewTab');
  var urlInput = document.getElementById('jiraUrl');
  var tokenInput = document.getElementById('jiraApiToken');
  var jqlInput = document.getElementById('jiraJql');
  var saveButton = document.getElementById('saveButton');
  var setupMessage = document.getElementById('setupMessage');
  
  // Load saved settings
  chrome.storage.sync.get(['enableNewTab', 'jiraUrl', 'jiraApiToken', 'jiraJql'], function(data) {
    checkbox.checked = data.enableNewTab !== false;
    urlInput.value = data.jiraUrl || '';
    tokenInput.value = data.jiraApiToken || '';
    jqlInput.value = data.jiraJql || '';

    // Show setup message if this is the first time setup
    if (!data.jiraUrl && !data.jiraApiToken && !data.jiraJql) {
      setupMessage.style.display = 'block';
    }
  });

  // Save settings when button is clicked
  saveButton.addEventListener('click', function() {
    chrome.storage.sync.set({
      enableNewTab: checkbox.checked,
      jiraUrl: urlInput.value,
      jiraApiToken: tokenInput.value,
      jiraJql: jqlInput.value
    }, function() {
      alert('设置已保存！');
      // Close the options page after saving
      window.close();
    });
  });
});