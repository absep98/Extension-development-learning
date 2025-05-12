chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    console.log(`User typed: ${text}`);
    suggest([
        { content: "example1", description: "Example suggestion 1" },
        { content: "example2", description: "Example suggestion 2" }
    ]);
});

chrome.omnibox.onInputEntered.addListener((text) => {
    console.log(`User selected: ${text}`);
    // Perform an action, such as opening a URL
    chrome.tabs.create({ url: `https://www.google.com/search?q=${text}` });
});