import { groupTabsByDomain } from './utils/grouping.js';
import { saveIfNotDuplicate } from './utils/bookmarks.js';
import { renderFavorites } from './utils/renderFavorites.js';
import { clearSmartTabFavorites } from './utils/clearFavorites.js';
import { initializeFocusModeUI, cleanExpiredBlocks } from './utils/focusMode.js';
import { initializeAIInsightsUI, addAIInsightsStyles } from './utils/aiInsightsUI.js';
// import { storeBookmarkedTabs } from './utils/storeBookmarkedTabs.js';

let allTabs = [];

document.addEventListener("DOMContentLoaded", () => {
    const tabList = document.getElementById('tabList');
    const searchInput = document.getElementById('searchInput');
    const favoriteList = document.getElementById('favoriteList');
    const toggleAllTabs = document.getElementById("toggleAllTabs");
    const storeFavoritesBtn = document.getElementById('storeFavoritesBtn');
    const sortSelect = document.getElementById("sortFavorites");

    document.getElementById("clearFavoritesBtn").addEventListener("click", () => {
        clearSmartTabFavorites().then(() => {
            renderFavorites();
            alert("Favorites cleared!");
        });
    });

    toggleAllTabs.addEventListener("click", () => {
        tabList.classList.toggle("hidden");
        toggleAllTabs.classList.toggle("collapsed");
    });

    sortSelect.addEventListener("change", () => {
        const selected = sortSelect.value;
        chrome.storage.local.set({ favoriteSortOption: selected }, () => {
            renderFavorites(); // Re-render using new sort
        });
    });

    const analyticsBtn = document.getElementById("openAnalyticsBtn");
    if (analyticsBtn) {
        analyticsBtn.addEventListener("click", () => {
            chrome.runtime.openOptionsPage();
        });
    }

    // On load: set dropdown to saved sort
    chrome.storage.local.get("favoriteSortOption", (data) => {
        sortSelect.value = data.favoriteSortOption || "recent";
    });


    refreshTabs();
    renderFavorites();
    initializeFocusModeUI();
    
    // Initialize AI Insights UI
    addAIInsightsStyles();
    initializeAIInsightsUI();

    storeFavoritesBtn.addEventListener("click", async () => {
        const folderTitle = "Smart Tab Bookmarks";
        chrome.bookmarks.search({ title: folderTitle }, async (results) => {
            const folder = results.find(r => !r.url);
            if (folder) {
                syncFavoritesFromBookmarks({ shouldRender: true });         // ✅ then render
            } else {
                alert("No Smart Tab Bookmarks folder found!!");
            }
        });
    });


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

    function syncFavoritesFromBookmarks({ shouldRender = true } = {}) {
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
                        if (shouldRender) renderFavorites();
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
                        bookmarBtn.style.opacity = 0.6;
                        bookmarBtn.style.pointerEvents = "none";
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
                                syncFavoritesFromBookmarks(); // update list after bookmark
                            } else {
                                chrome.bookmarks.create({ title: folderTitle }, (newFolder) => {
                                    saveIfNotDuplicate(newFolder.id, tab);
                                    syncFavoritesFromBookmarks();
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
    cleanExpiredBlocks();

});
