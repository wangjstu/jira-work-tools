chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.sync.set({enableNewTab: true});
});

chrome.tabs.onCreated.addListener(function(tab) {
  if (tab.pendingUrl === "chrome://newtab/") {
    chrome.storage.sync.get('enableNewTab', function(data) {
      if (data.enableNewTab) {
        chrome.tabs.update(tab.id, {url: "newtab.html"});
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchJiraTasks") {
    console.log('Received fetchJiraTasks request:', request);
    
    if (!request.jiraJql) {
      console.error('JQL is empty or undefined');
      sendResponse({success: false, error: 'JQL is empty or undefined'});
      return true;
    }

    // Encode JQL parts separately
    let encodedJql = request.jiraJql.split(' ').map(part => encodeURIComponent(part)).join('%20');
    console.log('Encoded JQL:', encodedJql);

    const apiUrl = `${request.jiraUrl}/rest/api/2/search?jql=${encodedJql}`;
    console.log('API URL:', apiUrl);

    fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${request.jiraApiToken}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Received data:', data);
      if (data.errorMessages && data.errorMessages.length > 0) {
        throw new Error(data.errorMessages.join(', '));
      }
      if (data.warningMessages && data.warningMessages.length > 0) {
        console.warn('Warning messages:', data.warningMessages);
      }
      sendResponse({success: true, data: data, warnings: data.warningMessages});
    })
    .catch(error => {
      console.error('Error fetching Jira tasks:', error);
      sendResponse({success: false, error: error.message});
    });

    return true; // Indicates that the response is sent asynchronously
  }
});