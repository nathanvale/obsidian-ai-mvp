import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PackageJsonScripts {
  scripts: Record<string, string>;
}

describe('Script Execution Validation', () => {
  const projectRoot = process.cwd();
  let packageJson: PackageJsonScripts;

  beforeAll(() => {
    packageJson = JSON.parse(
      readFileSync(join(projectRoot, 'package.json'), 'utf8')
    );
  });

  describe('Package.json Scripts', () => {
    it('should have all required @orchestr8 pattern scripts defined', () => {
      const requiredScripts = [
        'prepare',
        'format:check',
        'lint:check',
        'typecheck',
        'test:smoke',
        'check:no-test',
        'check',
      ];

      requiredScripts.forEach(script => {
        expect(packageJson.scripts).toHaveProperty(script);
      });
    });

    it('should have correct script implementations', () => {
      expect(packageJson.scripts.prepare).toBe('husky');
      expect(packageJson.scripts['format:check']).toBe('prettier --check .');
      expect(packageJson.scripts['lint:check']).toMatch(
        /eslint.*--cache.*--max-warnings 0/
      );
      expect(packageJson.scripts.typecheck).toBe('tsc --noEmit');
      expect(packageJson.scripts['test:smoke']).toMatch(
        /test.*husky\.test\.ts/
      );
      expect(packageJson.scripts['check:no-test']).toContain('format:check');
      expect(packageJson.scripts['check:no-test']).toContain('lint:check');
      expect(packageJson.scripts['check:no-test']).toContain('typecheck');
      expect(packageJson.scripts.check).toContain('check:no-test');
      expect(packageJson.scripts.check).toContain('test:smoke');
    });
  });

  describe('Script Dependencies', () => {
    it('should validate format:check dependencies', () => {
      expect(() => {
        execSync(`npx prettier --version`, { stdio: 'pipe' });
      }).not.toThrow();
    });

    it('should validate lint:check dependencies', () => {
      expect(() => {
        execSync(`npx eslint --version`, { stdio: 'pipe' });
      }).not.toThrow();
    });

    it('should validate typecheck dependencies', () => {
      expect(() => {
        execSync(`npx tsc --version`, { stdio: 'pipe' });
      }).not.toThrow();
    });
  });

  describe('Script Execution Flow', () => {
    it('should have proper execution order in check:no-test', () => {
      const script = packageJson.scripts['check:no-test'];
      const parts = script.split('&&').map((s: string) => s.trim());

      // Should run format:check first, then lint:check, then typecheck
      expect(parts[0]).toContain('format:check');
      expect(parts[1]).toContain('lint:check');
      expect(parts[2]).toContain('typecheck');
    });

    it('should have proper execution order in check', () => {
      const script = packageJson.scripts.check;
      const parts = script.split('&&').map((s: string) => s.trim());

      // Should run check:no-test first, then test:smoke
      expect(parts[0]).toContain('check:no-test');
      expect(parts[1]).toContain('test:smoke');
    });
  });

  describe('Script Performance Optimization', () => {
    it('should use caching in lint:check', () => {
      const script = packageJson.scripts['lint:check'];
      expect(script).toContain('--cache');
    });

    it('should use max-warnings 0 for strict linting', () => {
      const script = packageJson.scripts['lint:check'];
      expect(script).toContain('--max-warnings 0');
    });

    it('should target all files for format:check', () => {
      const script = packageJson.scripts['format:check'];
      expect(script).toContain('prettier --check .');
    });
  });

  describe('Script Integration with @orchestr8 Pattern', () => {
    it('should follow @orchestr8 naming conventions', () => {
      // @orchestr8 uses check:no-test and check pattern
      expect(packageJson.scripts).toHaveProperty('check:no-test');
      expect(packageJson.scripts).toHaveProperty('check');

      // Should not have non-standard variations
      expect(packageJson.scripts).not.toHaveProperty('validate');
      expect(packageJson.scripts).not.toHaveProperty('quality');
    });

    it('should use bun runtime for @orchestr8 pattern consistency', () => {
      const checkScript = packageJson.scripts.check;
      const checkNoTestScript = packageJson.scripts['check:no-test'];

      expect(checkScript).toMatch(/bun run/);
      expect(checkNoTestScript).toMatch(/bun run/);
    });
  });

  describe('Error Handling in Scripts', () => {
    it('should fail fast with && operators', () => {
      const checkNoTestScript = packageJson.scripts['check:no-test'];
      const checkScript = packageJson.scripts.check;

      // Both should use && for fail-fast behavior
      expect(checkNoTestScript).toContain('&&');
      expect(checkScript).toContain('&&');
    });
  });
});
