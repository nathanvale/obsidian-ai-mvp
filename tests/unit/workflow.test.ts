import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { load } from 'js-yaml'

interface WorkflowStep {
  name?: string
  uses?: string
  run?: string
  'continue-on-error'?: boolean
}

interface GitHubJob {
  name: string
  'runs-on': string
  steps: WorkflowStep[]
}

interface GitHubWorkflow {
  name: string
  on: {
    pull_request: {
      branches: string[]
    }
    workflow_dispatch: Record<string, never>
  }
  concurrency?: {
    group: string
    'cancel-in-progress': boolean
  }
  jobs: {
    validate: GitHubJob
  }
}

describe('GitHub Actions Workflow Validation', () => {
  const projectRoot = process.cwd()
  const workflowPath = join(projectRoot, '.github', 'workflows', 'ci.yml')
  let workflow: GitHubWorkflow

  beforeAll(() => {
    expect(existsSync(workflowPath)).toBe(true)
    const workflowContent = readFileSync(workflowPath, 'utf8')
    workflow = load(workflowContent) as GitHubWorkflow
  })

  describe('Workflow Structure', () => {
    it('should have correct workflow name', () => {
      expect(workflow.name).toBe('CI')
    })

    it('should have proper trigger configuration', () => {
      expect(workflow.on).toHaveProperty('pull_request')
      expect(workflow.on.pull_request).toHaveProperty('branches')
      expect(workflow.on.pull_request.branches).toContain('main')
      expect(workflow.on).toHaveProperty('workflow_dispatch')
    })

    it('should have @orchestr8 concurrency control', () => {
      expect(workflow.concurrency).toBeDefined()
      expect(workflow.concurrency?.group).toMatch(
        /\$\{\{ github\.workflow \}\}/,
      )
      expect(workflow.concurrency?.group).toMatch(/\$\{\{ github\.ref \}\}/)
      expect(workflow.concurrency?.['cancel-in-progress']).toBe(true)
    })
  })

  describe('Validate Job Configuration', () => {
    it('should have single validate job', () => {
      expect(workflow.jobs).toHaveProperty('validate')
      expect(Object.keys(workflow.jobs)).toHaveLength(1)
    })

    it('should have correct job metadata', () => {
      const validateJob = workflow.jobs.validate
      expect(validateJob.name).toBe('Validate')
      expect(validateJob['runs-on']).toBe('ubuntu-latest')
    })

    it('should have required steps', () => {
      const validateJob = workflow.jobs.validate
      expect(validateJob.steps).toBeDefined()
      expect(Array.isArray(validateJob.steps)).toBe(true)
      expect(validateJob.steps.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Workflow Steps Validation', () => {
    let steps: WorkflowStep[]

    beforeAll(() => {
      steps = workflow.jobs.validate.steps
    })

    it('should have checkout step', () => {
      const checkoutStep = steps.find((step) => step.uses?.includes('checkout'))
      expect(checkoutStep).toBeDefined()
      expect(checkoutStep?.uses).toBe('actions/checkout@v4')
    })

    it('should have bun setup step', () => {
      const bunStep = steps.find((step) => step.uses?.includes('setup-bun'))
      expect(bunStep).toBeDefined()
      expect(bunStep?.uses).toBe('oven-sh/setup-bun@v1')
    })

    it('should have frozen lockfile installation', () => {
      const installStep = steps.find((step) => step.run?.includes('install'))
      expect(installStep).toBeDefined()
      expect(installStep?.run).toContain('--frozen-lockfile')
    })

    it('should have sequential quality steps', () => {
      const runSteps = steps.filter(
        (step) => step.run && !step.run.includes('install'),
      )

      // Should have check:no-test, build, and test:smoke steps
      expect(runSteps.length).toBeGreaterThanOrEqual(3)

      const stepCommands = runSteps.map((step) => step.run!)
      expect(stepCommands.some((cmd) => cmd.includes('check:no-test'))).toBe(
        true,
      )
      expect(stepCommands.some((cmd) => cmd.includes('build'))).toBe(true)
      expect(stepCommands.some((cmd) => cmd.includes('test:smoke'))).toBe(true)
    })
  })

  describe('Step Execution Order', () => {
    it('should execute steps in correct order', () => {
      const steps = workflow.jobs.validate.steps
      const stepNames = steps.map((step) => step.uses || step.run || '')

      // Find indices of key steps
      const checkoutIndex = stepNames.findIndex((step) =>
        step.includes('checkout'),
      )
      const bunIndex = stepNames.findIndex((step) => step.includes('setup-bun'))
      const installIndex = stepNames.findIndex((step) =>
        step.includes('install'),
      )
      const checkIndex = stepNames.findIndex((step) =>
        step.includes('check:no-test'),
      )
      const buildIndex = stepNames.findIndex((step) => step.includes('build'))
      const testIndex = stepNames.findIndex((step) =>
        step.includes('test:smoke'),
      )

      // Verify order
      expect(checkoutIndex).toBeLessThan(bunIndex)
      expect(bunIndex).toBeLessThan(installIndex)
      expect(installIndex).toBeLessThan(checkIndex)
      expect(checkIndex).toBeLessThan(buildIndex)
      expect(buildIndex).toBeLessThan(testIndex)
    })
  })

  describe('Bun Configuration', () => {
    it('should use bun for all script execution', () => {
      const steps = workflow.jobs.validate.steps
      const runSteps = steps.filter(
        (step) => step.run && !step.run.includes('install'),
      )

      runSteps.forEach((step) => {
        const runCommand = step.run!
        if (runCommand.includes('run ')) {
          expect(runCommand).toMatch(/bun run/)
        }
      })
    })

    it('should use frozen lockfile for deterministic installs', () => {
      const steps = workflow.jobs.validate.steps
      const installStep = steps.find((step) => step.run?.includes('install'))

      expect(installStep?.run).toContain('bun install --frozen-lockfile')
    })
  })

  describe('Error Handling', () => {
    it('should fail fast on step failures', () => {
      const steps = workflow.jobs.validate.steps

      // By default, GitHub Actions fails fast, but we can verify no continue-on-error
      steps.forEach((step) => {
        expect(step['continue-on-error']).not.toBe(true)
      })
    })
  })

  describe('@orchestr8 Pattern Compliance', () => {
    it('should follow @orchestr8 naming conventions', () => {
      expect(workflow.name).toBe('CI')
      expect(workflow.jobs).toHaveProperty('validate')
      expect(workflow.jobs.validate.name).toBe('Validate')
    })

    it('should have proper concurrency group pattern', () => {
      const group = workflow.concurrency?.group
      expect(group).toMatch(
        /\$\{\{ github\.workflow \}\}-\$\{\{ github\.ref \}\}/,
      )
    })

    it('should execute @orchestr8 script pattern', () => {
      const steps = workflow.jobs.validate.steps
      const scriptSteps = steps.filter((step) => step.run?.includes('bun run'))

      // Should use the exact @orchestr8 script names
      const commands = scriptSteps.map((step) => step.run!)
      expect(commands.some((cmd) => cmd.includes('check:no-test'))).toBe(true)
      expect(commands.some((cmd) => cmd.includes('test:smoke'))).toBe(true)
    })
  })
})
