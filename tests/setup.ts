// Test environment setup
process.env.OBSIDIAN_VAULT_PATH = '/tmp/test-vault'
process.env.NODE_ENV = 'test'
process.env.LOG_LEVEL = 'warn'
process.env.CHROMADB_HOST = 'localhost'
process.env.CHROMADB_PORT = '8000'
process.env.OLLAMA_HOST = 'http://localhost:11434'
process.env.OLLAMA_MODEL = 'nomic-embed-text'