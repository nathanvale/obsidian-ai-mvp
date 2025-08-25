/**
 * Tests for enhanced schema validation in ADHD Digital Second Brain
 * Validates email, URL, medication, time, and other ADHD-specific patterns
 */

import { describe, it, expect } from 'vitest';
import {
  EmailSchema,
  UrlSchema,
  MedicationNameSchema,
  MedicationDosageSchema,
  TimeSchema,
  AdhdSymptomSeveritySchema,
  VoiceTranscriptSchema,
  TagsSchema,
  CategorySchema,
  PrioritySchema,
  SearchQuerySchema,
  VaultPathSchema,
  createValidationSchema,
  ValidationErrorMessages,
} from '../../src/schemas/common.js';

describe('Enhanced Schema Validation', () => {
  describe('Email Validation', () => {
    it('validates correct email formats', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user_name@domain-name.org',
        'user123@test.com',
        'valid@subdomain.domain.edu',
      ];

      validEmails.forEach(email => {
        const regex = new RegExp(EmailSchema.pattern);
        expect(regex.test(email)).toBe(true);
        expect(email.length).toBeGreaterThanOrEqual(EmailSchema.minLength);
        expect(email.length).toBeLessThanOrEqual(EmailSchema.maxLength);
      });
    });

    it('rejects invalid email formats', () => {
      const invalidEmails = [
        'invalid-email', // No @ symbol
        '@domain.com', // Starts with @
        'user@', // No domain
        'user@domain', // No TLD
        'a'.repeat(255) + '@example.com', // Too long
      ];

      invalidEmails.forEach(email => {
        const regex = new RegExp(EmailSchema.pattern);
        const isValidLength =
          email.length >= EmailSchema.minLength &&
          email.length <= EmailSchema.maxLength;
        const isValid = regex.test(email) && isValidLength;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('URL Validation', () => {
    it('validates correct URL formats', () => {
      const validUrls = [
        'https://example.com',
        'http://subdomain.domain.org/path',
        'https://domain.com/path/to/resource?param=value',
        'file:///Users/user/Documents/file.md',
        '/local/path/to/file',
        'https://localhost:3000/api/endpoint',
      ];

      validUrls.forEach(url => {
        const regex = new RegExp(UrlSchema.pattern);
        expect(regex.test(url)).toBe(true);
        expect(url.length).toBeGreaterThanOrEqual(UrlSchema.minLength);
        expect(url.length).toBeLessThanOrEqual(UrlSchema.maxLength);
      });
    });

    it('rejects invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://unsupported.protocol.com',
        'javascript:alert("xss")',
        'a'.repeat(2049), // Too long
        '',
        '   ',
      ];

      invalidUrls.forEach(url => {
        const regex = new RegExp(UrlSchema.pattern);
        const isValidLength =
          url.length >= UrlSchema.minLength &&
          url.length <= UrlSchema.maxLength;
        expect(regex.test(url) && isValidLength).toBe(false);
      });
    });
  });

  describe('ADHD Medication Validation', () => {
    it('validates medication names', () => {
      const validMedications = [
        'Adderall',
        'Ritalin XR',
        'Concerta',
        'Vyvanse',
        'Strattera',
        'Methylphenidate',
        'Amphetamine-Dextroamphetamine',
        'Qelbree (viloxazine)',
      ];

      validMedications.forEach(medication => {
        const regex = new RegExp(MedicationNameSchema.pattern);
        expect(regex.test(medication)).toBe(true);
        expect(medication.length).toBeGreaterThanOrEqual(
          MedicationNameSchema.minLength
        );
        expect(medication.length).toBeLessThanOrEqual(
          MedicationNameSchema.maxLength
        );
      });
    });

    it('rejects invalid medication names', () => {
      const invalidMedications = [
        '123InvalidStart',
        'Med<script>alert("xss")</script>',
        'a',
        'a'.repeat(101), // Too long
        '',
        '!@#$%',
      ];

      invalidMedications.forEach(medication => {
        const regex = new RegExp(MedicationNameSchema.pattern);
        const isValidLength =
          medication.length >= MedicationNameSchema.minLength &&
          medication.length <= MedicationNameSchema.maxLength;
        expect(regex.test(medication) && isValidLength).toBe(false);
      });
    });

    it('validates medication dosages', () => {
      const validDosages = [0.5, 2.5, 10, 15, 20, 30, 40, 60, 100];

      validDosages.forEach(dosage => {
        expect(dosage).toBeGreaterThanOrEqual(MedicationDosageSchema.minimum);
        expect(dosage).toBeLessThanOrEqual(MedicationDosageSchema.maximum);
        // Check if dosage is a multiple of 0.1 with floating point tolerance
        const remainder = (dosage * 10) % 1;
        expect(remainder).toBeCloseTo(0, 10);
      });
    });

    it('rejects invalid medication dosages', () => {
      const invalidDosages = [0, -5, 1001, 0.05]; // Below min, negative, above max, wrong precision

      invalidDosages.forEach(dosage => {
        const isValid =
          dosage >= MedicationDosageSchema.minimum &&
          dosage <= MedicationDosageSchema.maximum &&
          dosage % MedicationDosageSchema.multipleOf < 0.01;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Time Format Validation', () => {
    it('validates time formats', () => {
      const validTimes = [
        '08:00',
        '14:30',
        '2:30 PM',
        '10:00 AM',
        '23:59',
        '12:00 pm',
        '1:15 AM',
      ];

      validTimes.forEach(time => {
        const regex = new RegExp(TimeSchema.pattern);
        expect(regex.test(time)).toBe(true);
      });
    });

    it('rejects invalid time formats', () => {
      const invalidTimes = [
        '25:00',
        '12:60',
        '8am',
        '14:30 XM',
        'morning',
        '1200',
        '12:00:00',
      ];

      invalidTimes.forEach(time => {
        const regex = new RegExp(TimeSchema.pattern);
        expect(regex.test(time)).toBe(false);
      });
    });
  });

  describe('ADHD Symptom Severity Validation', () => {
    it('validates severity ratings', () => {
      const validSeverities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      validSeverities.forEach(severity => {
        expect(severity).toBeGreaterThanOrEqual(
          AdhdSymptomSeveritySchema.minimum
        );
        expect(severity).toBeLessThanOrEqual(AdhdSymptomSeveritySchema.maximum);
        expect(Number.isInteger(severity)).toBe(true);
      });
    });

    it('rejects invalid severity ratings', () => {
      const invalidSeverities = [0, -1, 11, 2.5, 'five'];

      invalidSeverities.forEach(severity => {
        const isValid =
          Number.isInteger(severity) &&
          typeof severity === 'number' &&
          severity >= AdhdSymptomSeveritySchema.minimum &&
          severity <= AdhdSymptomSeveritySchema.maximum;
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Voice Transcript Validation', () => {
    it('validates voice transcript content', () => {
      const validTranscripts = [
        'This is a normal voice memo transcript.',
        'Um, I need to remember to pick up milk and, uh, call the doctor.',
        "Meeting at 2 PM with John about the Q3 budget - don't forget the spreadsheet!",
        'Medication taken at 8:00 AM. Feeling focused today.',
        'Ideas for weekend: 1) Grocery shopping 2) Clean garage 3) Call mom',
      ];

      validTranscripts.forEach(transcript => {
        const regex = new RegExp(VoiceTranscriptSchema.pattern);
        expect(regex.test(transcript)).toBe(true);
        expect(transcript.length).toBeGreaterThanOrEqual(
          VoiceTranscriptSchema.minLength
        );
        expect(transcript.length).toBeLessThanOrEqual(
          VoiceTranscriptSchema.maxLength
        );
      });
    });

    it('rejects invalid transcript content', () => {
      const invalidTranscripts = [
        '', // Empty
        'a'.repeat(10001), // Too long
        'Contains <script>alert("xss")</script> malicious code', // Contains HTML tags
      ];

      invalidTranscripts.forEach(transcript => {
        const regex = new RegExp(VoiceTranscriptSchema.pattern);
        const isValidLength =
          transcript.length >= VoiceTranscriptSchema.minLength &&
          transcript.length <= VoiceTranscriptSchema.maxLength;
        expect(regex.test(transcript) && isValidLength).toBe(false);
      });
    });
  });

  describe('Tags Validation', () => {
    it('validates tag arrays', () => {
      const validTagArrays = [
        ['adhd', 'medication', 'morning'],
        ['work', 'deadline', 'urgent'],
        ['personal', 'health-related'],
        ['voice_memo', 'transcription', 'important'],
      ];

      validTagArrays.forEach(tags => {
        expect(tags.length).toBeLessThanOrEqual(TagsSchema.maxItems);
        tags.forEach(tag => {
          const regex = new RegExp(TagsSchema.items.pattern);
          expect(regex.test(tag)).toBe(true);
          expect(tag.length).toBeGreaterThanOrEqual(TagsSchema.items.minLength);
          expect(tag.length).toBeLessThanOrEqual(TagsSchema.items.maxLength);
        });
        // Check uniqueness
        expect(new Set(tags).size).toBe(tags.length);
      });
    });

    it('rejects invalid tag arrays', () => {
      const invalidTagArrays = [
        Array(21).fill('tag'), // Too many tags
        ['valid', 'valid'], // Duplicates
        ['', 'invalid'], // Empty tag
        ['-invalid'], // Invalid pattern (starts with hyphen)
        ['a'.repeat(51)], // Tag too long
      ];

      invalidTagArrays.forEach(tags => {
        let isValid = tags.length <= TagsSchema.maxItems;
        isValid = isValid && new Set(tags).size === tags.length; // Unique check
        isValid =
          isValid &&
          tags.every(tag => {
            const regex = new RegExp(TagsSchema.items.pattern);
            return (
              regex.test(tag) &&
              tag.length >= TagsSchema.items.minLength &&
              tag.length <= TagsSchema.items.maxLength
            );
          });
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Category and Priority Validation', () => {
    it('validates ADHD workflow categories', () => {
      const validCategories = [
        'voice_memo',
        'email_important',
        'medication_reminder',
        'task_urgent',
        'health_related',
      ];

      validCategories.forEach(category => {
        expect(CategorySchema.enum).toContain(category);
      });
    });

    it('validates priority levels', () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];

      validPriorities.forEach(priority => {
        expect(PrioritySchema.enum).toContain(priority);
      });
    });

    it('rejects invalid categories and priorities', () => {
      const invalidCategories = ['invalid_category', 'random', ''];
      const invalidPriorities = ['critical', 'normal', 'asap', ''];

      invalidCategories.forEach(category => {
        expect(CategorySchema.enum).not.toContain(category);
      });

      invalidPriorities.forEach(priority => {
        expect(PrioritySchema.enum).not.toContain(priority);
      });
    });
  });

  describe('Search Query Validation', () => {
    it('validates search queries', () => {
      const validQueries = [
        'medication reminder',
        'ADHD symptoms today',
        'meeting notes John',
        'deadline next week',
        'voice memo transcription',
      ];

      validQueries.forEach(query => {
        const regex = new RegExp(SearchQuerySchema.pattern);
        expect(regex.test(query)).toBe(true);
        expect(query.length).toBeGreaterThanOrEqual(
          SearchQuerySchema.minLength
        );
        expect(query.length).toBeLessThanOrEqual(SearchQuerySchema.maxLength);
      });
    });

    it('rejects malicious search queries', () => {
      const maliciousQueries = [
        '<script>alert("xss")</script>',
        'search term<iframe src="malicious"></iframe>',
        'query with \x00 null byte',
        'a'.repeat(501), // Too long
        '', // Empty
      ];

      maliciousQueries.forEach(query => {
        const regex = new RegExp(SearchQuerySchema.pattern);
        const isValidLength =
          query.length >= SearchQuerySchema.minLength &&
          query.length <= SearchQuerySchema.maxLength;
        expect(regex.test(query) && isValidLength).toBe(false);
      });
    });
  });

  describe('Vault Path Validation', () => {
    it('validates Obsidian vault paths', () => {
      const validPaths = [
        'Daily Notes/2023-12-25.md',
        'ADHD/Medication Tracking.md',
        'Voice Memos/Morning Thoughts.md',
        'Projects/Work Tasks.md',
        'Templates/Daily Template.md',
      ];

      validPaths.forEach(path => {
        const regex = new RegExp(VaultPathSchema.pattern);
        expect(regex.test(path)).toBe(true);
        expect(path.length).toBeGreaterThanOrEqual(VaultPathSchema.minLength);
        expect(path.length).toBeLessThanOrEqual(VaultPathSchema.maxLength);
      });
    });

    it('rejects invalid vault paths', () => {
      const invalidPaths = [
        'path/with<invalid>characters.md',
        'path/with:colon.md',
        'path/with|pipe.md',
        'path/with"quote.md',
        'path/with*asterisk.md',
        'path/with?question.md',
        'a'.repeat(1001), // Too long
        '', // Empty
      ];

      invalidPaths.forEach(path => {
        const regex = new RegExp(VaultPathSchema.pattern);
        const isValidLength =
          path.length >= VaultPathSchema.minLength &&
          path.length <= VaultPathSchema.maxLength;
        expect(regex.test(path) && isValidLength).toBe(false);
      });
    });
  });

  describe('Schema Factory Function', () => {
    it('creates custom validation schemas', () => {
      const customEmailSchema = createValidationSchema('email', {
        maxLength: 50,
      });
      expect((customEmailSchema as any).maxLength).toBe(50);

      const customSearchSchema = createValidationSchema('search', {
        minLength: 3,
      });
      expect((customSearchSchema as any).minLength).toBe(3);
    });

    it('respects original constraints when creating custom schemas', () => {
      const customEmailSchema = createValidationSchema('email', {
        maxLength: 500,
      });
      // Should not exceed original maxLength of 254
      expect((customEmailSchema as any).maxLength).toBe(254);

      const customMedicationSchema = createValidationSchema('medication', {
        minLength: 1,
      });
      // Should not go below original minLength of 2
      expect((customMedicationSchema as any).minLength).toBe(2);
    });
  });

  describe('Error Messages', () => {
    it('provides helpful error messages', () => {
      expect(ValidationErrorMessages.INVALID_EMAIL).toContain('example.com');
      expect(ValidationErrorMessages.INVALID_TIME_FORMAT).toContain('08:00');
      expect(ValidationErrorMessages.INVALID_SEVERITY_SCALE).toContain(
        '1 and 10'
      );
      expect(ValidationErrorMessages.INVALID_SEARCH_QUERY).toContain('HTML');
    });

    it('includes ADHD-friendly explanations', () => {
      expect(ValidationErrorMessages.INVALID_MEDICATION_NAME).toContain(
        'letters, numbers'
      );
      expect(ValidationErrorMessages.TOO_MANY_TAGS).toContain('20 tags');
      expect(ValidationErrorMessages.INVALID_PRIORITY).toContain('urgent');
    });
  });
});
