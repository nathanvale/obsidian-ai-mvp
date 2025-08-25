import type { FastifyInstance } from 'fastify'

export async function chatRoutes(server: FastifyInstance) {
  server.post(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            message: { type: 'string', minLength: 1 },
            context: { type: 'array', items: { type: 'string' } },
          },
          required: ['message'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              response: { type: 'string' },
              context: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { message, context = [] } = request.body as {
        message: string
        context?: string[]
      }

      return reply.status(200).send({
        response: `This is a placeholder response to: "${message}"`,
        context,
      })
    },
  )
}
