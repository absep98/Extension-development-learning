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

window.saveIfNotDuplicate = saveIfNotDuplicate;
