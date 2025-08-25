/**
 * Environment Security Tests
 * Critical security validation for ADHD data protection
 */
import { describe, it, expect } from 'vitest';
import {
  createSafeEnvironmentDebugInfo,
  secureConfigUtils,
  ENHANCED_REDACT_KEYS,
} from '../../src/config/environment.js';

describe('Environment Security', () => {
  describe('Secret Redaction', () => {
    it('should redact sensitive environment variables', () => {
      const safeDebugInfo = createSafeEnvironmentDebugInfo();

      expect(safeDebugInfo).toHaveProperty('environment');
      expect(safeDebugInfo).toHaveProperty('securityNote');
      expect(safeDebugInfo.securityNote).toContain('ADHD data protection');

      const env = safeDebugInfo.environment as Record<string, string>;

      // Check that sensitive patterns are redacted
      Object.entries(env).forEach(([key, value]) => {
        if (
          key.toLowerCase().includes('vault') ||
          key.toLowerCase().includes('obsidian')
        ) {
          expect(value).toMatch(/\[REDACTED/);
        }

        if (
          (key.toLowerCase().includes('vault') &&
            key.toLowerCase().includes('path')) ||
          key === 'OBSIDIAN_VAULT_PATH'
        ) {
          // Vault-related paths should definitely be redacted
          expect(value).toMatch(/\[REDACTED/);
        }

        if (
          key.toLowerCase().includes('url') &&
          typeof value === 'string' &&
          value.startsWith('http')
        ) {
          // URLs should show protocol and hostname only
          expect(value).toMatch(/^https?:\/\/[^:]+:\[REDACTED\]$|localhost/);
        }
      });
    });

    it('should have comprehensive redaction keys for ADHD data protection', () => {
      expect(ENHANCED_REDACT_KEYS).toContain('obsidianVaultPath');
      expect(ENHANCED_REDACT_KEYS).toContain('OBSIDIAN_VAULT_PATH');
      expect(ENHANCED_REDACT_KEYS).toContain('vaultPath');
      expect(ENHANCED_REDACT_KEYS).toContain('chromaDbUrl');
      expect(ENHANCED_REDACT_KEYS).toContain('ollamaUrl');

      // Should cover medical/health related keys
      expect(
        ENHANCED_REDACT_KEYS.some(key => key.toLowerCase().includes('medical'))
      ).toBe(true);
      expect(
        ENHANCED_REDACT_KEYS.some(key => key.toLowerCase().includes('health'))
      ).toBe(true);
    });

    it('should redact personal directory paths', () => {
      const testValues = [
        '/Users/john/Documents/vault',
        '/home/user/obsidian',
        'C:\\Users\\Jane\\vault',
        '/Users/someone/.obsidian',
      ];

      // Mock environment with personal paths
      process.env.MOCK_VAULT_PATH = testValues[0];

      const newSafeInfo = createSafeEnvironmentDebugInfo();
      const env = newSafeInfo.environment as Record<string, string>;

      if (env.MOCK_VAULT_PATH) {
        // Should be redacted as a path containing vault
        expect(env.MOCK_VAULT_PATH).toMatch(/\[REDACTED/);
      }

      // Cleanup
      delete process.env.MOCK_VAULT_PATH;
    });
  });

  describe('Configuration Security Validation', () => {
    it('should validate ADHD data protection compliance', () => {
      const issues = secureConfigUtils.validateAdhdDataProtectionCompliance();

      // Should return an array (empty or with issues)
      expect(Array.isArray(issues)).toBe(true);

      // All issues should be strings with meaningful content
      issues.forEach(issue => {
        expect(typeof issue).toBe('string');
        expect(issue.length).toBeGreaterThan(10);
      });
    });

    it('should provide secure configuration debugging info', () => {
      const safeConfig = secureConfigUtils.getSafeConfigForDebugging();

      expect(safeConfig).toHaveProperty('config');
      expect(safeConfig).toHaveProperty('environment');
      expect(safeConfig).toHaveProperty('timestamp');
      expect(safeConfig).toHaveProperty('securityNote');

      expect(safeConfig.securityNote).toContain('ADHD data protection');
    });

    it('should create secure configuration errors', () => {
      const testMessage = 'Test configuration error';
      const testContext = {
        obsidianVaultPath: '/Users/test/vault',
        apiKey: 'secret123',
      };

      const error = secureConfigUtils.createSecureConfigError(
        testMessage,
        testContext
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Configuration Error');
      expect(error.message).toContain(testMessage);

      // Should have debug context without exposing secrets
      const debugContext = (error as { debugContext?: unknown }).debugContext;
      expect(debugContext).toBeDefined();
      expect(debugContext.safeContext).toBeDefined();

      // Sensitive values should be redacted
      if (debugContext.safeContext.obsidianVaultPath) {
        expect(debugContext.safeContext.obsidianVaultPath).toMatch(
          /\[REDACTED/
        );
      }
      if (debugContext.safeContext.apiKey) {
        expect(debugContext.safeContext.apiKey).toMatch(/\[REDACTED/);
      }
    });

    it('should provide health status with compliance check', () => {
      const health = secureConfigUtils.getSecureHealthStatus();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('environment');
      expect(health).toHaveProperty('complianceIssues');
      expect(health).toHaveProperty('timestamp');

      expect(['healthy', 'warning', 'error']).toContain(health.status);
      expect(typeof health.environment).toBe('string');
      expect(Array.isArray(health.complianceIssues)).toBe(true);
    });
  });

  describe('Error Message Security', () => {
    it('should never expose process.env in error messages', () => {
      // Test that environment parsing errors don't leak secrets

      try {
        // Mock a sensitive environment
        process.env.SENSITIVE_API_KEY = 'super-secret-key-123';
        process.env.OBSIDIAN_VAULT_PATH = '/Users/testuser/private/vault';

        const safeInfo = createSafeEnvironmentDebugInfo();
        const envString = JSON.stringify(safeInfo);

        // Should not contain the actual sensitive values
        expect(envString).not.toContain('super-secret-key-123');
        expect(envString).not.toContain('/Users/testuser/private');

        // Should contain redacted placeholders
        expect(envString).toMatch(/\[REDACTED/);
      } finally {
        // Cleanup
        delete process.env.SENSITIVE_API_KEY;
        delete process.env.OBSIDIAN_VAULT_PATH;
      }
    });
  });

  describe('Performance Security', () => {
    it('should not cause performance degradation with redaction', () => {
      const start = performance.now();

      // Run multiple redactions
      for (let i = 0; i < 100; i++) {
        createSafeEnvironmentDebugInfo();
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 100 redactions in under 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
