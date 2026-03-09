-- HNSW index for vector similarity search on agent_memories.embedding
CREATE INDEX "agent_memories_embedding_idx" ON "agent_memories" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
-- GIN index for array containment queries on agent_memories.tags
CREATE INDEX "agent_memories_tags_idx" ON "agent_memories" USING gin ("tags");--> statement-breakpoint
-- HNSW index for vector similarity search on shared_knowledge.embedding
CREATE INDEX "shared_knowledge_embedding_idx" ON "shared_knowledge" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
-- GIN index for array containment queries on shared_knowledge.tags
CREATE INDEX "shared_knowledge_tags_idx" ON "shared_knowledge" USING gin ("tags");--> statement-breakpoint
-- GIN index for full-text search on shared_knowledge.content
CREATE INDEX "shared_knowledge_content_fts_idx" ON "shared_knowledge" USING gin (to_tsvector('english', "content"));
