const nameField = document.getElementsByClassName("text_link")[0];
const urlField = document.getElementsByClassName("url_link")[0];
const saveButton = document.getElementsByClassName("save_link")[0];
const linkList = document.getElementsByClassName("link_list")[0];

// Save new link
saveButton.addEventListener("click", () => {
  const name = nameField.value.trim();
  const url = urlField.value.trim();

  if (!name || !url) {
    alert("Please enter both a name and a URL.");
    return;
  }

  try {
    new URL(url); // Validate URL
  } catch {
    alert("Please enter a valid URL.");
    return;
  }

  chrome.storage.local.get({ links: [] }, (data) => {
    const links = data.links;
    links.push({ name, url });
    chrome.storage.local.set({ links }, () => {
      nameField.value = "";
      urlField.value = "";
      displayLinks();
      updateBadgeCount(links.length);
    });
  });
});

// Show all saved links
function displayLinks() {
  chrome.storage.local.get({ links: [] }, (data) => {
    linkList.innerHTML = ""; // Clear current list
    data.links.forEach((linkObj) => {
      const listItem = document.createElement("li");
      listItem.className = "link_item";
      listItem.innerHTML = `
        <span class="link_name">${linkObj.name} → ${linkObj.url}</span>
        <button class="delete_link" data-url="${linkObj.url}">Remove</button>
        <button class="edit_link" data-url="${linkObj.url}">Edit</button>
      `;
      linkList.appendChild(listItem);
    });
    // Attach edit listeners

    document.querySelectorAll(".edit_link").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const url = e.target.dataset.url;
        editLink(url);
      });
    });

    // Attach remove listeners
    document.querySelectorAll(".delete_link").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const url = e.target.dataset.url;
        removeLink(url);
      });
    });
  });
}

function editLink(urlToEdit) {
  chrome.storage.local.get({ links: [] }, (data) => {
    const links = data.links
    const linkToEdit = links.find(link => link.url === urlToEdit);
    if(!editLink) return;

    nameField.value = linkToEdit.name;
    urlField.value = linkToEdit.url;

    const updatedLinks = links.filter(link => link.url !== urlToEdit);
    chrome.storage.local.set({ links : updatedLinks }, () => {
      displayLinks();
      updateBadgeCount(updatedLinks.length);
    });
  });
}

// Remove link by URL
function removeLink(url) {
  chrome.storage.local.get({ links: [] }, (data) => {
    const links = data.links.filter((link) => link.url !== url);
    chrome.storage.local.set({ links }, () => {
      displayLinks();
      updateBadgeCount(links.length);
    });
  });
}

// Update badge count (if needed)
function updateBadgeCount(count) {
  chrome.action.setBadgeText({ text: count.toString() });
}

// On load
displayLinks();