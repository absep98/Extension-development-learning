export function renderFavorites() {
    favoriteList.innerHTML = "";

    chrome.storage.local.get(null, (allStoredItems) => {
        let favorites = allStoredItems.favorites || [];

        const sortTypeSelect = document.getElementById("sortFavorites");
        const sortType = sortTypeSelect ? sortTypeSelect.value : "recent";

        if (sortType === "domain") {
            // Count domain frequency
            const domainCounts = {};
            favorites.forEach(fav => {
                try {
                    const domain = new URL(fav.url).hostname;
                    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
                } catch (e) {
                    console.warn("Invalid URL in favorites:", fav.url);
                }
            });

            favorites.sort((a, b) => {
                const domainA = new URL(a.url).hostname;
                const domainB = new URL(b.url).hostname;
                const countA = domainCounts[domainA] || 0;
                const countB = domainCounts[domainB] || 0;

                // Descending by frequency, fallback by title
                if (countB !== countA) {
                    return countB - countA;
                } else {
                    return a.title.localeCompare(b.title);
                }
            });
        } else {
            // Default: Sort by recent clicks/bookmarks
            favorites.sort((a, b) => {
                const timeA = parseInt(allStoredItems[`fav_click_${a.url}`]) || 0;
                const timeB = parseInt(allStoredItems[`fav_click_${b.url}`]) || 0;
                return timeB - timeA;
            });
        }

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
                chrome.storage.local.set({ [key]: Date.now() });
                chrome.tabs.create({ url });
            });

            li.querySelector(".remove-fav-btn").addEventListener("click", (event) => {
                event.stopPropagation();
                const urlToRemove = event.target.dataset.url;
                const updated = favorites.filter(item => item.url !== urlToRemove);
                chrome.storage.local.set({ favorites: updated }, () => renderFavorites());
            });

            favoriteList.appendChild(li);
        });
    });
}
