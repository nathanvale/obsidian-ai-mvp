import { describe, it, expect, beforeAll } from 'vitest'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

describe('Husky Integration', () => {
  const projectRoot = process.cwd()

  beforeAll(() => {
    // Ensure we're in project root
    expect(existsSync(join(projectRoot, 'package.json'))).toBe(true)
  })

  it('should have husky installed as dev dependency', () => {
    const packageJson = JSON.parse(
      readFileSync(join(projectRoot, 'package.json'), 'utf8'),
    )
    expect(packageJson.devDependencies).toHaveProperty('husky')
    expect(packageJson.devDependencies).toHaveProperty('lint-staged')
  })

  it('should have prepare script configured', () => {
    const packageJson = JSON.parse(
      readFileSync(join(projectRoot, 'package.json'), 'utf8'),
    )
    expect(packageJson.scripts).toHaveProperty('prepare', 'husky')
  })

  it('should have .husky directory with hooks', () => {
    expect(existsSync(join(projectRoot, '.husky'))).toBe(true)
    expect(existsSync(join(projectRoot, '.husky', 'pre-commit'))).toBe(true)
    expect(existsSync(join(projectRoot, '.husky', 'pre-push'))).toBe(true)
  })

  it('should have pre-commit hook configured with lint-staged', () => {
    const preCommitHook = readFileSync(
      join(projectRoot, '.husky', 'pre-commit'),
      'utf8',
    )
    expect(preCommitHook).toContain('npx lint-staged')
  })

  it('should have pre-push hook configured with check script', () => {
    const prePushHook = readFileSync(
      join(projectRoot, '.husky', 'pre-push'),
      'utf8',
    )
    expect(prePushHook).toContain('bun run check')
  })

  it('should have lint-staged configuration in package.json', () => {
    const packageJson = JSON.parse(
      readFileSync(join(projectRoot, 'package.json'), 'utf8'),
    )
    expect(packageJson).toHaveProperty('lint-staged')

    const lintStaged = packageJson['lint-staged']

    // Check for src/**/*.ts configuration
    const tsKey = 'src/**/*.ts'
    expect(tsKey in lintStaged).toBe(true)
    expect(lintStaged[tsKey]).toContain('prettier --write')
    expect(lintStaged[tsKey]).toContain('eslint --fix --cache')
    expect(lintStaged[tsKey]).toContain("bash -c 'bun run typecheck'")

    // Check for general file formatting
    const generalKey = '*.{json,md,yml,yaml}'
    expect(generalKey in lintStaged).toBe(true)
    expect(lintStaged[generalKey]).toContain('prettier --write')
  })

  it('should have .prettierrc.json with @orchestr8 configuration', () => {
    expect(existsSync(join(projectRoot, '.prettierrc.json'))).toBe(true)

    const prettierConfig = JSON.parse(
      readFileSync(join(projectRoot, '.prettierrc.json'), 'utf8'),
    )
    expect(prettierConfig).toHaveProperty('semi', true)
    expect(prettierConfig).toHaveProperty('singleQuote', true)
    expect(prettierConfig).toHaveProperty('tabWidth', 2)
    expect(prettierConfig).toHaveProperty('trailingComma', 'es5')
    expect(prettierConfig).toHaveProperty('printWidth', 80)
  })

  it('should have .husky/README.md documentation', () => {
    expect(existsSync(join(projectRoot, '.husky', 'README.md'))).toBe(true)

    const readme = readFileSync(
      join(projectRoot, '.husky', 'README.md'),
      'utf8',
    )
    expect(readme).toContain('Git Hooks Configuration')
    expect(readme).toContain('pre-commit')
    expect(readme).toContain('pre-push')
    expect(readme).toContain('Troubleshooting')
  })

  it('should be able to execute husky install', () => {
    expect(() => {
      execSync('npx husky', { cwd: projectRoot, stdio: 'pipe' })
    }).not.toThrow()
  })

  it('should validate git hooks are executable', () => {
    const preCommitPath = join(projectRoot, '.husky', 'pre-commit')
    const prePushPath = join(projectRoot, '.husky', 'pre-push')

    if (existsSync(preCommitPath)) {
      expect(() => {
        execSync(`test -x "${preCommitPath}"`, { cwd: projectRoot })
      }).not.toThrow()
    }

    if (existsSync(prePushPath)) {
      expect(() => {
        execSync(`test -x "${prePushPath}"`, { cwd: projectRoot })
      }).not.toThrow()
    }
  })
})
