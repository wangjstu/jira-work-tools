let jiraIssues = [];
let filteredIssues = [];
let currentSort = { column: 'key', direction: 'asc' };
let jiraUrl = '';

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0]; // This will give yyyy-MM-dd format
}

function fetchJiraTasks(jiraUrl, jiraApiToken, jiraJql) {
  console.log('Fetching Jira tasks...');
  console.log('JQL:', jiraJql);
  
  chrome.runtime.sendMessage({
    action: "fetchJiraTasks",
    jiraUrl: jiraUrl || '',
    jiraApiToken: jiraApiToken || '',
    jiraJql: jiraJql || ''
  }, (response) => {
    console.log('Received response:', response);
    if (response && response.success) {
      if (response.warnings && response.warnings.length > 0) {
        console.warn('Warnings:', response.warnings.join(', '));
      }

      if (response.data && response.data.issues && response.data.issues.length > 0) {
        jiraIssues = response.data.issues;
        filteredIssues = [...jiraIssues];
        renderTable();
      } else {
        console.log('No issues found in the response');
        document.querySelector('#jiraTasks tbody').innerHTML = '<tr><td colspan="7">No issues found</td></tr>';
      }
    } else {
      console.error('Error fetching Jira tasks:', response ? response.error : 'Unknown error');
      document.querySelector('#jiraTasks tbody').innerHTML = `<tr><td colspan="7" style="color: red;">Error fetching Jira tasks: ${response ? response.error : 'Unknown error'}<br>Please check your JQL query and other settings in the extension options.</td></tr>`;
    }
  });
}

function renderTable() {
  const tableBody = document.querySelector('#jiraTasks tbody');
  tableBody.innerHTML = '';

  filteredIssues.forEach(issue => {
    const row = tableBody.insertRow();
    const keyCell = row.insertCell(0);
    const keyLink = document.createElement('a');
    keyLink.href = `${jiraUrl}/browse/${issue.key}`;
    keyLink.textContent = issue.key;
    keyLink.target = '_blank';
    keyCell.appendChild(keyLink);
    row.insertCell(1).textContent = issue.fields.issuetype.name || 'N/A';
    row.insertCell(2).textContent = issue.fields.summary || 'N/A';
    row.insertCell(3).textContent = issue.fields.status.name || 'N/A';
    row.insertCell(4).textContent = formatDate(issue.fields.customfield_28030);
    row.insertCell(5).textContent = formatDate(issue.fields.customfield_11931);
    row.insertCell(6).textContent = formatDate(issue.fields.customfield_12030);
  });

  updateSortIndicators();
}

function sortIssues(column) {
  const sortFunctions = {
    key: (a, b) => a.key.localeCompare(b.key),
    issuetype: (a, b) => (a.fields.issuetype.name || '').localeCompare(b.fields.issuetype.name || ''),
    summary: (a, b) => (a.fields.summary || '').localeCompare(b.fields.summary || ''),
    status: (a, b) => (a.fields.status.name || '').localeCompare(b.fields.status.name || ''),
    beginDate: (a, b) => new Date(a.fields.customfield_28030 || 0) - new Date(b.fields.customfield_28030 || 0),
    testingDate: (a, b) => new Date(a.fields.customfield_11931 || 0) - new Date(b.fields.customfield_11931 || 0),
    releaseDate: (a, b) => new Date(a.fields.customfield_12030 || 0) - new Date(b.fields.customfield_12030 || 0)
  };

  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.column = column;
    currentSort.direction = 'asc';
  }

  filteredIssues.sort(sortFunctions[column]);
  if (currentSort.direction === 'desc') {
    filteredIssues.reverse();
  }

  renderTable();
}

function updateSortIndicators() {
  const headers = document.querySelectorAll('#jiraTasks th');
  headers.forEach(header => {
    header.classList.remove('asc', 'desc');
    if (header.dataset.sort === currentSort.column) {
      header.classList.add(currentSort.direction);
    }
  });
}

function filterIssues() {
  const filterInputs = document.querySelectorAll('.filter-input');
  const filters = {};

  filterInputs.forEach(input => {
    filters[input.dataset.column] = input.value.toLowerCase();
  });

  filteredIssues = jiraIssues.filter(issue => {
    return Object.entries(filters).every(([column, filterValue]) => {
      if (!filterValue) return true;
      
      let cellValue;
      switch (column) {
        case 'key':
          cellValue = issue.key;
          break;
        case 'issuetype':
          cellValue = issue.fields.issuetype.name;
          break;
        case 'summary':
          cellValue = issue.fields.summary;
          break;
        case 'status':
          cellValue = issue.fields.status.name;
          break;
        case 'beginDate':
          cellValue = formatDate(issue.fields.customfield_28030);
          break;
        case 'testingDate':
          cellValue = formatDate(issue.fields.customfield_11931);
          break;
        case 'releaseDate':
          cellValue = formatDate(issue.fields.customfield_12030);
          break;
      }
      return cellValue.toLowerCase().includes(filterValue);
    });
  });

  renderTable();
}

function localizeHtmlPage() {
  document.querySelectorAll('[id]').forEach(function(element) {
    var msg = chrome.i18n.getMessage(element.id);
    if (msg) {
      if (element.tagName === 'INPUT' && element.type === 'text') {
        element.placeholder = msg;
      } else {
        element.textContent = msg;
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  localizeHtmlPage(); // Add this line to localize the page

  const headers = document.querySelectorAll('#jiraTasks th[data-sort]');
  headers.forEach(header => {
    header.addEventListener('click', () => sortIssues(header.dataset.sort));
  });

  const filterInputs = document.querySelectorAll('.filter-input');
  filterInputs.forEach(input => {
    input.addEventListener('input', filterIssues);
  });

  chrome.storage.sync.get(['enableNewTab', 'jiraUrl', 'jiraApiToken', 'jiraJql'], function(data) {
    console.log('Retrieved settings:', data);
    if (data.enableNewTab) {
      if (data.jiraUrl && data.jiraApiToken && data.jiraJql) {
        jiraUrl = data.jiraUrl; // Store jiraUrl globally for use in renderTable
        fetchJiraTasks(data.jiraUrl, data.jiraApiToken, data.jiraJql);
      } else {
        console.log('Missing Jira settings');
        // Redirect to the options page
        chrome.runtime.openOptionsPage();
      }
    } else {
      console.log('Custom new tab page is disabled');
      window.location.href = "chrome://newtab/";
    }
  });
});