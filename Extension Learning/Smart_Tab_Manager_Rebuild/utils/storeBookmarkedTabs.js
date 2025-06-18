export function storeBookmarkedTabs(folderId) {
    chrome.bookmarks.getChildren(folderId, (children) => {
        chrome.storage.local.get(["favorites"], (result) => {
            const existingFavorites = result.favorites || [];
            const existingUrls = new Set(existingFavorites.map(item => item.url));

            chrome.tabs.query({}, (tabs) => {
                children.forEach((child) => {
                    if (!existingUrls.has(child.url)) {
                        const matchingTab = tabs.find(tab => tab.url === child.url);
                        if(!matchingTab) {
                            return;
                        }
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