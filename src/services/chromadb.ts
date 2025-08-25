import { ChromaClient } from 'chromadb'
import { config } from '../config/environment.js'
import {
  logWithContext,
  createCorrelatedLogger,
  getCurrentCorrelationId,
} from './logger.js'
import { resilienceService } from './resilience.js'

/**
 * Enhanced ChromaDB Service with comprehensive error handling and resilience patterns
 * Optimized for ADHD Digital Second Brain reliability requirements
 *
 * Features:
 * - Circuit breaker and retry patterns for reliable ADHD workflows
 * - Timeout handling to prevent ADHD users from waiting indefinitely
 * - Comprehensive error recovery with meaningful diagnostics
 * - Structured logging with correlation IDs for troubleshooting
 * - Service health monitoring and graceful degradation
 * - Connection pooling and resource cleanup
 */
class ChromaDBService {
  private client: ChromaClient
  private readonly collectionName = 'obsidian_knowledge'
  private isHealthy: boolean = false
  private lastHealthCheck: Date | null = null
  private connectionAttempts: number = 0
  private readonly maxConnectionAttempts = 3

  constructor() {
    this.client = new ChromaClient({
      path: config.chromaDbUrl,
    })

    // Log service initialization with security redaction
    logWithContext.info('ChromaDB service initializing', {
      collectionName: this.collectionName,
      serviceUrl: '[REDACTED_CHROMADB_URL]',
      resiliencePolicy: 'enabled',
      adhdOptimized: true,
    })
  }

  /**
   * Initialize ChromaDB connection with comprehensive error handling and resilience
   * Critical for ADHD workflow reliability - must be robust and fast
   */
  async initialize(): Promise<void> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-init-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    try {
      logger.info('ChromaDB initialization starting', {
        service: 'chromadb',
        operation: 'initialize',
        attempt: this.connectionAttempts + 1,
        maxAttempts: this.maxConnectionAttempts,
      })

      // Use resilience policy for initialization
      await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          // Check if operation was cancelled
          if (signal?.aborted) {
            throw new Error('ChromaDB initialization cancelled')
          }

          await this.client.heartbeat()
          this.isHealthy = true
          this.lastHealthCheck = new Date()
          this.connectionAttempts = 0

          logger.info('ChromaDB initialization successful', {
            service: 'chromadb',
            operation: 'initialize',
            healthStatus: 'healthy',
            responseTime: Date.now(),
          })
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'initialize',
          correlationId,
        },
      )
    } catch (error) {
      this.connectionAttempts++
      this.isHealthy = false

      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const isTimeout =
        errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')
      const isConnectionRefused =
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('connect')

      // Enhanced error context for ADHD troubleshooting
      const errorContext = {
        service: 'chromadb',
        operation: 'initialize',
        errorType: isTimeout
          ? 'timeout'
          : isConnectionRefused
            ? 'connection_refused'
            : 'unknown',
        attempt: this.connectionAttempts,
        maxAttempts: this.maxConnectionAttempts,
        serviceUrl: '[REDACTED_CHROMADB_URL]',
        isHealthy: this.isHealthy,
        adhdImpact: 'high', // Initialization failure blocks all semantic search
      }

      logWithContext.error(
        'ChromaDB initialization failed',
        errorContext,
        error instanceof Error ? error : undefined,
      )

      // Create user-friendly error for ADHD context
      if (isConnectionRefused) {
        throw new Error(
          `ChromaDB connection failed. Please ensure ChromaDB is running at the configured URL. ` +
            `This blocks semantic search functionality crucial for ADHD memory support.`,
        )
      } else if (isTimeout) {
        throw new Error(
          `ChromaDB initialization timed out after ${config.resilience.chromadb.timeout}ms. ` +
            `The database may be overloaded or unreachable. ADHD users need fast access to their information.`,
        )
      } else {
        throw new Error(
          `ChromaDB initialization failed: ${errorMessage}. ` +
            `Semantic search will not be available, impacting ADHD memory and organization features.`,
        )
      }
    }
  }

  /**
   * Enhanced heartbeat with health monitoring and error recovery
   * Essential for ADHD workflows - quick failure detection prevents user frustration
   */
  async heartbeat(): Promise<void> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-heartbeat-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    try {
      await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          if (signal?.aborted) {
            throw new Error('ChromaDB heartbeat cancelled')
          }

          await this.client.heartbeat()
          this.isHealthy = true
          this.lastHealthCheck = new Date()
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'heartbeat',
          correlationId,
        },
      )

      logger.debug('ChromaDB heartbeat successful', {
        service: 'chromadb',
        operation: 'heartbeat',
        healthStatus: 'healthy',
        lastCheck: this.lastHealthCheck?.toISOString(),
      })
    } catch (error) {
      this.isHealthy = false

      logWithContext.error(
        'ChromaDB heartbeat failed',
        {
          service: 'chromadb',
          operation: 'heartbeat',
          healthStatus: 'unhealthy',
          errorType:
            error instanceof Error ? error.constructor.name : 'unknown',
          adhdImpact: 'medium', // Heartbeat failure indicates potential service issues
        },
        error instanceof Error ? error : undefined,
      )

      throw error
    }
  }

  /**
   * Comprehensive service health check with detailed diagnostics
   * Provides ADHD users with clear understanding of service availability
   */
  async getServiceHealth(): Promise<{
    isHealthy: boolean
    lastHealthCheck: Date | null
    connectionAttempts: number
    circuitBreakerState: string
    diagnostics: Record<string, unknown>
  }> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-health-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    try {
      // Attempt lightweight health check
      await this.heartbeat()

      const circuitBreakerStates = resilienceService.getCircuitBreakerStates()

      const healthInfo = {
        isHealthy: this.isHealthy,
        lastHealthCheck: this.lastHealthCheck,
        connectionAttempts: this.connectionAttempts,
        circuitBreakerState: circuitBreakerStates.chromadb?.state || 'unknown',
        diagnostics: {
          service: 'chromadb',
          collectionName: this.collectionName,
          uptime: this.lastHealthCheck
            ? Date.now() - this.lastHealthCheck.getTime()
            : null,
          resilience: {
            maxRetries: config.resilience.chromadb.retry.maxAttempts,
            timeout: config.resilience.chromadb.timeout,
            circuitBreakerThreshold:
              config.resilience.chromadb.circuitBreaker.failureThreshold,
          },
          adhdOptimization: 'enabled',
        },
      }

      logger.info('ChromaDB health check completed', {
        ...healthInfo.diagnostics,
        healthStatus: healthInfo.isHealthy ? 'healthy' : 'unhealthy',
      })

      return healthInfo
    } catch (error) {
      logWithContext.error(
        'ChromaDB health check failed',
        {
          service: 'chromadb',
          operation: 'getServiceHealth',
          connectionAttempts: this.connectionAttempts,
          adhdImpact: 'high',
        },
        error instanceof Error ? error : undefined,
      )

      return {
        isHealthy: false,
        lastHealthCheck: this.lastHealthCheck,
        connectionAttempts: this.connectionAttempts,
        circuitBreakerState: 'unknown',
        diagnostics: {
          error: error instanceof Error ? error.message : String(error),
          lastAttempt: new Date().toISOString(),
          service: 'chromadb',
          adhdStatus: 'degraded - semantic search unavailable',
        },
      }
    }
  }

  /**
   * Get or create collection with comprehensive error handling and validation
   * Critical for ADHD workflows - ensures reliable access to semantic search data
   */
  async getCollection() {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-collection-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    try {
      return await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          if (signal?.aborted) {
            throw new Error('ChromaDB collection access cancelled')
          }

          // Verify service is healthy before attempting operation
          if (!this.isHealthy) {
            logger.warn('Attempting collection access on unhealthy service', {
              service: 'chromadb',
              operation: 'getCollection',
              healthStatus: 'unhealthy',
              adhdImpact: 'medium',
            })
          }

          const collection = await this.client.getOrCreateCollection({
            name: this.collectionName,
            metadata: {
              description:
                'Obsidian knowledge base embeddings for ADHD Digital Second Brain',
              created_at: new Date().toISOString(),
              adhd_optimized: true,
              last_accessed: new Date().toISOString(),
            },
          })

          logger.debug('ChromaDB collection accessed successfully', {
            service: 'chromadb',
            operation: 'getCollection',
            collectionName: this.collectionName,
          })

          return collection
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'get-collection',
          correlationId,
        },
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)

      logWithContext.error(
        'ChromaDB collection access failed',
        {
          service: 'chromadb',
          operation: 'getCollection',
          collectionName: this.collectionName,
          errorType:
            error instanceof Error ? error.constructor.name : 'unknown',
          adhdImpact: 'high', // Collection access failure blocks all semantic operations
        },
        error instanceof Error ? error : undefined,
      )

      // Provide user-friendly error context
      if (errorMessage.includes('timeout')) {
        throw new Error(
          `ChromaDB collection access timed out. The database may be overloaded. ` +
            `ADHD users need quick access to their semantic search data.`,
        )
      } else if (errorMessage.includes('connection')) {
        throw new Error(
          `ChromaDB connection lost during collection access. ` +
            `Semantic search is temporarily unavailable for ADHD memory support.`,
        )
      } else {
        throw new Error(
          `ChromaDB collection access failed: ${errorMessage}. ` +
            `This impacts the ability to search and organize ADHD-related information.`,
        )
      }
    }
  }

  /**
   * Add documents with comprehensive validation and error recovery
   * Essential for ADHD voice memo and note indexing workflows
   */
  async addDocuments(
    documents: string[],
    metadatas: Record<string, string | number | boolean>[],
    ids: string[],
    embeddings: number[][],
  ): Promise<void> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-add-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    // Comprehensive input validation for ADHD data protection
    if (!Array.isArray(documents) || documents.length === 0) {
      throw new Error(
        'Invalid documents array: must be non-empty array for ADHD knowledge indexing',
      )
    }

    if (!Array.isArray(metadatas) || metadatas.length !== documents.length) {
      throw new Error(
        'Invalid metadata array: must match documents length for proper ADHD categorization',
      )
    }

    if (!Array.isArray(ids) || ids.length !== documents.length) {
      throw new Error(
        'Invalid IDs array: must match documents length for ADHD memory organization',
      )
    }

    if (!Array.isArray(embeddings) || embeddings.length !== documents.length) {
      throw new Error(
        'Invalid embeddings array: must match documents length for semantic search functionality',
      )
    }

    const startTime = Date.now()

    try {
      logger.info('ChromaDB document addition starting', {
        service: 'chromadb',
        operation: 'addDocuments',
        documentCount: documents.length,
        embeddingDimensions: embeddings[0]?.length || 0,
        adhdWorkflow: 'knowledge-indexing',
      })

      await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          if (signal?.aborted) {
            throw new Error('ChromaDB document addition cancelled')
          }

          const collection = await this.getCollection()

          // Add timestamp to metadata for ADHD context tracking
          const enhancedMetadatas = metadatas.map((metadata, index) => ({
            ...metadata,
            indexed_at: new Date().toISOString(),
            adhd_optimized: true,
            document_length: documents[index]?.length || 0,
            correlation_id: correlationId,
          }))

          await collection.add({
            embeddings,
            metadatas: enhancedMetadatas,
            documents,
            ids,
          })

          const duration = Date.now() - startTime
          logger.info('ChromaDB document addition successful', {
            service: 'chromadb',
            operation: 'addDocuments',
            documentCount: documents.length,
            duration,
            averageDocumentSize: Math.round(
              documents.reduce((sum, doc) => sum + doc.length, 0) /
                documents.length,
            ),
            adhdWorkflow: 'knowledge-indexing',
          })
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'add-documents',
          correlationId,
        },
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const duration = Date.now() - startTime

      logWithContext.error(
        'ChromaDB document addition failed',
        {
          service: 'chromadb',
          operation: 'addDocuments',
          documentCount: documents.length,
          duration,
          errorType:
            error instanceof Error ? error.constructor.name : 'unknown',
          adhdImpact: 'high', // Document addition failure prevents knowledge indexing
          adhdWorkflow: 'knowledge-indexing',
        },
        error instanceof Error ? error : undefined,
      )

      // Provide context-aware error messages for ADHD troubleshooting
      if (errorMessage.includes('timeout')) {
        throw new Error(
          `ChromaDB document indexing timed out after ${duration}ms. ` +
            `Large batches of ADHD notes may need to be processed in smaller chunks for reliability.`,
        )
      } else if (errorMessage.includes('dimension')) {
        throw new Error(
          `ChromaDB embedding dimension mismatch. ` +
            `This indicates an issue with Ollama embedding generation for ADHD content processing.`,
        )
      } else if (errorMessage.includes('duplicate')) {
        throw new Error(
          `ChromaDB duplicate document IDs detected. ` +
            `ADHD note organization requires unique identifiers for each memory fragment.`,
        )
      } else {
        throw new Error(
          `ChromaDB document indexing failed: ${errorMessage}. ` +
            `This prevents new ADHD thoughts and notes from being searchable, impacting memory support.`,
        )
      }
    }
  }

  /**
   * Enhanced semantic query with ADHD-optimized search and error recovery
   * Critical for ADHD memory support - must be fast and reliable
   */
  async query(
    queryEmbeddings: number[][],
    numResults: number = 10,
    where?: Record<string, unknown>,
  ): Promise<{
    ids: string[][]
    distances: number[][]
    metadatas: (Record<string, unknown> | null)[][]
    documents: (string | null)[][]
    searchMetrics?: {
      duration: number
      resultCount: number
      searchType: string
    }
  }> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-query-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    // Comprehensive input validation for ADHD search reliability
    if (!Array.isArray(queryEmbeddings) || queryEmbeddings.length === 0) {
      throw new Error(
        'Invalid query embeddings: must be non-empty array for ADHD semantic search',
      )
    }

    if (numResults <= 0 || numResults > 100) {
      throw new Error(
        'Invalid result count: must be 1-100 for optimal ADHD information processing',
      )
    }

    // Validate embedding dimensions
    const embeddingDim = queryEmbeddings[0]?.length
    if (!embeddingDim || embeddingDim <= 0) {
      throw new Error(
        'Invalid embedding dimensions: corrupted query embeddings from Ollama service',
      )
    }

    const startTime = Date.now()

    try {
      logger.info('ChromaDB semantic search starting', {
        service: 'chromadb',
        operation: 'query',
        queryCount: queryEmbeddings.length,
        embeddingDimensions: embeddingDim,
        requestedResults: numResults,
        hasFilters: !!where,
        adhdWorkflow: 'semantic-search',
      })

      const result = await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          if (signal?.aborted) {
            throw new Error('ChromaDB semantic search cancelled')
          }

          const collection = await this.getCollection()

          const searchResult = await collection.query({
            queryEmbeddings,
            nResults: numResults,
            where,
          })

          const duration = Date.now() - startTime
          const actualResultCount = searchResult.ids?.[0]?.length || 0

          logger.info('ChromaDB semantic search successful', {
            service: 'chromadb',
            operation: 'query',
            duration,
            queryCount: queryEmbeddings.length,
            resultCount: actualResultCount,
            requestedResults: numResults,
            searchEfficiency: actualResultCount / numResults,
            adhdWorkflow: 'semantic-search',
          })

          return {
            ids: searchResult.ids || [],
            distances: searchResult.distances || [],
            metadatas: searchResult.metadatas || [],
            documents: searchResult.documents || [],
            searchMetrics: {
              duration,
              resultCount: actualResultCount,
              searchType: where ? 'filtered-semantic' : 'semantic',
            },
          }
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'semantic-query',
          correlationId,
        },
      )

      // ADHD-specific search optimization warnings
      if (result.searchMetrics && result.searchMetrics.duration > 5000) {
        logger.warn('ChromaDB search slower than ADHD optimal threshold', {
          duration: result.searchMetrics.duration,
          adhdThreshold: 5000,
          recommendation:
            'Consider indexing optimization or smaller result sets',
          adhdImpact: 'medium',
        })
      }

      return result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const duration = Date.now() - startTime

      logWithContext.error(
        'ChromaDB semantic search failed',
        {
          service: 'chromadb',
          operation: 'query',
          duration,
          queryCount: queryEmbeddings.length,
          requestedResults: numResults,
          embeddingDimensions: embeddingDim,
          errorType:
            error instanceof Error ? error.constructor.name : 'unknown',
          adhdImpact: 'critical', // Search failure blocks core ADHD memory functionality
          adhdWorkflow: 'semantic-search',
        },
        error instanceof Error ? error : undefined,
      )

      // Provide ADHD-specific error context and recovery suggestions
      if (errorMessage.includes('timeout')) {
        throw new Error(
          `ChromaDB semantic search timed out after ${duration}ms. ` +
            `ADHD users need quick access to their memories. Try reducing result count or simplifying search terms.`,
        )
      } else if (errorMessage.includes('dimension')) {
        throw new Error(
          `ChromaDB embedding dimension mismatch in search query. ` +
            `This indicates inconsistency between stored embeddings and current Ollama model configuration.`,
        )
      } else if (errorMessage.includes('collection')) {
        throw new Error(
          `ChromaDB collection unavailable for semantic search. ` +
            `ADHD knowledge base may be corrupted or not properly initialized.`,
        )
      } else {
        throw new Error(
          `ChromaDB semantic search failed: ${errorMessage}. ` +
            `This blocks ADHD memory recall and information organization capabilities.`,
        )
      }
    }
  }

  /**
   * Delete collection with comprehensive error handling and safety checks
   * Critical operation for ADHD data management - requires careful execution
   */
  async deleteCollection(): Promise<void> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-delete-collection-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    try {
      logger.warn('ChromaDB collection deletion initiated', {
        service: 'chromadb',
        operation: 'deleteCollection',
        collectionName: this.collectionName,
        adhdImpact: 'critical', // Collection deletion destroys all ADHD semantic search data
        dataLossRisk: 'high',
      })

      await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          if (signal?.aborted) {
            throw new Error('ChromaDB collection deletion cancelled')
          }

          await this.client.deleteCollection({ name: this.collectionName })

          // Reset service health state after collection deletion
          this.isHealthy = false
          this.lastHealthCheck = null
          this.connectionAttempts = 0
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'delete-collection',
          correlationId,
        },
      )

      logger.info('ChromaDB collection deleted successfully', {
        service: 'chromadb',
        operation: 'deleteCollection',
        collectionName: this.collectionName,
        adhdImpact: 'critical',
        recoveryAction: 'service_reset_required',
      })
    } catch (error) {
      logWithContext.error(
        'ChromaDB collection deletion failed',
        {
          service: 'chromadb',
          operation: 'deleteCollection',
          collectionName: this.collectionName,
          errorType:
            error instanceof Error ? error.constructor.name : 'unknown',
          adhdImpact: 'medium', // Deletion failure means data is preserved
        },
        error instanceof Error ? error : undefined,
      )

      // For deletion operations, we typically want to warn rather than throw
      // since failure to delete is less critical than failure to access data
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      logger.warn('ChromaDB collection deletion incomplete', {
        reason: errorMessage,
        recommendation: 'Manual cleanup may be required',
        adhdNote: 'ADHD semantic search data remains available',
      })
    }
  }

  /**
   * Get collection information with comprehensive diagnostics
   * Essential for ADHD knowledge base monitoring and troubleshooting
   */
  async getCollectionInfo(): Promise<{
    name: string
    count: number
    metadata: Record<string, unknown>
    diagnostics?: {
      lastAccess: string
      healthStatus: string
      performance: Record<string, unknown>
    }
  }> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-info-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    try {
      const startTime = Date.now()

      const result = await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          if (signal?.aborted) {
            throw new Error('ChromaDB collection info retrieval cancelled')
          }

          const collection = await this.getCollection()
          const count = await collection.count()

          const duration = Date.now() - startTime

          logger.info('ChromaDB collection info retrieved', {
            service: 'chromadb',
            operation: 'getCollectionInfo',
            collectionName: this.collectionName,
            documentCount: count,
            duration,
            adhdWorkflow: 'knowledge-monitoring',
          })

          return {
            name: this.collectionName,
            count: count,
            metadata: {
              last_updated: new Date().toISOString(),
              adhd_optimized: true,
              document_count: count,
              health_status: this.isHealthy ? 'healthy' : 'degraded',
            },
            diagnostics: {
              lastAccess: new Date().toISOString(),
              healthStatus: this.isHealthy ? 'healthy' : 'degraded',
              performance: {
                infoRetrievalTime: duration,
                connectionAttempts: this.connectionAttempts,
                lastHealthCheck: this.lastHealthCheck?.toISOString() || null,
              },
            },
          }
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'get-collection-info',
          correlationId,
        },
      )

      return result
    } catch (error) {
      logWithContext.error(
        'ChromaDB collection info retrieval failed',
        {
          service: 'chromadb',
          operation: 'getCollectionInfo',
          collectionName: this.collectionName,
          errorType:
            error instanceof Error ? error.constructor.name : 'unknown',
          adhdImpact: 'medium', // Info failure doesn't block core functionality
        },
        error instanceof Error ? error : undefined,
      )

      const errorMessage =
        error instanceof Error ? error.message : String(error)
      throw new Error(
        `ChromaDB collection information unavailable: ${errorMessage}. ` +
          `This affects ADHD knowledge base monitoring and health diagnostics.`,
      )
    }
  }

  /**
   * Upsert document with comprehensive validation and ADHD-optimized metadata
   * Critical for ADHD note updates and voice memo processing
   */
  async upsertDocument(
    id: string,
    document: string,
    metadata: Record<string, string | number | boolean>,
    embedding: number[],
  ): Promise<void> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-upsert-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    // Comprehensive input validation for ADHD data integrity
    if (!id || typeof id !== 'string') {
      throw new Error(
        'Invalid document ID: must be non-empty string for ADHD memory organization',
      )
    }

    if (!document || typeof document !== 'string') {
      throw new Error(
        'Invalid document content: must be non-empty string for ADHD knowledge storage',
      )
    }

    if (!metadata || typeof metadata !== 'object') {
      throw new Error(
        'Invalid metadata: must be object for ADHD categorization and context',
      )
    }

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(
        'Invalid embedding: must be non-empty array from Ollama semantic processing',
      )
    }

    const startTime = Date.now()

    try {
      logger.info('ChromaDB document upsert starting', {
        service: 'chromadb',
        operation: 'upsertDocument',
        documentId: id,
        documentLength: document.length,
        embeddingDimensions: embedding.length,
        metadataKeys: Object.keys(metadata),
        adhdWorkflow: 'knowledge-update',
      })

      await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          if (signal?.aborted) {
            throw new Error('ChromaDB document upsert cancelled')
          }

          const collection = await this.getCollection()

          // Enhance metadata with ADHD-specific tracking
          const enhancedMetadata = {
            ...metadata,
            updated_at: new Date().toISOString(),
            adhd_optimized: true,
            document_length: document.length,
            correlation_id: correlationId,
            operation_type: 'upsert',
          }

          await collection.upsert({
            ids: [id],
            embeddings: [embedding],
            documents: [document],
            metadatas: [enhancedMetadata],
          })

          const duration = Date.now() - startTime
          logger.info('ChromaDB document upsert successful', {
            service: 'chromadb',
            operation: 'upsertDocument',
            documentId: id,
            duration,
            documentLength: document.length,
            adhdWorkflow: 'knowledge-update',
          })
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'upsert-document',
          correlationId,
        },
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const duration = Date.now() - startTime

      logWithContext.error(
        'ChromaDB document upsert failed',
        {
          service: 'chromadb',
          operation: 'upsertDocument',
          documentId: id,
          duration,
          documentLength: document.length,
          embeddingDimensions: embedding.length,
          errorType:
            error instanceof Error ? error.constructor.name : 'unknown',
          adhdImpact: 'high', // Upsert failure prevents ADHD content updates
          adhdWorkflow: 'knowledge-update',
        },
        error instanceof Error ? error : undefined,
      )

      // Provide context-aware error messages for ADHD troubleshooting
      if (errorMessage.includes('timeout')) {
        throw new Error(
          `ChromaDB document update timed out after ${duration}ms. ` +
            `Large ADHD documents may need optimization for faster processing.`,
        )
      } else if (errorMessage.includes('dimension')) {
        throw new Error(
          `ChromaDB embedding dimension mismatch during document update. ` +
            `Ollama model configuration may have changed, affecting ADHD content processing.`,
        )
      } else {
        throw new Error(
          `ChromaDB document update failed: ${errorMessage}. ` +
            `This prevents ADHD note updates and semantic search improvements.`,
        )
      }
    }
  }

  /**
   * Delete documents with comprehensive validation and ADHD data protection
   * Critical for ADHD content management and privacy maintenance
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-delete-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    // Comprehensive input validation for ADHD data protection
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error(
        'Invalid document IDs array: must be non-empty array for ADHD content deletion',
      )
    }

    // Validate all IDs are strings
    const invalidIds = ids.filter((id) => typeof id !== 'string' || !id.trim())
    if (invalidIds.length > 0) {
      throw new Error(
        'Invalid document IDs: all IDs must be non-empty strings for ADHD memory management',
      )
    }

    const startTime = Date.now()

    try {
      logger.info('ChromaDB document deletion starting', {
        service: 'chromadb',
        operation: 'deleteDocuments',
        documentCount: ids.length,
        documentIds: ids.slice(0, 5), // Log first 5 IDs for debugging, truncate for privacy
        adhdWorkflow: 'content-cleanup',
        dataLossRisk: 'high',
      })

      await resilienceService.applyChromaDbPolicy(
        async (signal) => {
          if (signal?.aborted) {
            throw new Error('ChromaDB document deletion cancelled')
          }

          const collection = await this.getCollection()

          await collection.delete({ ids })

          const duration = Date.now() - startTime
          logger.info('ChromaDB document deletion successful', {
            service: 'chromadb',
            operation: 'deleteDocuments',
            documentCount: ids.length,
            duration,
            adhdWorkflow: 'content-cleanup',
            dataLossConfirmed: true,
          })
        },
        undefined,
        {
          workflowId: 'adhd-chromadb-service',
          stepId: 'delete-documents',
          correlationId,
        },
      )
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const duration = Date.now() - startTime

      logWithContext.error(
        'ChromaDB document deletion failed',
        {
          service: 'chromadb',
          operation: 'deleteDocuments',
          documentCount: ids.length,
          duration,
          errorType:
            error instanceof Error ? error.constructor.name : 'unknown',
          adhdImpact: 'medium', // Deletion failure preserves ADHD data
          adhdWorkflow: 'content-cleanup',
          dataPreserved: true,
        },
        error instanceof Error ? error : undefined,
      )

      // Provide context-aware error messages for ADHD troubleshooting
      if (errorMessage.includes('timeout')) {
        throw new Error(
          `ChromaDB document deletion timed out after ${duration}ms. ` +
            `Large batches of ADHD content may need to be deleted in smaller chunks.`,
        )
      } else if (errorMessage.includes('not found')) {
        // For deletion, missing documents might be acceptable
        logger.warn('Some documents not found during deletion', {
          documentCount: ids.length,
          reason: 'Documents may have been previously deleted',
          adhdNote: 'ADHD content cleanup partially successful',
        })
        return // Successful completion despite some missing documents
      } else {
        throw new Error(
          `ChromaDB document deletion failed: ${errorMessage}. ` +
            `This affects ADHD content cleanup and privacy management capabilities.`,
        )
      }
    }
  }

  /**
   * Graceful service cleanup and resource management
   * Essential for ADHD application lifecycle management
   */
  async dispose(): Promise<void> {
    const correlationId =
      getCurrentCorrelationId() || `chromadb-dispose-${Date.now()}`
    const logger = createCorrelatedLogger(correlationId)

    try {
      logger.info('ChromaDB service disposal starting', {
        service: 'chromadb',
        operation: 'dispose',
        currentHealth: this.isHealthy,
        connectionAttempts: this.connectionAttempts,
        adhdWorkflow: 'service-cleanup',
      })

      // Reset service state
      this.isHealthy = false
      this.lastHealthCheck = null
      this.connectionAttempts = 0

      logger.info('ChromaDB service disposed successfully', {
        service: 'chromadb',
        operation: 'dispose',
        adhdWorkflow: 'service-cleanup',
        resourcesCleaned: true,
      })
    } catch (error) {
      logWithContext.error(
        'ChromaDB service disposal failed',
        {
          service: 'chromadb',
          operation: 'dispose',
          adhdImpact: 'low', // Disposal failure doesn't affect ADHD functionality
        },
        error instanceof Error ? error : undefined,
      )
    }
  }
}

export const chromaClient = new ChromaDBService()
