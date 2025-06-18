// utils/clearFavorites.js

export async function clearSmartTabFavorites(folderTitle = "Smart Tab Bookmarks") {
    return new Promise((resolve) => {
        // 1. Delete folder from Chrome Bookmarks
        chrome.bookmarks.search({ title: folderTitle }, (results) => {
            const folder = results.find(r => !r.url);
            if (folder) {
                chrome.bookmarks.removeTree(folder.id, () => {
                    // 2. Clear storage
                    chrome.storage.local.set({ favorites: [] }, () => {
                        resolve(true);
                    });
                });
            } else {
                // No folder, just clear local
                chrome.storage.local.set({ favorites: [] }, () => {
                    resolve(false);
                });
            }
        });
    });
}
