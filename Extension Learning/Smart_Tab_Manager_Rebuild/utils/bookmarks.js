export function saveIfNotDuplicate(folderId, tab) {
    chrome.bookmarks.getChildren(folderId, (children) => {
        const isAlreadyBookmarked = children.some(child => child.url === tab.url);
        if (isAlreadyBookmarked) {
            // Use console for debugging instead of alert in bookmarks
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

                // ✅ Save the timestamp for sorting
                const timestampKey = `fav_click_${tab.url}`;
                    chrome.storage.local.set({
                    favorites,
                    [timestampKey]: Date.now()   // <-- ✅ this is what enables recent sorting to work right away
                }, () => {
                // Bookmark saved successfully - no need for alert
                renderTabs(allTabs);
                renderFavorites();
                });
            });
        });
    });
}
