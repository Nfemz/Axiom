-- HNSW indexes for vector similarity search
CREATE INDEX IF NOT EXISTS agent_memories_embedding_idx ON agent_memories USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS shared_knowledge_embedding_idx ON shared_knowledge USING hnsw (embedding vector_cosine_ops);

-- GIN indexes for array tag filtering
CREATE INDEX IF NOT EXISTS agent_memories_tags_idx ON agent_memories USING gin (tags);
CREATE INDEX IF NOT EXISTS shared_knowledge_tags_idx ON shared_knowledge USING gin (tags);

-- Full-text search index on shared_knowledge content
CREATE INDEX IF NOT EXISTS shared_knowledge_content_fts_idx ON shared_knowledge USING gin (to_tsvector('english', content));
