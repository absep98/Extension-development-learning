const article = document.querySelector("article");

// `document.querySelector` may return null if the selector doesn't match anything.
if (article) {
  const text = article.textContent;
  const wordMatchRegExp = /[^\s]+/g; // Regular expression
  const words = text.matchAll(wordMatchRegExp);
  const wordArray = [...words];
  const wordList = wordArray.map(match => match[0]); 
  console.log(wordList); // Log the array of words
  // matchAll returns an iterator, convert to array to get word count
  const wordCount = wordList.length;
  const readingTime = Math.round(wordCount / 200);

  const badge = document.createElement("p");
  // Use the same styling as the publish information in an article's header
  badge.classList.add("color-secondary-text", "type--caption");
  badge.textContent = `⏱️ ${readingTime} min read`;

  // Support for API reference docs
  const heading = article.querySelector("h1");
  const date = article.querySelector("time")?.parentNode;

  const target = date ?? heading;
  if (target) {
    target.insertAdjacentElement("afterend", badge);
  }

  // Update the reading time dynamically
  let elapsedMinutes = 0;
  setInterval(() => {
    elapsedMinutes++;
    const updatedReadingTime = Math.max(readingTime - elapsedMinutes, 0); // Ensure it doesn't go below 0
    badge.textContent = `⏱️ ${updatedReadingTime} min read`;
  }, 60000); // Update every 60 seconds (1 minute)
}