let allTabs = [];
document.addEventListener("DOMContentLoaded", () => {

  const tabList = document.getElementById("tabList");
  const searchInput = document.getElementById("searchInput");

  chrome.tabs.query({}, (tabs) => {
    allTabs = tabs;
    renderTabs(allTabs)
  });

  searchInput.addEventListener("input", (event) => {

    const searchTerm = event.target.value.toLowerCase();
    const filtered = allTabs.filter((tab) => {
     return tab.title.toLowerCase().includes(searchTerm) || tab.url.toLowerCase().includes(searchTerm);
    });
    renderTabs(filtered);
  });

  function refreshTabs() {
    chrome.tabs.query({}, (tabs) => {
      allTabs = tabs;
      renderTabs(allTabs);
    });
  }

  function saveIfNotDuplicate(folderId, tab) {
    chrome.bookmarks.getChildren(folderId, (children) => {
      const isAlreadyBookmarked = children.some(child => child.url === tab.url);
      if (isAlreadyBookmarked) {
        alert("This tab is already bookmarked.");
        return;
      }
      chrome.bookmarks.create({
        parentId: folderId,
        title: tab.title,
        url: tab.url
      }, () => {
        alert("Tab bookmarked successfully!");
        refreshTabs();
      });
    });
  }

  function renderTabs(tabsToRender) {
    tabList.innerHTML = "";
    tabsToRender.forEach((tab) => {
      const li = document.createElement("li");
      li.style.cursor = "pointer";
      li.innerHTML = `
        ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" alt="favicon" width="16" height="16">` : ''}
        <span style="font-size:13px; color:blue; text-decoration:underline">${tab.title}</span>
        <button style="margin-left: 10px;" class="close-btn" data-id="${tab.id}">❌</button>
        <button style="margin-left: 10px;" class="pin-btn" data-id="${tab.id}">${tab.pinned ?  "📍" : "📌"}</button>
        <button style="margin-left: 10px;" class="bookmark-btn" data-id="${tab.id}">⭐</button>
      `;
      
      li.querySelector(".bookmark-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        const tabId = parseInt(event.target.dataset.id);
        const tab = tabsToRender.find(t => t.id === tabId);
        
        const folderTitle = "Smart Tab Bookmarks";
        chrome.bookmarks.search({ title: folderTitle}, (results) => {
          if(results.length > 0) {
            saveIfNotDuplicate(results[0].id, tab);
          } else {
            chrome.bookmarks.create({ title: folderTitle}, (newFolder) => {
              saveIfNotDuplicate(newFolder.id, tab);
          });
          }
        });
      });

      li.querySelector(".pin-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        const tabId = parseInt(event.target.dataset.id);
        const tab = tabsToRender.find(t => t.id === tabId);
        if (!tab) {
          return;
        }
        chrome.tabs.update(tabId, { pinned: !tab.pinned }, () => {
          chrome.tabs.query({}, (tabs) => {
            allTabs = tabs;
            renderTabs(allTabs);
          });
        });
      });

      li.querySelector(".close-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        const tabId = parseInt(event.target.dataset.id);
        chrome.tabs.remove(tabId, refreshTabs);
      });

      li.addEventListener("click", () => {
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
      } );

      tabList.appendChild(li);

    });
  }
});