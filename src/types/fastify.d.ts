import type { FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string;
    startTime?: number;
    performance?: {
      getStartTime(): bigint | undefined;
      getResponseTime(): number;
    };
  }
}

// Extended request interface for middleware usage
export interface FastifyRequestWithContext extends FastifyRequest {
  correlationId: string;
  startTime: number;
}

// Type for generic objects instead of 'any'
export type GenericObject = Record<string, unknown>;

// Health check related types
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'error' | 'not_configured';
  responseTime?: string | null;
  statusCode?: number;
  error?: string;
  path?: string;
}

// Complete health result interface
export interface HealthResult {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'error' | 'unknown';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
  process: {
    pid: number;
    nodeVersion: string;
    platform: string;
  };
  checks: Record<string, HealthCheckResult>;
  unhealthyServices?: string[];
  criticalServicesDown?: string[];
  checkDuration?: string;
  error?: string;
}

// Error types for middleware
export interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

// Performance metrics types
export interface PerformanceMetrics {
  startTime: bigint;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
}

// Security types
export interface SecurityContext {
  ip: string;
  userAgent?: string;
  correlationId: string;
}