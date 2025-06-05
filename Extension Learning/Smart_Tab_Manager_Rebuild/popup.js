let allTabs = [];
let bookmarkedTabs = [];

document.addEventListener("DOMContentLoaded", () => {
    const tabList = document.getElementById('tabList');
    const searchInput = document.getElementById('searchInput');
    const favoriteList = document.getElementById('favoriteList');
    const storeFavoritesBtn = document.getElementById('storeFavoritesBtn');

    chrome.tabs.query({}, (tabs) => {   // first argument {} means to get all open tabs and second args is callback function that runs after the tabs are fetched.
        refreshTabs();
    });

    function refreshTabs() {
        chrome.bookmarks.search({ title: "Smart Tab Bookmarks" }, (results) => {
            if(results.length === 0){
                chrome.storage.local.set({ favorites: [] }, () => {
                    allTabs = [];
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
                })
            }
        })
    }

    function storeBookmarkedTabs(folderId) {
        chrome.bookmarks.getChildren(folderId, (children) => {
            chrome.storage.local.get(["favorites"], (result) => {
                const existingFavorites = result.favorites || [];
                const existingUrls = new Set(existingFavorites.map(item => item.url));

                chrome.tabs.query({}, (tabs) => {
                    children.forEach((child) => {
                        if (!existingUrls.has(child.url)) {
                            const matchingTab = tabs.find(tab => tab.url === child.url);
                            existingFavorites.push({
                                title: child.title,
                                url: child.url,
                                favIconUrl: matchingTab ? matchingTab.favIconUrl : ""
                            });
                        }
                    });
                    chrome.storage.local.set({ favorites: existingFavorites }, () => {
                        renderFavorites();
                    });
                })
            })
        })
    }

    function renderFavorites() {
        favoriteList.innerHTML = "";
        chrome.storage.local.get(["favorites"], (result) => {
            const favorites = result.favorites || [];

            favorites.sort((a, b) => {
                const timeA = parseInt(localStorage.getItem(`fav_click_${a.url}`)) || 0;
                const timeB = parseInt(localStorage.getItem(`fav_click_${b.url}`)) || 0;
                return timeB - timeA;
            })

            favorites.forEach((fav) => {
                const li = document.createElement("li");
                li.style.cursor = "pointer";
                li.style.display = "flex";
                li.style.alignContent = "center";
                li.style.gap = "5px";
                li.style.padding = "4px 0";
                li.style.justifyContent = "space-content";
                li.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                        ${fav.favIconUrl ? `<img src="${fav.favIconUrl}" width="16" height="16">` : ""}
                        <span style="font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: green;">${fav.url}</span>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button class="open-fav-btn" data-url="${fav.url}">🔗</button>
                        <button class="remove-fav-btn" data-url="${fav.url}">🗑️</button>
                    </div>
                `;
                li.addEventListener("click", () => {
                    chrome.tabs.create({ url: fav.url });
                });

                li.querySelector(".open-fav-btn").addEventListener("click", (event) => {
                    event.stopPropagation();
                    const url = event.target.dataset.url;

                    const key = `fav_click_${url}`;
                    const current = localStorage.getItem(key);

                    localStorage.setItem(key, Date.now());
                    chrome.tabs.create({  url });
                })

                li.querySelector(".remove-fav-btn").addEventListener("click", (event) => {
                    event.stopPropagation();
                    const urlToRemove = event.target.dataset.url;
                    const updated = favorites.filter(item => item.url !== urlToRemove);
                    chrome.storage.local.set({ favorites: updated }, () => renderFavorites())
                })

                favoriteList.appendChild(li);
            })
        })
    }

    storeFavoritesBtn.addEventListener("click", () => {
        const folderTitle = "Smart Tab Bookmarks";
        chrome.bookmarks.search({ title: folderTitle }, (results) => {
            const folder = results.find(r => !r.url);            if (folder) {
                storeBookmarkedTabs(folder.id);
            } else {
                alert("No Smart Tab Bookmarks folder found!!");
            }
        });
    })


    function saveIfNotDuplicate(folderId, tab) {
        chrome.bookmarks.getChildren(folderId, (children) => {
            const isAlreadyBookmarked = children.some(child => child.url === tab.url);
            if (isAlreadyBookmarked) {
                alert("This tab is already bookmarked!!");
                return;
            }
            chrome.bookmarks.create({
                parentId: folderId,
                title: tab.title,
                url: tab.url
            }, () => {
                chrome.storage.local.get(["favorites"], (result) => {
                    const favorites = result.favorites || [];
                    favorites.push({
                        title: tab.title,
                        url: tab.url,
                        favIconUrl: tab.favIconUrl || ""
                    });
                    chrome.storage.local.set({ favorites}, () => {
                        alert("Tab bookmarked successfully...");
                        renderTabs(allTabs);
                        renderFavorites();
                        // refreshTabs();
                    })
                })
            });
        });
    }


    searchInput.addEventListener("input", (event) => {
        const searchTerm = event.target.value.toLowerCase();
        const filtered = allTabs.filter((tab) => {
            return tab.title.toLowerCase().includes(searchTerm) || tab.url.toLowerCase().includes(searchTerm);
        });
        renderTabs(filtered);
    })

    function renderTabs(tabsToRender) {
        chrome.storage.local.get(["favorites"], (result) => {
            const favUrls = new Set((result.favorites || []).map(item => item.url));

            tabList.innerHTML = "";
            tabsToRender.forEach((tab) => {
                
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
                    chrome.tabs.remove(tabId, refreshTabs);
                });

                li.querySelector(".pin-btn").addEventListener("click", (event) => {
                    event.stopPropagation();
                    const tabId = parseInt(event.target.dataset.id);
                    const tab = tabsToRender.find(t => t.id == tabId);
                    if (!tab) {
                        alert("No Smart Tab Bookmarks folder found!!")
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
                    if(!tab){
                        alert("No Smart Tab Bookmarks folder found!!")
                        return;
                    }
                    const folderTitle = "Smart Tab Bookmarks";
                    chrome.bookmarks.search({ title: folderTitle }, (results) => {
                        const folder = results.find(r => !r.url); // Only folders have no url
                        if (folder) {
                            saveIfNotDuplicate(folder.id, tab);
                        } else {
                            chrome.bookmarks.create({ title: folderTitle }, (newFolder) => {
                                saveIfNotDuplicate(newFolder.id, tab);
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
        })
    }
})