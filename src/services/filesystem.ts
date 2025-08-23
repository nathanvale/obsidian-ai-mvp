import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config/environment.js';

interface MarkdownFile {
  path: string;
  name: string;
  content: string;
  size: number;
  modifiedAt: Date;
  relativePath: string;
}

interface VaultStats {
  totalFiles: number;
  totalSize: number;
  lastScanned: Date;
}

class FileSystemService {
  private vaultPath: string | null;

  constructor() {
    this.vaultPath = config.obsidianVaultPath || null;
  }

  setVaultPath(vaultPath: string): void {
    this.vaultPath = vaultPath;
  }

  getVaultPath(): string | null {
    return this.vaultPath;
  }

  private ensureVaultPath(): string {
    if (!this.vaultPath) {
      throw new Error('Obsidian vault path not configured. Set OBSIDIAN_VAULT_PATH environment variable.');
    }
    return this.vaultPath;
  }

  async validateVaultPath(vaultPath?: string): Promise<boolean> {
    const pathToCheck = vaultPath || this.vaultPath;
    if (!pathToCheck) return false;

    try {
      const stats = await fs.stat(pathToCheck);
      if (!stats.isDirectory()) return false;

      const files = await fs.readdir(pathToCheck);
      const hasObsidianConfig = files.includes('.obsidian');
      
      return hasObsidianConfig;
    } catch (error) {
      return false;
    }
  }

  async scanMarkdownFiles(): Promise<MarkdownFile[]> {
    const vaultPath = this.ensureVaultPath();
    const markdownFiles: MarkdownFile[] = [];

    await this.scanDirectory(vaultPath, vaultPath, markdownFiles);
    return markdownFiles;
  }

  private async scanDirectory(
    currentPath: string,
    vaultRoot: string,
    results: MarkdownFile[]
  ): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (this.shouldSkipDirectory(entry.name)) {
            continue;
          }
          await this.scanDirectory(fullPath, vaultRoot, results);
        } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
          const fileInfo = await this.getFileInfo(fullPath, vaultRoot);
          if (fileInfo) {
            results.push(fileInfo);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${currentPath}:`, error);
    }
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = ['.obsidian', '.trash', '.git', 'node_modules'];
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }

  private isMarkdownFile(fileName: string): boolean {
    return fileName.toLowerCase().endsWith('.md');
  }

  private async getFileInfo(
    filePath: string,
    vaultRoot: string
  ): Promise<MarkdownFile | null> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(vaultRoot, filePath);

      return {
        path: filePath,
        name: path.basename(filePath),
        content,
        size: stats.size,
        modifiedAt: stats.mtime,
        relativePath,
      };
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  async readFile(filePath: string): Promise<string | null> {
    try {
      const vaultPath = this.ensureVaultPath();
      const fullPath = path.resolve(vaultPath, filePath);
      
      if (!fullPath.startsWith(vaultPath)) {
        throw new Error('File path outside vault directory not allowed');
      }

      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  async getVaultStats(): Promise<VaultStats> {
    const vaultPath = this.ensureVaultPath();
    let totalFiles = 0;
    let totalSize = 0;

    const markdownFiles = await this.scanMarkdownFiles();
    
    totalFiles = markdownFiles.length;
    totalSize = markdownFiles.reduce((sum, file) => sum + file.size, 0);

    return {
      totalFiles,
      totalSize,
      lastScanned: new Date(),
    };
  }

  async watchForChanges(callback: (filePath: string, changeType: 'added' | 'modified' | 'deleted') => void): Promise<void> {
    const vaultPath = this.ensureVaultPath();
    
    console.log(`Starting file watcher for vault: ${vaultPath}`);
    
    try {
      const watcher = fs.watch(vaultPath, { recursive: true });
      
      for await (const event of watcher) {
        if (event.filename && this.isMarkdownFile(event.filename)) {
          const changeType = event.eventType === 'rename' ? 
            (await this.fileExists(path.join(vaultPath, event.filename)) ? 'added' : 'deleted') :
            'modified';
            
          callback(event.filename, changeType);
        }
      }
    } catch (error) {
      console.error('File watcher error:', error);
      throw new Error(`Failed to watch vault for changes: ${error}`);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async findFilesByPattern(pattern: string): Promise<MarkdownFile[]> {
    const allFiles = await this.scanMarkdownFiles();
    const regex = new RegExp(pattern, 'i');
    
    return allFiles.filter(file => 
      regex.test(file.name) || 
      regex.test(file.relativePath) ||
      regex.test(file.content)
    );
  }

  generateFileId(file: MarkdownFile): string {
    return Buffer.from(file.relativePath).toString('base64');
  }
}

export const fileSystemService = new FileSystemService();