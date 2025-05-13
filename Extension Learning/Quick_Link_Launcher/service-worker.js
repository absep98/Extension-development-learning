chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  chrome.storage.local.get({ links: [] }, (data) => {
    const suggestions = data.links
      .filter(link => link.name.toLowerCase().includes(text.toLowerCase()))
      .map(link => ({
        content: link.url,
        description: `Open ${link.name} → ${link.url}`
      }));
    suggest(suggestions);
  });
});

chrome.omnibox.onInputEntered.addListener((text) => {
  const url = text.startsWith("http") ? text : `https://${text}`;
  chrome.tabs.create({ url });
});
