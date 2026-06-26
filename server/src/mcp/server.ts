import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export const mcpServer = new McpServer(
  {
    name: "Knowhere",
    version: "1.0.0",
  },
  {
    instructions: "You are connected to Knowhere, the user's personal knowledge base. Use the tools to search and fetch the user's saved resources. Always use semantic search when possible to find relevant information based on the user's query."
  }
);
