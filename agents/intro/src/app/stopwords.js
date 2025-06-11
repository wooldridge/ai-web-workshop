// stopwords.js
const stopwords = [
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", 
  "has", "he", "in", "is", "it", "its", "of", "on", "that", "the", 
  "to", "was", "were", "will", "with"
];

function isStopword(word) {
  return stopwords.includes(word.toLowerCase());
}

export { stopwords, isStopword };