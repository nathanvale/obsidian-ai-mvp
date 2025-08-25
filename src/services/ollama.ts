import { config } from '../config/environment.js'
import { resilienceService } from './resilience.js'
import { logWithContext, getCurrentCorrelationId } from './logger.js'
import type { ResilienceInvocationContext } from '@orchestr8/schema'

interface OllamaEmbeddingResponse {
  embedding: number[]
}

interface OllamaEmbeddingRequest {
  model: string
  prompt: string
}

interface OllamaModelInfo {
  name: string
  size: number
  digest: string
  modified_at: string
}

interface OllamaListResponse {
  models: OllamaModelInfo[]
}

interface OllamaHealthStatus {
  available: boolean
  modelLoaded: boolean
  lastChecked: Date
  error?: string
}

interface ServiceDiagnostics {
  serviceUrl: string
  model: string
  connectivity: 'available' | 'degraded' | 'unavailable'
  responseTime: number | null
  lastError: string | null
  circuitBreakerState: string
  timestamp: string
}

class OllamaService {
  private baseUrl: string
  private model: string
  private healthStatus: OllamaHealthStatus
  private lastDiagnosticsCheck: Date | null = null

  constructor() {
    this.baseUrl = config.ollamaUrl
    this.model = config.OLLAMA_MODEL
    this.healthStatus = {
      available: false,
      modelLoaded: false,
      lastChecked: new Date(),
      error: undefined,
    }

    logWithContext.info('Ollama service initialized', {
      serviceUrl: config.ollamaUrl,
      model: config.OLLAMA_MODEL,
      component: 'OllamaService',
    })
  }

  /**
   * Enhanced health check with proper error handling and diagnostics
   * ADHD-optimized: Fast timeout detection for immediate feedback
   */
  async ping(): Promise<boolean> {
    const correlationId = getCurrentCorrelationId()
    const context: Partial<ResilienceInvocationContext> = {
      workflowId: 'ollama-health-check',
      stepId: 'ping',
      correlationId,
    }

    try {
      const startTime = Date.now()

      const result = await resilienceService.applyOllamaPolicy(
        async (signal?: AbortSignal) => {
          const response = await fetch(`${this.baseUrl}/api/tags`, {
            signal,
            headers: { 'Content-Type': 'application/json' },
          })

          if (!response.ok) {
            throw new Error(`Ollama ping failed: HTTP ${response.status}`)
          }

          return response.ok
        },
        undefined,
        context,
      )

      const responseTime = Date.now() - startTime

      this.healthStatus = {
        available: result,
        modelLoaded: false, // Will be checked separately
        lastChecked: new Date(),
        error: undefined,
      }

      logWithContext.debug('Ollama ping successful', {
        responseTime,
        component: 'OllamaService',
        operation: 'ping',
      })

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown ping error'

      this.healthStatus = {
        available: false,
        modelLoaded: false,
        lastChecked: new Date(),
        error: errorMessage,
      }

      logWithContext.warn('Ollama ping failed', {
        error: errorMessage,
        component: 'OllamaService',
        operation: 'ping',
        adhdNote: 'Local AI processing unavailable - check Ollama service',
      })

      return false
    }
  }

  /**
   * Generate embedding with comprehensive resilience patterns
   * ADHD-optimized: Critical for voice memo transcription and semantic search
   */
  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot generate embedding for empty text')
    }

    // ADHD consideration: Truncate very long text to prevent processing delays
    const maxTextLength = 8192 // Reasonable limit for local processing
    const processedText =
      text.length > maxTextLength
        ? text.substring(0, maxTextLength) + '...[truncated]'
        : text

    const correlationId = getCurrentCorrelationId()
    const context: Partial<ResilienceInvocationContext> = {
      workflowId: 'ollama-embedding',
      stepId: 'generate-single',
      correlationId,
    }

    const requestBody: OllamaEmbeddingRequest = {
      model: this.model,
      prompt: processedText,
    }

    try {
      const startTime = Date.now()

      const result = await resilienceService.applyOllamaPolicy(
        async (signal?: AbortSignal) => {
          logWithContext.debug('Generating embedding', {
            textLength: processedText.length,
            model: this.model,
            component: 'OllamaService',
            operation: 'generateEmbedding',
          })

          const response = await fetch(`${this.baseUrl}/api/embeddings`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal,
          })

          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => 'Unable to read error response')
            const error = new Error(
              `Ollama embedding API error: HTTP ${response.status} - ${errorText}`,
            )

            // Log specific error details for troubleshooting
            logWithContext.error(
              'Embedding generation failed',
              {
                httpStatus: response.status,
                errorText: errorText.substring(0, 200), // Limit error text length
                model: this.model,
                textLength: processedText.length,
                component: 'OllamaService',
              },
              error,
            )

            throw error
          }

          const embeddingResponse: OllamaEmbeddingResponse =
            await response.json()

          if (
            !embeddingResponse.embedding ||
            !Array.isArray(embeddingResponse.embedding)
          ) {
            throw new Error('Invalid embedding response format from Ollama')
          }

          return embeddingResponse.embedding
        },
        undefined,
        context,
      )

      const processingTime = Date.now() - startTime

      logWithContext.debug('Embedding generated successfully', {
        textLength: processedText.length,
        embeddingDimensions: result.length,
        processingTime,
        component: 'OllamaService',
        operation: 'generateEmbedding',
      })

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown embedding generation error'

      logWithContext.error(
        'Critical: Embedding generation failed',
        {
          error: errorMessage,
          model: this.model,
          textLength: processedText.length,
          component: 'OllamaService',
          adhdImpact: 'Voice memo or search functionality may be impaired',
        },
        error instanceof Error ? error : undefined,
      )

      // Re-throw with enhanced context for ADHD workflows
      throw new Error(
        `Local AI embedding generation failed: ${errorMessage}. This affects voice memo processing and semantic search.`,
      )
    }
  }

  /**
   * Generate multiple embeddings with proper error handling and partial success
   * ADHD-optimized: Batch processing with progress feedback for large voice memo sets
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return []
    }

    const embeddings: number[][] = []
    const errors: Array<{ index: number; text: string; error: string }> = []

    logWithContext.info('Starting batch embedding generation', {
      totalTexts: texts.length,
      component: 'OllamaService',
      operation: 'generateEmbeddings',
    })

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i]

      try {
        const embedding = await this.generateEmbedding(text)
        embeddings.push(embedding)

        // ADHD consideration: Log progress for longer operations
        if (texts.length > 10 && (i + 1) % 10 === 0) {
          logWithContext.info('Batch embedding progress', {
            completed: i + 1,
            total: texts.length,
            progress: `${Math.round(((i + 1) / texts.length) * 100)}%`,
            component: 'OllamaService',
          })
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          index: i,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
          error: errorMessage,
        })

        logWithContext.warn('Individual embedding generation failed in batch', {
          index: i,
          textLength: text.length,
          error: errorMessage,
          component: 'OllamaService',
        })

        // For ADHD workflows, we continue processing even if individual items fail
        // This prevents losing all progress due to one problematic text
        embeddings.push([]) // Push empty array as placeholder
      }
    }

    logWithContext.info('Batch embedding generation completed', {
      totalTexts: texts.length,
      successful: embeddings.filter((emb) => emb.length > 0).length,
      failed: errors.length,
      component: 'OllamaService',
    })

    if (errors.length > 0) {
      logWithContext.warn('Some embeddings failed in batch operation', {
        failures: errors,
        successRate: `${Math.round(((texts.length - errors.length) / texts.length) * 100)}%`,
        adhdNote:
          'Partial embedding generation - some voice memos or documents may not be searchable',
        component: 'OllamaService',
      })
    }

    return embeddings
  }

  /**
   * Advanced batch processing with memory management and ADHD-optimized pacing
   * Prevents system overload during large voice memo processing operations
   */
  async batchGenerateEmbeddings(
    texts: string[],
    batchSize: number = 10,
  ): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return []
    }

    // ADHD consideration: Adjust batch size based on text complexity and system resources
    const adaptiveBatchSize = this.calculateOptimalBatchSize(texts, batchSize)
    const results: number[][] = []

    logWithContext.info('Starting advanced batch embedding generation', {
      totalTexts: texts.length,
      requestedBatchSize: batchSize,
      adaptiveBatchSize,
      estimatedBatches: Math.ceil(texts.length / adaptiveBatchSize),
      component: 'OllamaService',
      operation: 'batchGenerateEmbeddings',
    })

    for (let i = 0; i < texts.length; i += adaptiveBatchSize) {
      const batchNumber = Math.floor(i / adaptiveBatchSize) + 1
      const totalBatches = Math.ceil(texts.length / adaptiveBatchSize)
      const batch = texts.slice(i, i + adaptiveBatchSize)

      try {
        logWithContext.debug('Processing batch', {
          batchNumber,
          totalBatches,
          batchSize: batch.length,
          startIndex: i,
          progress: `${Math.round((i / texts.length) * 100)}%`,
          component: 'OllamaService',
        })

        const batchEmbeddings = await this.generateEmbeddings(batch)
        results.push(...batchEmbeddings)

        // ADHD consideration: Provide progress feedback for longer operations
        if (totalBatches > 3) {
          logWithContext.info('Batch processing progress', {
            completedBatches: batchNumber,
            totalBatches,
            processedTexts: Math.min(i + adaptiveBatchSize, texts.length),
            totalTexts: texts.length,
            progress: `${Math.round((Math.min(i + adaptiveBatchSize, texts.length) / texts.length) * 100)}%`,
            component: 'OllamaService',
          })
        }

        // Memory management: Pause between batches to prevent overwhelming local AI
        if (i + adaptiveBatchSize < texts.length) {
          const pauseDuration = this.calculatePauseDuration(
            batchEmbeddings.length,
          )

          logWithContext.debug(
            'Pausing between batches for memory management',
            {
              pauseDuration,
              nextBatchStart: i + adaptiveBatchSize,
              component: 'OllamaService',
            },
          )

          await new Promise((resolve) => setTimeout(resolve, pauseDuration))
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown batch error'

        logWithContext.error(
          'Batch processing failed',
          {
            batchNumber,
            totalBatches,
            batchSize: batch.length,
            error: errorMessage,
            processedSoFar: results.length,
            component: 'OllamaService',
            adhdImpact: 'Large-scale voice memo processing interrupted',
          },
          error instanceof Error ? error : undefined,
        )

        // For ADHD workflows, we attempt to continue with smaller batches
        if (adaptiveBatchSize > 1) {
          logWithContext.info('Retrying failed batch with smaller size', {
            originalBatchSize: adaptiveBatchSize,
            newBatchSize: Math.max(1, Math.floor(adaptiveBatchSize / 2)),
            component: 'OllamaService',
          })

          // Retry with smaller batch size
          for (
            let j = i;
            j < Math.min(i + adaptiveBatchSize, texts.length);
            j++
          ) {
            try {
              const singleResult = await this.generateEmbeddings([texts[j]])
              results.push(...singleResult)
            } catch (singleError) {
              logWithContext.warn(
                'Individual text processing failed during batch retry',
                {
                  textIndex: j,
                  error:
                    singleError instanceof Error
                      ? singleError.message
                      : 'Unknown error',
                  component: 'OllamaService',
                },
              )
              results.push([]) // Push empty array as placeholder
            }
          }
        } else {
          // If already processing single items, skip this batch entirely
          logWithContext.error(
            'Skipping batch entirely due to persistent failures',
            {
              skippedTexts: batch.length,
              component: 'OllamaService',
            },
          )

          // Add empty placeholders for skipped texts
          for (let k = 0; k < batch.length; k++) {
            results.push([])
          }
        }
      }
    }

    const successfulResults = results.filter(
      (embedding) => embedding.length > 0,
    ).length
    const successRate = Math.round((successfulResults / texts.length) * 100)

    logWithContext.info('Batch embedding generation completed', {
      totalTexts: texts.length,
      successful: successfulResults,
      failed: texts.length - successfulResults,
      successRate: `${successRate}%`,
      component: 'OllamaService',
      adhdNote:
        successRate < 90
          ? 'Some voice memos may not be searchable due to processing errors'
          : 'Batch processing completed successfully',
    })

    return results
  }

  /**
   * Calculate optimal batch size based on text complexity and system resources
   * ADHD optimization: Prevents overwhelming local processing
   */
  private calculateOptimalBatchSize(
    texts: string[],
    requestedBatchSize: number,
  ): number {
    const averageTextLength =
      texts.reduce((sum, text) => sum + text.length, 0) / texts.length

    // Adjust batch size based on text complexity
    if (averageTextLength > 5000) {
      // Large texts: smaller batches to prevent timeouts
      return Math.max(1, Math.min(requestedBatchSize, 3))
    } else if (averageTextLength > 1000) {
      // Medium texts: moderate batches
      return Math.max(1, Math.min(requestedBatchSize, 7))
    } else {
      // Small texts: use requested batch size
      return Math.max(1, requestedBatchSize)
    }
  }

  /**
   * Calculate pause duration between batches for memory management
   * ADHD optimization: Prevents system overload while maintaining progress feedback
   */
  private calculatePauseDuration(processedItems: number): number {
    // Base pause of 100ms plus additional time for larger batches
    const basePause = 100
    const additionalPause = Math.min(500, processedItems * 20) // Max 500ms additional
    return basePause + additionalPause
  }

  /**
   * List available Ollama models with resilience patterns
   * ADHD-optimized: Quick model availability check for troubleshooting
   */
  async listModels(): Promise<OllamaModelInfo[]> {
    const correlationId = getCurrentCorrelationId()
    const context: Partial<ResilienceInvocationContext> = {
      workflowId: 'ollama-model-management',
      stepId: 'list-models',
      correlationId,
    }

    try {
      const result = await resilienceService.applyOllamaPolicy(
        async (signal?: AbortSignal) => {
          const response = await fetch(`${this.baseUrl}/api/tags`, {
            signal,
            headers: { 'Content-Type': 'application/json' },
          })

          if (!response.ok) {
            throw new Error(`Failed to list models: HTTP ${response.status}`)
          }

          const listResponse: OllamaListResponse = await response.json()

          if (!listResponse.models || !Array.isArray(listResponse.models)) {
            throw new Error('Invalid model list response format from Ollama')
          }

          return listResponse.models
        },
        undefined,
        context,
      )

      logWithContext.debug('Models listed successfully', {
        modelCount: result.length,
        availableModels: result.map((m) => m.name),
        component: 'OllamaService',
        operation: 'listModels',
      })

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown model listing error'

      logWithContext.error(
        'Failed to list Ollama models',
        {
          error: errorMessage,
          component: 'OllamaService',
          adhdNote:
            'Unable to verify available AI models - check Ollama installation',
        },
        error instanceof Error ? error : undefined,
      )

      throw new Error(`Failed to list Ollama models: ${errorMessage}`)
    }
  }

  /**
   * Check if the required embedding model is available
   * ADHD-optimized: Critical for voice memo and search functionality
   */
  async checkModelAvailability(): Promise<boolean> {
    try {
      const models = await this.listModels()
      const isAvailable = models.some((model) =>
        model.name.includes(this.model),
      )

      this.healthStatus = {
        ...this.healthStatus,
        modelLoaded: isAvailable,
        lastChecked: new Date(),
        error: isAvailable
          ? undefined
          : `Required model '${this.model}' not found`,
      }

      if (isAvailable) {
        logWithContext.debug('Required model is available', {
          model: this.model,
          availableModels: models.map((m) => m.name),
          component: 'OllamaService',
          operation: 'checkModelAvailability',
        })
      } else {
        logWithContext.warn('Required model is not available', {
          requiredModel: this.model,
          availableModels: models.map((m) => m.name),
          component: 'OllamaService',
          adhdImpact:
            'Voice memo transcription and semantic search will not work',
        })
      }

      return isAvailable
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown model availability check error'

      this.healthStatus = {
        ...this.healthStatus,
        modelLoaded: false,
        lastChecked: new Date(),
        error: errorMessage,
      }

      logWithContext.warn('Could not check model availability', {
        requiredModel: this.model,
        error: errorMessage,
        component: 'OllamaService',
        adhdNote: 'Unable to verify AI model - local processing may fail',
      })

      return false
    }
  }

  /**
   * Pull/download a model to local Ollama instance
   * ADHD-optimized: Extended timeout for large model downloads
   */
  async pullModel(modelName?: string): Promise<void> {
    const model = modelName || this.model
    const correlationId = getCurrentCorrelationId()

    // Use custom policy with extended timeout for model downloads
    const extendedTimeoutPolicy = {
      ...config.resilience.ollama,
      timeout: 300000, // 5 minutes for model downloads
    }

    const context: Partial<ResilienceInvocationContext> = {
      workflowId: 'ollama-model-management',
      stepId: 'pull-model',
      correlationId,
    }

    logWithContext.info('Starting model pull operation', {
      model,
      estimatedTime: '30 seconds to 5 minutes',
      component: 'OllamaService',
      adhdNote: 'This may take several minutes for large models',
    })

    try {
      await resilienceService.applyCustomPolicy(
        async (signal?: AbortSignal) => {
          const response = await fetch(`${this.baseUrl}/api/pull`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: model }),
            signal,
          })

          if (!response.ok) {
            const errorText = await response
              .text()
              .catch(() => 'Unable to read error response')
            throw new Error(
              `Failed to pull model: HTTP ${response.status} - ${errorText}`,
            )
          }

          // Note: Ollama pull returns streaming responses, but we just wait for completion
          const result = await response.text()
          return result
        },
        extendedTimeoutPolicy,
        'retry-cb-timeout',
        undefined,
        context,
      )

      logWithContext.info('Model pull completed successfully', {
        model,
        component: 'OllamaService',
        adhdNote: 'AI model is now ready for voice memo and search processing',
      })

      // Update health status after successful pull
      await this.checkModelAvailability()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown model pull error'

      logWithContext.error(
        'Failed to pull model',
        {
          model,
          error: errorMessage,
          component: 'OllamaService',
          adhdImpact:
            'Local AI processing will not work until model is available',
          troubleshooting: 'Check Ollama service and internet connection',
        },
        error instanceof Error ? error : undefined,
      )

      throw new Error(
        `Failed to pull model '${model}': ${errorMessage}. Check Ollama service and internet connection.`,
      )
    }
  }

  /**
   * Get basic model configuration info
   */
  getModelInfo(): { name: string; url: string } {
    return {
      name: this.model,
      url: this.baseUrl,
    }
  }

  /**
   * Get current health status of the Ollama service
   * ADHD-optimized: Quick status check for troubleshooting
   */
  getHealthStatus(): OllamaHealthStatus {
    return { ...this.healthStatus }
  }

  /**
   * Perform comprehensive service diagnostics
   * ADHD-optimized: Complete troubleshooting information in one call
   */
  async performDiagnostics(): Promise<ServiceDiagnostics> {
    const startTime = Date.now()

    logWithContext.info('Performing Ollama service diagnostics', {
      component: 'OllamaService',
      operation: 'performDiagnostics',
    })

    let connectivity: 'available' | 'degraded' | 'unavailable' = 'unavailable'
    let responseTime: number | null = null
    let lastError: string | null = null

    try {
      // Test basic connectivity
      const pingSuccess = await this.ping()
      responseTime = Date.now() - startTime

      if (pingSuccess) {
        // Test model availability
        const modelAvailable = await this.checkModelAvailability()
        connectivity = modelAvailable ? 'available' : 'degraded'

        if (!modelAvailable) {
          lastError = `Required model '${this.model}' not available`
        }
      } else {
        connectivity = 'unavailable'
        lastError = 'Ollama service not responding'
      }
    } catch (error) {
      connectivity = 'unavailable'
      responseTime = Date.now() - startTime
      lastError =
        error instanceof Error ? error.message : 'Unknown diagnostic error'
    }

    // Get circuit breaker state
    const circuitBreakerStates = resilienceService.getCircuitBreakerStates()
    const circuitBreakerState = circuitBreakerStates.ollama?.state || 'unknown'

    const diagnostics: ServiceDiagnostics = {
      serviceUrl: this.baseUrl,
      model: this.model,
      connectivity,
      responseTime,
      lastError,
      circuitBreakerState,
      timestamp: new Date().toISOString(),
    }

    this.lastDiagnosticsCheck = new Date()

    logWithContext.info('Service diagnostics completed', {
      ...diagnostics,
      component: 'OllamaService',
      adhdNote:
        connectivity === 'available'
          ? 'All AI processing systems operational'
          : 'AI processing issues detected - check Ollama service',
    })

    return diagnostics
  }

  /**
   * Initialize service with health checks
   * ADHD-optimized: Validates everything needed for voice memo processing
   */
  async initialize(): Promise<boolean> {
    logWithContext.info('Initializing Ollama service', {
      serviceUrl: this.baseUrl,
      model: this.model,
      component: 'OllamaService',
    })

    try {
      // Check basic connectivity
      const pingSuccess = await this.ping()
      if (!pingSuccess) {
        logWithContext.error(
          'Ollama service initialization failed - service not available',
          {
            component: 'OllamaService',
            adhdImpact:
              'Voice memo transcription and semantic search will not work',
            troubleshooting: 'Start Ollama service: `ollama serve`',
          },
        )
        return false
      }

      // Check model availability
      const modelAvailable = await this.checkModelAvailability()
      if (!modelAvailable) {
        logWithContext.warn(
          'Ollama service partially initialized - model not available',
          {
            requiredModel: this.model,
            component: 'OllamaService',
            adhdNote: 'AI model needs to be downloaded',
            troubleshooting: `Run: ollama pull ${this.model}`,
          },
        )
        // Return true but log that model needs to be pulled
      }

      // Test embedding generation with a simple test
      try {
        await this.generateEmbedding('test initialization')
        logWithContext.info('Ollama service fully initialized and tested', {
          component: 'OllamaService',
          adhdNote: 'Ready for voice memo processing and semantic search',
        })
        return true
      } catch (error) {
        logWithContext.warn(
          'Ollama service connectivity good but embedding test failed',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            component: 'OllamaService',
            adhdNote: 'May need to pull the embedding model',
          },
        )
        return modelAvailable // Return based on model availability check
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown initialization error'

      logWithContext.error(
        'Ollama service initialization failed',
        {
          error: errorMessage,
          component: 'OllamaService',
          adhdImpact: 'Local AI processing completely unavailable',
          troubleshooting: 'Check Ollama installation and service status',
        },
        error instanceof Error ? error : undefined,
      )

      return false
    }
  }
}

export const ollamaClient = new OllamaService()
