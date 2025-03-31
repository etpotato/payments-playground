import Fastify from 'fastify'
import { readFile } from 'node:fs/promises'

const fastify = Fastify({
  logger: true
})

fastify.get('/', async (_request, reply) => {
  const readStream = await readFile('./public/index.html')
  reply.type('text/html').send(readStream)
})

/**
 * Run the server!
 */
const start = async () => {
  try {
    await fastify.listen({ port: 3000 })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
