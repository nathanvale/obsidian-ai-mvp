import { readdir, stat, readFile } from 'fs/promises'
import { join, extname, relative } from 'path'
import { config } from '@/config/environment'
import type { MarkdownFile, TextChunk } from '@/types'
import { MemoryManager } from '@/utils/memory'

export class FileProcessor {
  private vaultPath: string

  constructor() {
    this.vaultPath = config.obsidianVaultPath || ''
  }

  async validateVaultPath(): Promise<{ valid: boolean; error?: string }> {
    try {
      const stats = await stat(this.vaultPath)
      if (!stats.isDirectory()) {
        return {
          valid: false,
          error: 'Vault path is not a directory',
        }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: `Cannot access vault path: ${error instanceof Error ? error.message : error}`,
      }
    }
  }

  async *walkDirectory(dir: string): AsyncGenerator<string> {
    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        // Skip hidden files and directories
        if (entry.name.startsWith('.')) {
          continue
        }

        if (entry.isDirectory()) {
          // Skip common non-content directories
          if (this.shouldSkipDirectory(entry.name)) {
            continue
          }
          yield* this.walkDirectory(fullPath)
        } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
          yield fullPath
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error)
    }
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      '.obsidian',
      '.git',
      'node_modules',
      '.trash',
      '.DS_Store',
      'attachments', // Common attachment folders
      'assets',
      'images',
    ]
    return skipDirs.includes(dirName.toLowerCase())
  }

  private isMarkdownFile(filename: string): boolean {
    return extname(filename).toLowerCase() === '.md'
  }

  async readMarkdownFile(filePath: string): Promise<MarkdownFile> {
    try {
      const stats = await stat(filePath)
      const content = await readFile(filePath, 'utf-8')
      const relativePath = relative(this.vaultPath, filePath)

      return {
        path: relativePath,
        content,
        lastModified: stats.mtime,
        metadata: {
          size: stats.size,
          absolutePath: filePath,
        },
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error)
      throw new Error(`Failed to read file: ${error}`)
    }
  }

  async getAllMarkdownFiles(): Promise<MarkdownFile[]> {
    const files: MarkdownFile[] = []
    let processedCount = 0

    console.log(`🔄 Scanning vault: ${this.vaultPath}`)

    try {
      for await (const filePath of this.walkDirectory(this.vaultPath)) {
        // Check memory usage periodically
        if (processedCount % 50 === 0 && !MemoryManager.checkMemoryUsage()) {
          console.warn('⚠️ Memory usage high, forcing garbage collection')
          MemoryManager.forceGC()
        }

        try {
          const markdownFile = await this.readMarkdownFile(filePath)
          files.push(markdownFile)
          processedCount++

          if (processedCount % 100 === 0) {
            console.log(`📂 Processed ${processedCount} files`)
          }
        } catch (error) {
          console.warn(`Warning: Skipping file ${filePath}:`, error)
        }
      }

      console.log(`✅ Found ${files.length} markdown files in vault`)
      return files
    } catch (error) {
      console.error('❌ Error scanning vault:', error)
      throw new Error(`Failed to scan vault: ${error}`)
    }
  }

  chunkText(content: string, filePath: string): TextChunk[] {
    const chunks: TextChunk[] = []

    // Simple chunking strategy: split by double newlines (paragraphs)
    const paragraphs = content
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0)

    // If no paragraphs, split by single newlines
    if (paragraphs.length === 1 && paragraphs[0].length > 1000) {
      const sentences = content
        .split(/[.!?]+\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      return this.createChunksFromSentences(sentences, filePath)
    }

    let chunkIndex = 0
    let currentChunk = ''
    let startLine = 1

    for (const paragraph of paragraphs) {
      // If adding this paragraph would make chunk too long, save current chunk
      if (
        currentChunk.length > 0 &&
        currentChunk.length + paragraph.length > 2000
      ) {
        chunks.push({
          id: this.generateChunkId(filePath, chunkIndex),
          content: currentChunk.trim(),
          metadata: {
            filePath,
            chunkIndex,
            startLine,
            endLine: startLine + currentChunk.split('\n').length - 1,
          },
        })

        chunkIndex++
        currentChunk = paragraph
        startLine = startLine + currentChunk.split('\n').length
      } else {
        if (currentChunk.length > 0) {
          currentChunk += '\n\n'
        }
        currentChunk += paragraph
      }
    }

    // Add final chunk if it exists
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: this.generateChunkId(filePath, chunkIndex),
        content: currentChunk.trim(),
        metadata: {
          filePath,
          chunkIndex,
          startLine,
          endLine: startLine + currentChunk.split('\n').length - 1,
        },
      })
    }

    return chunks.filter((chunk) => chunk.content.length > 50) // Minimum chunk size
  }

  private createChunksFromSentences(
    sentences: string[],
    filePath: string,
  ): TextChunk[] {
    const chunks: TextChunk[] = []
    let chunkIndex = 0
    let currentChunk = ''

    for (const sentence of sentences) {
      if (
        currentChunk.length > 0 &&
        currentChunk.length + sentence.length > 1500
      ) {
        chunks.push({
          id: this.generateChunkId(filePath, chunkIndex),
          content: currentChunk.trim(),
          metadata: {
            filePath,
            chunkIndex,
          },
        })

        chunkIndex++
        currentChunk = sentence
      } else {
        if (currentChunk.length > 0) {
          currentChunk += '. '
        }
        currentChunk += sentence
      }
    }

    // Add final chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        id: this.generateChunkId(filePath, chunkIndex),
        content: currentChunk.trim(),
        metadata: {
          filePath,
          chunkIndex,
        },
      })
    }

    return chunks
  }

  private generateChunkId(filePath: string, chunkIndex: number): string {
    // Create a unique ID using file path and chunk index
    const cleanPath = filePath.replace(/[^a-zA-Z0-9]/g, '_')
    return `${cleanPath}_chunk_${chunkIndex}_${Date.now()}`
  }

  async getFileByPath(relativePath: string): Promise<MarkdownFile | null> {
    try {
      const fullPath = join(this.vaultPath, relativePath)
      return await this.readMarkdownFile(fullPath)
    } catch {
      console.warn(`File not found: ${relativePath}`)
      return null
    }
  }

  getVaultPath(): string {
    return this.vaultPath
  }

  async getVaultStats(): Promise<{
    totalFiles: number
    totalSize: number
    lastScanned: Date
  }> {
    const files = await this.getAllMarkdownFiles()
    const totalSize = files.reduce(
      (sum, file) => sum + ((file.metadata?.size as number) || 0),
      0,
    )

    return {
      totalFiles: files.length,
      totalSize,
      lastScanned: new Date(),
    }
  }
}

// Singleton instance
export const fileProcessor = new FileProcessor()
