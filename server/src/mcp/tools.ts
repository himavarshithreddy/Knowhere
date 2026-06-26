import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { mcpServer } from "./server.js";
import { hybridSearch } from "../services/search.js";
import { Resource, Category } from "../models/index.js";
import { extractUserFromMcpContext } from "../middleware/oauthAuth.js";
import { config } from "../config.js";

const authError = () => ({
  isError: true,
  content: [{ type: "text", text: "Authentication required." }],
  _meta: {
    "mcp/www_authenticate": [
      `Bearer resource_metadata="${config.mcpResourceUrl}/.well-known/oauth-protected-resource", error="invalid_token", error_description="Login required"`
    ]
  }
});

export const registerTools = () => {
  registerAppTool(
    mcpServer,
    "search",
    {
      title: "Search Knowhere",
      description: "Search the user's saved knowledge base resources",
      inputSchema: { 
        query: z.string().describe("The search query"),
        limit: z.number().optional().describe("Number of results to return (max 20)")
      },
      outputSchema: { 
        results: z.array(z.object({ 
          id: z.string(), 
          title: z.string(), 
          url: z.string().optional(),
          type: z.string(),
          aiDescription: z.string().optional(),
          score: z.number()
        }))
      },
      annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
      // @ts-ignore
      securitySchemes: [{ type: "oauth2", scopes: ["knowhere:read"] }],
      _meta: { ui: { resourceUri: "ui://knowhere/search-results.html" } },
    },
    async ({ query, limit = 10 }: any, extra: any) => {
      const user = extractUserFromMcpContext(extra);
      if (!user) return authError() as any;

      const results = await hybridSearch(user.uid, query, { limit: Math.min(limit, 20) });
      const structuredResults = results.map(r => ({
        id: r.resource._id.toString(),
        title: r.resource.title || r.resource.url || "Untitled",
        url: r.resource.url,
        type: r.resource.type,
        aiDescription: r.resource.aiDescription,
        score: r.score
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(structuredResults, null, 2) }],
        structuredContent: { results: structuredResults },
        _meta: {
          ui: {
            resourceUri: "ui://knowhere/search-results.html",
            presentation: "modal"
          }
        }
      };
    }
  );

  registerAppTool(
    mcpServer,
    "fetch",
    {
      title: "Fetch Resource Content",
      description: "Get the full content or notes for a specific resource",
      inputSchema: { id: z.string().describe("The ID of the resource to fetch") },
      outputSchema: {
        id: z.string(),
        title: z.string(),
        content: z.string()
      },
      annotations: { readOnlyHint: true },
      // @ts-ignore
      securitySchemes: [{ type: "oauth2", scopes: ["knowhere:read"] }],
    },
    async ({ id }: any, extra: any) => {
      const user = extractUserFromMcpContext(extra);
      if (!user) return authError() as any;

      const resource = await Resource.findOne({ _id: id, userId: user.uid });
      if (!resource) return { isError: true, content: [{ type: "text", text: "Resource not found." }] } as any;

      const contentText = resource.noteBody || resource.description || resource.url || "";
      const result = {
        id: resource._id.toString(),
        title: resource.title || "Untitled",
        content: contentText
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    }
  );

  registerAppTool(
    mcpServer,
    "list_categories",
    {
      title: "List Categories",
      description: "List the user's categories in Knowhere",
      inputSchema: {},
      outputSchema: {
        categories: z.array(z.object({
          id: z.string(),
          name: z.string()
        }))
      },
      annotations: { readOnlyHint: true },
      // @ts-ignore
      securitySchemes: [{ type: "oauth2", scopes: ["knowhere:read"] }]
    },
    async (_args: any, extra: any) => {
      const user = extractUserFromMcpContext(extra);
      if (!user) return authError() as any;

      const categories = await Category.find({ userId: user.uid }).sort({ order: 1 });
      const result = {
        categories: categories.map(c => ({
          id: c.categoryId,
          name: c.name
        }))
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result
      };
    }
  );
};
