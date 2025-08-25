// A quick debug script that doesn't need compilation

const escapeHtml = (input) => {
  const entities = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#96;',
    '=': '&#61;',
  };
  return input.replace(/[&<>"'`=\/]/g, (char) => entities[char] || char);
};

// Test the specific failing inputs
console.log('=== Educational Topics ===');
const topics = ['Biology', 'World History', 'Computer Science', 'Mathematics & Statistics'];
topics.forEach(topic => {
  const escaped = escapeHtml(topic);
  const pattern = /^[a-zA-Z0-9\s\-_.,&()]+$/;
  console.log(`${topic} -> ${escaped} -> matches pattern: ${pattern.test(escaped)}`);
});

console.log('\n=== Empty Queries ===');
const queries = ['<script></script>', '   ', ';;;;', '""""""'];
queries.forEach(query => {
  const escaped = escapeHtml(query);
  console.log(`"${query}" -> "${escaped}" -> trimmed length: ${escaped.trim().length}`);
});
