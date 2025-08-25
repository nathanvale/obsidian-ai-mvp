// Test which "too short" inputs are passing

const escapeHtml = (input) => {
  const entities = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    "'": '&#x27;', '/': '&#x2F;', '`': '&#96;', '=': '&#61;',
  };
  return input.replace(/[&<>"'`=\/]/g, (char) => entities[char] || char);
};

const tooShort = ['A', '<>', ' ', ';;'];

console.log('=== Testing Too Short Topics ===');
tooShort.forEach(topic => {
  const escaped = escapeHtml(topic);
  const trimmedLength = escaped.trim().length;
  const pattern = /^[a-zA-Z0-9\s\-_.,&()#;]+$/;
  const matchesPattern = pattern.test(escaped);
  
  // Simulate repeated chars pattern
  const repeatedPattern = /[;"]{4,}/g;
  const hasRepeated = repeatedPattern.test(topic);
  
  console.log(`"${topic}" -> "${escaped}" -> trimmed: ${trimmedLength}, pattern: ${matchesPattern}, repeated: ${hasRepeated}`);
});
