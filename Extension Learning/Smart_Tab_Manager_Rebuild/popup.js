let allTabs = [];

document.addEventListener("DOMContentLoaded", () => {
    const tabList = document.getElementById('tabList');
    const searchInput = document.getElementById('searchInput');
    const favoriteList = document.getElementById('favoriteList');
    const storeFavoritesBtn = document.getElementById('storeFavoritesBtn');

    refreshTabs();
    renderFavorites();

    storeFavoritesBtn.addEventListener("click", async () => {
        const folderTitle = "Smart Tab Bookmarks";
        chrome.bookmarks.search({ title: folderTitle }, async (results) => {
            const folder = results.find(r => !r.url);
            if (folder) {
                refreshFavoritesWithRender();         // ✅ then render
            } else {
                alert("No Smart Tab Bookmarks folder found!!");
            }
        });
    });

    
    function storeBookmarkedTabs(folderId) {
        return new Promise((resolve) => {
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach((tab, index) => {
                    chrome.bookmarks.create({
                        parentId: folderId,
                        title: tab.title,
                        url: tab.url
                    }, () => {
                        if (index === tabs.length - 1) {
                            resolve(); // ✅ when last tab is bookmarked
                        }
                    });
                });

                // If there are no tabs, resolve immediately
                if (tabs.length === 0) resolve();
            });
        });
    }


    function refreshFavoritesWithRender() {
        const folderTitle = "Smart Tab Bookmarks";
        chrome.bookmarks.search({ title: folderTitle }, (results) => {
            const folder = results.find(r => !r.url);
            if (!folder) return;

            chrome.bookmarks.getChildren(folder.id, (children) => {
                const synced = children.map(b => ({ title: b.title, url: b.url }));

                chrome.storage.local.get("favorites", (data) => {
                    const existing = data.favorites || [];
                    const existingUrls = new Set(existing.map(f => f.url));

                    const merged = [...existing, ...synced.filter(b => !existingUrls.has(b.url))];

                    chrome.storage.local.set({ favorites: merged }, () => {
                        // ✅ Ensure render is called right after storage update
                        renderFavorites();
                    });
                });
            });
        });
    }


    let debounceTimer;
    searchInput.addEventListener("input", (event) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const searchTerm = event.target.value.toLowerCase();
            const filtered = allTabs.filter(tab =>
                tab.title.toLowerCase().includes(searchTerm) ||
                tab.url.toLowerCase().includes(searchTerm)
            );
            renderTabs(filtered);
        }, 200);
    });

    function refreshTabs() {
        chrome.bookmarks.search({ title: "Smart Tab Bookmarks" }, (results) => {
            if (results.length === 0) {
                chrome.storage.local.set({ favorites: [] }, () => {
                    chrome.tabs.query({}, (tabs) => {
                        allTabs = tabs;
                        renderTabs(allTabs);
                        renderFavorites();
                    });
                });
            } else {
                chrome.tabs.query({}, (tabs) => {
                    allTabs = tabs;
                    renderTabs(allTabs);
                    renderFavorites();
                });
            }
        });
    }

    function refreshFavorites() {
        const folderTitle = "Smart Tab Bookmarks";
        chrome.bookmarks.search({ title: folderTitle }, (results) => {
            const folder = results.find(r => !r.url);
            if (!folder) {
                console.warn("📁 Smart Tab Bookmarks folder not found.");
                return;
            }

            chrome.bookmarks.getChildren(folder.id, (children) => {
                const syncedBookmarks = children.map(b => ({ title: b.title, url: b.url }));

                // ✅ Get existing local favorites
                chrome.storage.local.get("favorites", (data) => {
                    const existingFavorites = data.favorites || [];

                    // ✅ Create a Set of URLs from existing
                    const existingUrls = new Set(existingFavorites.map(f => f.url));

                    // ✅ Filter out duplicates
                    const newOnes = syncedBookmarks.filter(b => !existingUrls.has(b.url));

                    // ✅ Merge and save updated favorites
                    const updatedFavorites = [...existingFavorites, ...newOnes];

                    chrome.storage.local.set({ favorites: updatedFavorites }, () => {
                        renderFavorites();
                    });
                });
            });
        });
    }


    function renderTabs(tabsToRender) {
        chrome.storage.local.get(["favorites"], (result) => {
            const favUrls = new Set((result.favorites || []).map(item => item.url));
            tabList.innerHTML = "";

            const groupedTabs = groupTabsByDomain(tabsToRender);

            for (const [domain, domainTabs] of Object.entries(groupedTabs)) {
                const domainHeader = document.createElement("div");
                domainHeader.textContent = domain;
                domainHeader.style.fontWeight = "bold";
                domainHeader.style.margin = "10px 0 4px";
                domainHeader.style.fontSize = "14px";
                domainHeader.style.color = "#333";
                tabList.appendChild(domainHeader);

                domainTabs.forEach((tab) => {
                    const isFavorited = favUrls.has(tab.url);

                    const li = document.createElement('li');
                    li.style.cursor = "pointer";
                    li.style.display = "flex";
                    li.style.alignItems = "center";
                    li.style.justifyContent = "space-between";
                    li.style.gap = "10px";
                    li.style.marginBottom = "5px";
                    li.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                            ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" alt="favicon" 
                                style="width: 16px; height: 16px; object-fit: contain; flex-shrink: 0;" />` : ""}
                            <span style="font-size: 13px; color: blue; text-decoration: underline; 
                                        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                                ${tab.title}
                            </span>
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button class="close-btn" data-id="${tab.id}">❌</button>
                            <button class="pin-btn" data-id="${tab.id}">${tab.pinned ? "📍" : "📌"}</button>
                            <button class="bookmark-btn" data-id="${tab.id}">⭐</button>
                        </div>
                    `;

                    const bookmarBtn = li.querySelector(".bookmark-btn");
                    if (isFavorited) {
                        bookmarBtn.disabled = true;
                        bookmarBtn.innerText = "✅";
                        bookmarBtn.title = "Already bookmarked";
                    }

                    li.querySelector(".close-btn").addEventListener("click", (event) => {
                        event.stopPropagation();
                        const tabId = parseInt(event.target.dataset.id);
                        chrome.tabs.remove(tabId, () => {
                            allTabs = allTabs.filter(t => t.id !== tabId);
                            renderTabs(allTabs);
                        });
                    });

                    li.querySelector(".pin-btn").addEventListener("click", (event) => {
                        event.stopPropagation();
                        const tabId = parseInt(event.target.dataset.id);
                        const tab = tabsToRender.find(t => t.id == tabId);
                        if (!tab) {
                            alert("Tab not found or might have been closed.");
                            return;
                        }
                        chrome.tabs.update(tabId, { pinned: !tab.pinned }, () => {
                            chrome.tabs.query({}, (tabs) => {
                                allTabs = tabs;
                                renderTabs(allTabs);
                            });
                        });
                    });

                    li.querySelector(".bookmark-btn").addEventListener("click", (event) => {
                        event.stopPropagation();
                        const tabId = parseInt(event.target.dataset.id);
                        const tab = tabsToRender.find(t => t.id == tabId);
                        if (!tab) {
                            alert("Tab not found or might have been closed.");
                            return;
                        }
                        const folderTitle = "Smart Tab Bookmarks";
                        chrome.bookmarks.search({ title: folderTitle }, (results) => {
                            const folder = results.find(r => !r.url);
                            if (folder) {
                                saveIfNotDuplicate(folder.id, tab);
                                refreshFavorites(); // update list after bookmark
                            } else {
                                chrome.bookmarks.create({ title: folderTitle }, (newFolder) => {
                                    saveIfNotDuplicate(newFolder.id, tab);
                                    refreshFavorites();
                                });
                            }
                        });
                    });

                    li.addEventListener("click", () => {
                        chrome.tabs.update(tab.id, { active: true });
                        chrome.windows.update(tab.windowId, { focused: true });
                    });

                    tabList.appendChild(li);
                });
            }
        });
    }
});
