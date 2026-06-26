# Knowhere MCP Setup Guide

This guide details the steps to deploy and configure the Knowhere MCP server with ChatGPT.

## 1. Environment Variables
Add the following to your server `.env` file:

```env
# Vector Search Embeddings (OpenRouter API Key)
OPENROUTER_API_KEY=your_openrouter_api_key
EMBEDDING_MODEL=google/gemini-embedding-001 # Optional, defaults to this

# MCP Server Settings
MCP_PORT=3001
# The public URL where the Knowhere server is hosted
MCP_RESOURCE_URL=https://your-knowhere-domain.com

# OAuth Settings
# The URL of your OAuth issuer (same as MCP_RESOURCE_URL if hosting your own)
OAUTH_ISSUER_URL=https://your-knowhere-domain.com
```

## 2. MongoDB Atlas Vector Search
You must create a vector search index in your MongoDB Atlas cluster for the `resources` collection:
1. Navigate to your MongoDB Atlas dashboard and click **Search** in the sidebar.
2. Under **Search Indexes**, click **Create Search Index**.
3. **Important**: Under **Atlas Vector Search**, select **JSON Editor**, and click **Next**. (Do *not* choose Atlas Search, which is Lucene-based and expects `mappings` instead of `fields`).
4. Select your database name and the `resources` collection.
5. Name the index `vector_index`.
6. Use the following index definition:
```json
{
  "fields": [
    {
      "numDimensions": 3072,
      "path": "embedding",
      "similarity": "cosine",
      "type": "vector"
    },
    {
      "path": "userId",
      "type": "filter"
    },
    {
      "path": "deletedAt",
      "type": "filter"
    },
    {
      "path": "archived",
      "type": "filter"
    },
    {
      "path": "type",
      "type": "filter"
    }
  ]
}
```
4. Name the index `vector_index` and wait for it to build.

## 3. Backfill Existing Data
If you have existing resources in your database, generate embeddings for them using the backfill script:
```bash
npm run mcp:backfill
```

## 4. ChatGPT Apps Integration
To integrate this server as a ChatGPT App:

1. **Host the Server**: Ensure your Node.js application (including the MCP Server and the `.well-known` endpoints) is publicly accessible via HTTPS.
2. **Register the App**: Use the OpenAI Apps SDK or UI to register your app's base URL (e.g., `https://your-knowhere-domain.com`).
3. ChatGPT will automatically discover the `.well-known/oauth-protected-resource` and `.well-known/oauth-authorization-server` endpoints and configure the OAuth flow dynamically using CIMD and DCR.

## 5. Running the MCP Server
In development:
```bash
npm run mcp:build-widget
npm run mcp:dev
```
In production:
```bash
npm run mcp:build-widget
npm run mcp:start
```
