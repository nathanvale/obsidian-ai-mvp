import { sanitizeInput, validateSearchQuery, validateTopicName, ValidationDefaults } from './src/utils/input-validation.js';

console.log('Testing simple safe input:');
const result1 = sanitizeInput('ADHD medication management', ValidationDefaults.SEARCH_QUERY);
console.log(result1);

console.log('\nTesting SQL injection:');
const result2 = sanitizeInput("'; DROP TABLE users; --", ValidationDefaults.SEARCH_QUERY);
console.log(result2);

console.log('\nTesting educational topic:');
const result3 = validateTopicName('Biology');
console.log(result3);

console.log('\nTesting special chars in safe text:');
const result4 = sanitizeInput('Organization systems for executive dysfunction', ValidationDefaults.SEARCH_QUERY);
console.log(result4);
