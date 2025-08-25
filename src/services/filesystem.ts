import { promises as fs } from 'fs'
import path from 'path'
import { config } from '../config/environment.js'
import { logWithContext } from './logger.js'

interface MarkdownFile {
  path: string
  name: string
  content: string
  size: number
  modifiedAt: Date
  relativePath: string
}

interface VaultStats {
  totalFiles: number
  totalSize: number
  lastScanned: Date
}

class FileSystemService {
  private vaultPath: string | null = null

  constructor() {
    // Validate environment vault path on initialization
    if (config.obsidianVaultPath) {
      this.setVaultPath(config.obsidianVaultPath)
    }
  }

  /**
   * Validates and normalizes a file path to ensure it stays within vault boundaries
   * Prevents directory traversal attacks like ../../etc/passwd
   */
  private validateAndNormalizePath(
    inputPath: string,
    vaultRoot: string,
  ): string {
    // Remove null bytes and normalize
    const sanitized = inputPath.replace(/\0/g, '')

    // Check for obvious traversal attempts
    if (sanitized.includes('..') || sanitized.includes('~')) {
      logWithContext.warn('Path traversal attempt detected', {
        inputPath,
        sanitized,
        correlationId: 'security-violation',
      })
      throw new Error('Invalid file path: directory traversal not allowed')
    }

    // Resolve and normalize both paths to handle all edge cases
    const normalizedVault = path.resolve(vaultRoot)
    const resolvedPath = path.resolve(normalizedVault, sanitized)

    // Critical security check: ensure resolved path is within vault
    if (
      !resolvedPath.startsWith(normalizedVault + path.sep) &&
      resolvedPath !== normalizedVault
    ) {
      logWithContext.error('Path traversal security violation', {
        inputPath,
        sanitized,
        resolvedPath,
        normalizedVault,
        correlationId: 'security-violation',
      })
      throw new Error('Access denied: path outside vault boundary')
    }

    return resolvedPath
  }

  setVaultPath(vaultPath: string): void {
    // Validate and normalize the vault path to prevent injection
    const sanitized = vaultPath.replace(/\0/g, '')

    if (sanitized.includes('..')) {
      logWithContext.error(
        'Path traversal attempt in vault path configuration',
        {
          inputPath: vaultPath,
          correlationId: 'security-violation',
        },
      )
      throw new Error('Invalid vault path: directory traversal not allowed')
    }

    const normalizedPath = path.resolve(sanitized)
    logWithContext.info('Vault path configured', {
      originalPath: vaultPath,
      normalizedPath,
      correlationId: 'vault-config',
    })

    this.vaultPath = normalizedPath
  }

  getVaultPath(): string | null {
    return this.vaultPath
  }

  private ensureVaultPath(): string {
    if (!this.vaultPath) {
      throw new Error(
        'Obsidian vault path not configured. Set OBSIDIAN_VAULT_PATH environment variable.',
      )
    }
    return this.vaultPath
  }

  async validateVaultPath(vaultPath?: string): Promise<boolean> {
    const pathToCheck = vaultPath || this.vaultPath
    if (!pathToCheck) {
      return false
    }

    try {
      const stats = await fs.stat(pathToCheck)
      if (!stats.isDirectory()) {
        return false
      }

      const files = await fs.readdir(pathToCheck)
      const hasObsidianConfig = files.includes('.obsidian')

      return hasObsidianConfig
    } catch {
      return false
    }
  }

  async scanMarkdownFiles(): Promise<MarkdownFile[]> {
    const vaultPath = this.ensureVaultPath()
    const markdownFiles: MarkdownFile[] = []

    await this.scanDirectory(vaultPath, vaultPath, markdownFiles)
    return markdownFiles
  }

  private async scanDirectory(
    currentPath: string,
    vaultRoot: string,
    results: MarkdownFile[],
  ): Promise<void> {
    try {
      // Validate current directory is within vault boundaries
      const normalizedVault = path.resolve(vaultRoot)
      const normalizedCurrent = path.resolve(currentPath)

      if (
        !normalizedCurrent.startsWith(normalizedVault + path.sep) &&
        normalizedCurrent !== normalizedVault
      ) {
        logWithContext.error('Directory traversal attempt in scan operation', {
          currentPath,
          normalizedCurrent,
          normalizedVault,
          correlationId: 'security-violation',
        })
        return
      }

      const entries = await fs.readdir(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        // Validate each entry name for suspicious patterns
        if (entry.name.includes('..') || entry.name.includes('\0')) {
          logWithContext.warn('Suspicious file/directory name detected', {
            entryName: entry.name,
            currentPath,
            correlationId: 'security-violation',
          })
          continue
        }

        const fullPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
          if (this.shouldSkipDirectory(entry.name)) {
            continue
          }
          await this.scanDirectory(fullPath, vaultRoot, results)
        } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
          const fileInfo = await this.getFileInfo(fullPath, vaultRoot)
          if (fileInfo) {
            results.push(fileInfo)
          }
        }
      }
    } catch (error) {
      logWithContext.warn(`Failed to scan directory ${currentPath}`, {
        path: currentPath,
        error: error instanceof Error ? error.message : String(error),
        correlationId: 'directory-scan-error',
      })
    }
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['.obsidian', '.trash', '.git', 'node_modules']
    return skipDirs.includes(dirName) || dirName.startsWith('.')
  }

  private isMarkdownFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.md')
  }

  private async getFileInfo(
    filePath: string,
    vaultRoot: string,
  ): Promise<MarkdownFile | null> {
    try {
      const stats = await fs.stat(filePath)
      const content = await fs.readFile(filePath, 'utf-8')
      const relativePath = path.relative(vaultRoot, filePath)

      return {
        path: filePath,
        name: path.basename(filePath),
        content,
        size: stats.size,
        modifiedAt: stats.mtime,
        relativePath,
      }
    } catch (error) {
      logWithContext.warn(`Failed to read file ${filePath}`, {
        filePath,
        error: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      const vaultPath = this.ensureVaultPath()

      // Use secure path validation - this will throw on traversal attempts
      const fullPath = this.validateAndNormalizePath(filePath, vaultPath)

      return await fs.readFile(fullPath, 'utf-8')
    } catch (error) {
      logWithContext.warn(`Failed to read file ${filePath}`, {
        filePath,
        error: error instanceof Error ? error.message : String(error),
        correlationId: 'file-access-error',
      })
      return null
    }
  }

  async getVaultStats(): Promise<VaultStats> {
    let totalFiles = 0
    let totalSize = 0

    const markdownFiles = await this.scanMarkdownFiles()

    totalFiles = markdownFiles.length
    totalSize = markdownFiles.reduce((sum, file) => sum + file.size, 0)

    return {
      totalFiles,
      totalSize,
      lastScanned: new Date(),
    }
  }

  async watchForChanges(
    callback: (
      filePath: string,
      changeType: 'added' | 'modified' | 'deleted',
    ) => void,
  ): Promise<void> {
    const vaultPath = this.ensureVaultPath()

    logWithContext.info(`Starting file watcher for vault`, { vaultPath })

    try {
      const watcher = fs.watch(vaultPath, { recursive: true })

      for await (const event of watcher) {
        if (event.filename && this.isMarkdownFile(event.filename)) {
          // Validate the file path from filesystem event
          try {
            // Sanitize and validate the filename from filesystem event
            const sanitizedFilename = event.filename.replace(/\0/g, '')

            if (
              sanitizedFilename.includes('..') ||
              sanitizedFilename.includes('~')
            ) {
              logWithContext.warn(
                'Suspicious filename detected in file watcher',
                {
                  originalFilename: event.filename,
                  sanitizedFilename,
                  correlationId: 'security-violation',
                },
              )
              continue
            }

            const fullPath = path.join(vaultPath, sanitizedFilename)
            const normalizedVault = path.resolve(vaultPath)
            const normalizedFilePath = path.resolve(fullPath)

            // Ensure the file event is within vault boundaries
            if (!normalizedFilePath.startsWith(normalizedVault + path.sep)) {
              logWithContext.error('File watcher detected path outside vault', {
                filename: event.filename,
                fullPath,
                normalizedFilePath,
                normalizedVault,
                correlationId: 'security-violation',
              })
              continue
            }

            const changeType =
              event.eventType === 'rename'
                ? (await this.fileExists(fullPath))
                  ? 'added'
                  : 'deleted'
                : 'modified'

            callback(sanitizedFilename, changeType)
          } catch (validationError) {
            logWithContext.error('File watcher path validation failed', {
              filename: event.filename,
              error:
                validationError instanceof Error
                  ? validationError.message
                  : String(validationError),
              correlationId: 'security-violation',
            })
          }
        }
      }
    } catch (error) {
      logWithContext.error(
        'File watcher error',
        { vaultPath },
        error instanceof Error ? error : new Error(String(error)),
      )
      throw new Error(`Failed to watch vault for changes: ${error}`)
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      // This method is only called internally with already-validated paths
      // from the watchForChanges method, so it should be safe
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async findFilesByPattern(pattern: string): Promise<MarkdownFile[]> {
    const allFiles = await this.scanMarkdownFiles()
    const regex = new RegExp(pattern, 'i')

    return allFiles.filter(
      (file) =>
        regex.test(file.name) ||
        regex.test(file.relativePath) ||
        regex.test(file.content),
    )
  }

  generateFileId(file: MarkdownFile): string {
    return Buffer.from(file.relativePath).toString('base64')
  }
}

export const fileSystemService = new FileSystemService()
