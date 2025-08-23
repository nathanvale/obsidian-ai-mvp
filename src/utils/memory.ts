export class MemoryManager {
  private static readonly MEMORY_LIMIT = process.env.MEMORY_LIMIT_MB
    ? parseInt(process.env.MEMORY_LIMIT_MB) * 1024 * 1024
    : 2 * 1024 * 1024 * 1024 // 2GB default

  static checkMemoryUsage(): boolean {
    const usage = process.memoryUsage()
    return usage.heapUsed < this.MEMORY_LIMIT * 0.8 // 80% threshold
  }

  static getMemoryUsage(): ReturnType<typeof process.memoryUsage> {
    return process.memoryUsage()
  }

  static forceGC(): void {
    if (global.gc) {
      global.gc()
    }
  }

  static formatMemoryUsage(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }
}
