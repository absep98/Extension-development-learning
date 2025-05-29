let allTabs = [];
let bookmarkedTabs = [];

document.addEventListener("DOMContentLoaded", () => {
    const tabList = document.getElementById('tabList');
    const searchInput = document.getElementById('searchInput');
    const favoriteList = document.getElementById('favoriteList');
    const storeFavoritesBtn = document.getElementById('storeFavoritesBtn');

    chrome.tabs.query({}, (tabs) => {   // first argument {} means to get all open tabs and second args is callback function that runs after the tabs are fetched.
        allTabs = tabs;
        renderTabs(allTabs);
    });

    function refreshTabs() {
        chrome.tabs.query({}, (tabs) => {
            allTabs = tabs;
            renderTabs(allTabs);
        });
    }

    function storeBookmarkedTabs(folderId){
        chrome.bookmarks.getChildren(folderId, (children) => {
            chrome.storage.local.get(["favorites"], (result) => {
                const existingFavorites = result.favorites || [];
                const existingUrls = new Set(existingFavorites.map(item  => item.url));
                
                chrome.tabs.query({}, (tabs) => {
                    children.forEach((child) => {
                        if(!existingUrls.has(child.url)){
                            const matchingTab = tabs.find(tab => tab.url === child.url);
                            existingFavorites.push({
                                title: child.title,
                                url: child.url,
                                favIconUrl: matchingTab ? matchingTab.favIconUrl : ""
                            });
                        }
                    });
                    chrome.storage.local.set({ favorites : existingFavorites}, () => {
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
            favorites.forEach((fav) => {
                const li = document.createElement("li");
                li.style.cursor = "pointer";
                li.innerHTML = `
                    ${fav.favIconUrl ? `<img src="${fav.favIconUrl}" width="16" height="16">` : ""}
                    <span style="font-size: 13px; color: green;">${fav.url}</span>
                `;
                li.addEventListener("click", () => {
                    chrome.tabs.create({ url : fav.url });
                });
                favoriteList.appendChild(li);
            })
        })
    }

    storeFavoritesBtn.addEventListener("click", () => {
        const folderTitle = "Smart Tab Bookmarks";
        chrome.bookmarks.search({ "title" : folderTitle}, ( results ) => {
            if(results.length > 0){
                storeBookmarkedTabs(results[0].id);
            } else {
                alert("No Smart Tab Bookmarks folder found!!")
            }
        })
    })


    function saveIfNotDuplicate(folderId, tab) {
        chrome.bookmarks.getChildren(folderId, (children) => {
            const isAlreadyBookmarked = children.some(child => child.url === tab.url);
            if(isAlreadyBookmarked) {
                alert("This tab is already bookmarked!!");
                return;
            }
            chrome.bookmarks.create({
                parentId: folderId,
                title: tab.title,
                url: tab.url
            }, () => {
                alert("Tab bookmarked successfully..!");
                refreshTabs();
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
        tabList.innerHTML = "";
        tabsToRender.forEach((tab) => {
            const li = document.createElement('li');
            li.style.cursor = 'pointer';
            li.innerHTML = `
                ${tab.favIconUrl ? `<img src="${tab.favIconUrl}" alt="favicon" width="16" height="16">` : ""}
                <span style="font-size : 13px; color: blue; text-decoration : underline">${tab.title}</span>
                <button style="margin-left: 10px;" class="close-btn" data-id="${tab.id}">❌</button>
                <button style="margin-left: 10px;" class="pin-btn" data-id="${tab.id}">${tab.pinned ? "📍" : "📌"}</button>
                <button style="margin-left: 10px;" class="bookmark-btn" data-id="${tab.id}">⭐</button>
            `;

            li.querySelector(".close-btn").addEventListener("click", (event) => {
                event.stopPropagation();
                const tabId = parseInt(event.target.dataset.id);
                chrome.tabs.remove(tabId, refreshTabs);
            });

            li.querySelector(".pin-btn").addEventListener("click", (event) => {
                event.stopPropagation();
                const tabId = parseInt(event.target.dataset.id);
                const tab = tabsToRender.find(t => t.id == tabId);
                if(!tab){
                    return;
                }
                chrome.tabs.update(tabId, { pinned : !tab.pinned }, () => {
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

                const folderTitle = "Smart Tab Bookmarks";
                chrome.bookmarks.search({ title : folderTitle}, (results) => {
                    
                    if(results.length > 0){
                        saveIfNotDuplicate(results[0].id, tab);
                    } else {
                        chrome.bookmarks.create({ title: folderTitle}, (newFolder) => {
                            saveIfNotDuplicate(newFolder.id, tab);
                        });
                    }
                });

            });

            li.addEventListener("click", () => {
                chrome.tabs.update(tab.id, { active : true});
                chrome.windows.update(tab.windowId, { focused : true});
            });

            tabList.appendChild(li);
        });
    }
})