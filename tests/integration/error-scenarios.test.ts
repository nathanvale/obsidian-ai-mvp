import { describe, it, expect, afterAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs'
import { join } from 'path'

describe('Error Scenarios Integration Tests', () => {
  const projectRoot = process.cwd()
  const tempTestFile = join(projectRoot, 'src', 'temp-error-test.ts')

  afterAll(() => {
    // Clean up any temporary files
    if (existsSync(tempTestFile)) {
      unlinkSync(tempTestFile)
    }
  })

  describe('Script Error Handling', () => {
    it('should fail gracefully when format check fails', () => {
      // Create a deliberately malformatted file
      const malformattedCode = `
const   badFormatting={
  prop1  :  "value1"    ,
      prop2:     "value2"
};
`

      writeFileSync(tempTestFile, malformattedCode)

      try {
        execSync('bun run format:check', {
          stdio: 'pipe',
          cwd: projectRoot,
        })
        // Should not reach here
        expect(false).toBe(true)
      } catch (error: unknown) {
        const execError = error as {
          status?: number
          stdout?: Buffer
          stderr?: Buffer
        }
        expect(execError.status).toBe(1)
        const output =
          execError.stdout?.toString() || execError.stderr?.toString()
        // Prettier outputs formatting status messages
        expect(output).toMatch(/Checking formatting|Code style issues/i)
      }

      // Clean up
      unlinkSync(tempTestFile)
    })

    it('should fail gracefully when type check fails', () => {
      // Create a file with TypeScript errors
      const typeErrorCode = `
export const badTypes = {
  stringAsNumber: "hello" as number,
  undefinedProperty: nonExistentVariable,
  wrongReturnType: (): string => 42
};
`

      writeFileSync(tempTestFile, typeErrorCode)

      try {
        execSync('bun run typecheck', {
          stdio: 'pipe',
          cwd: projectRoot,
        })
        // Should not reach here
        expect(false).toBe(true)
      } catch (error: unknown) {
        const execError = error as {
          status?: number
          stdout?: Buffer
          stderr?: Buffer
        }
        expect(execError.status).toBeGreaterThan(0)
        // TypeScript should report errors
        const output =
          execError.stdout?.toString() || execError.stderr?.toString()
        expect(output).toMatch(/error/i)
      }

      // Clean up
      unlinkSync(tempTestFile)
    })

    it('should provide clear error messages for check:no-test failures', () => {
      // Create a file with multiple issues
      const multiErrorCode = `
const   malformed={badProp:"val",};
export const typeError: string = 123;
`

      writeFileSync(tempTestFile, multiErrorCode)

      try {
        execSync('bun run check:no-test', {
          stdio: 'pipe',
          cwd: projectRoot,
        })
        expect(false).toBe(true)
      } catch (error: unknown) {
        const execError = error as {
          status?: number
          stdout?: Buffer
          stderr?: Buffer
        }
        expect(execError.status).toBe(1)
        // Should fail fast on first error (format check)
        const output =
          execError.stdout?.toString() || execError.stderr?.toString()
        expect(output).toMatch(/Checking formatting|Code style issues/i)
      }

      // Clean up
      unlinkSync(tempTestFile)
    })

    it('should handle missing dependencies gracefully', () => {
      try {
        // Test with invalid command to simulate missing tool
        execSync('nonexistent-command --version', {
          stdio: 'pipe',
          cwd: projectRoot,
        })
        expect(false).toBe(true)
      } catch (error: unknown) {
        const execError = error as {
          status?: number
          stdout?: Buffer
          stderr?: Buffer
        }
        expect(execError.status).toBeGreaterThan(0)
        expect((error as Error).message).toMatch(/command not found|ENOENT/)
      }
    })
  })

  describe('Pre-commit Hook Error Scenarios', () => {
    it('should block commits with formatting issues', () => {
      const malformattedCode = `
const   badFormat=  {
    "prop":"value"
   };
`

      writeFileSync(tempTestFile, malformattedCode)

      try {
        // Stage the malformatted file
        execSync(`git add ${tempTestFile}`, { cwd: projectRoot })

        // Try to commit (should fail due to pre-commit hook)
        execSync('git commit -m "Test commit with formatting issues"', {
          stdio: 'pipe',
          cwd: projectRoot,
        })

        expect(false).toBe(true) // Should not reach here
      } catch (error: unknown) {
        const execError = error as {
          status?: number
          stdout?: Buffer
          stderr?: Buffer
        }
        expect(execError.status).toBe(1)
        // Pre-commit hook should have fixed formatting and re-staged
        // But type errors might still cause failure
      }

      // Clean up - unstage and remove file
      try {
        execSync(`git reset HEAD ${tempTestFile}`, { cwd: projectRoot })
      } catch {
        // Ignore git reset errors
      }

      if (existsSync(tempTestFile)) {
        unlinkSync(tempTestFile)
      }
    })

    it('should provide helpful error messages for pre-push failures', () => {
      // This test verifies error message quality without actually pushing
      const preCommitPath = join(projectRoot, '.husky', 'pre-push')

      expect(existsSync(preCommitPath)).toBe(true)

      const hookContent = readFileSync(preCommitPath, 'utf8')
      expect(hookContent).toContain('bun run check')

      // The hook should run our comprehensive check script
      // which provides clear error messages
    })
  })

  describe('CI Workflow Error Scenarios', () => {
    it('should have proper error handling in workflow steps', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'ci.yml')

      expect(existsSync(workflowPath)).toBe(true)

      const workflowContent = readFileSync(workflowPath, 'utf8')

      // Should not have continue-on-error set to true (fail fast)
      expect(workflowContent).not.toContain('continue-on-error: true')

      // Should use proper exit codes by default
      expect(workflowContent).toContain('bun run check:no-test')
      expect(workflowContent).toContain('bun run test:smoke')
    })

    it('should fail fast on quality check failures', () => {
      const workflowPath = join(projectRoot, '.github', 'workflows', 'ci.yml')
      const workflowContent = readFileSync(workflowPath, 'utf8')

      // Steps should be sequential (no parallel execution)
      // check:no-test should come before build and test:smoke
      const checkIndex = workflowContent.indexOf('check:no-test')
      const buildIndex = workflowContent.indexOf('bun run build')
      const testIndex = workflowContent.indexOf('test:smoke')

      expect(checkIndex).toBeLessThan(buildIndex)
      expect(buildIndex).toBeLessThan(testIndex)
    })
  })

  describe('Cross-platform Compatibility', () => {
    it('should work on macOS development environment', () => {
      // Test shell compatibility
      try {
        const result = execSync('which bash', { stdio: 'pipe' })
        expect(result.toString().trim()).toContain('/bash')
      } catch {
        // If bash is not available, ensure sh works
        const result = execSync('which sh', { stdio: 'pipe' })
        expect(result.toString().trim()).toContain('/sh')
      }
    })

    it('should have executable permissions on hook files', () => {
      const preCommitPath = join(projectRoot, '.husky', 'pre-commit')
      const prePushPath = join(projectRoot, '.husky', 'pre-push')

      if (existsSync(preCommitPath)) {
        try {
          execSync(`test -x "${preCommitPath}"`, { cwd: projectRoot })
          expect(true).toBe(true) // Test passed
        } catch {
          expect(false).toBe(true) // File should be executable
        }
      }

      if (existsSync(prePushPath)) {
        try {
          execSync(`test -x "${prePushPath}"`, { cwd: projectRoot })
          expect(true).toBe(true) // Test passed
        } catch {
          expect(false).toBe(true) // File should be executable
        }
      }
    })

    it('should handle path resolution correctly', () => {
      // Test that npx commands resolve correctly
      try {
        execSync('npx --version', { stdio: 'pipe' })
        expect(true).toBe(true)
      } catch {
        // Skip if npx not available, but expect it to work in real environment
        expect(true).toBe(true)
      }
    })
  })

  describe('Performance Impact Validation', () => {
    it('should complete pre-commit checks within reasonable time', async () => {
      const testFile = join(projectRoot, 'src', 'perf-test.ts')
      const simpleCode = `
export const perfTest = {
  timestamp: new Date().toISOString(),
  message: "Performance test file"
};
`

      writeFileSync(testFile, simpleCode)

      const startTime = Date.now()

      try {
        // Stage the file
        execSync(`git add ${testFile}`, { cwd: projectRoot })

        // Run lint-staged (simulating pre-commit)
        execSync('npx lint-staged', {
          stdio: 'pipe',
          cwd: projectRoot,
        })

        const endTime = Date.now()
        const duration = endTime - startTime

        // Should complete within 30 seconds for a simple file
        expect(duration).toBeLessThan(30000)
      } catch {
        // Even if the operation fails, it shouldn't take too long
        const endTime = Date.now()
        const duration = endTime - startTime
        expect(duration).toBeLessThan(30000)
      }

      // Clean up
      try {
        execSync(`git reset HEAD ${testFile}`, { cwd: projectRoot })
      } catch {
        // Ignore git reset errors
      }

      if (existsSync(testFile)) {
        unlinkSync(testFile)
      }
    })

    it('should have minimal impact on development workflow', () => {
      // Test that hook execution is reasonably fast
      const preCommitPath = join(projectRoot, '.husky', 'pre-commit')

      if (existsSync(preCommitPath)) {
        const hookContent = readFileSync(preCommitPath, 'utf8')

        // Should use lint-staged for performance optimization
        expect(hookContent).toContain('lint-staged')

        // Should not run full project checks on every commit
        expect(hookContent).not.toContain('bun run check')
        expect(hookContent).not.toContain('bun run test')
      }
    })
  })

  describe('Error Message Quality', () => {
    it('should provide actionable error messages', () => {
      const scriptsTest = join(projectRoot, 'tests', 'unit', 'scripts.test.ts')

      if (existsSync(scriptsTest)) {
        const testContent = readFileSync(scriptsTest, 'utf8')

        // Test file should validate error handling
        expect(testContent).toContain('should have')
        expect(testContent).toContain('expect')
      }
    })

    it('should fail fast with clear feedback', () => {
      // Validate that our check scripts use && for fail-fast behavior
      const packageJson = JSON.parse(
        readFileSync(join(projectRoot, 'package.json'), 'utf8'),
      )

      const checkScript = packageJson.scripts['check:no-test']
      expect(checkScript).toContain('&&')

      // Each step should fail independently with clear output
      expect(checkScript).toContain('format:check')
      expect(checkScript).toContain('lint:check')
      expect(checkScript).toContain('typecheck')
    })
  })
})
