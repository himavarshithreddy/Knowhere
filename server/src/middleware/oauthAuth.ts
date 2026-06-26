import { AsyncLocalStorage } from "node:async_hooks";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

// We use AsyncLocalStorage to pass the Express request down to the MCP tool handlers
// because the MCP SDK's SSEServerTransport hides the underlying HTTP request for POST /messages.
export const mcpContextStorage = new AsyncLocalStorage<{ req: any }>();

export const extractUserFromMcpContext = (reqOrExtra?: any): { uid: string } | null => {
  const store = mcpContextStorage.getStore();
  const req = store?.req || reqOrExtra?.req;
  
  const authHeader = req?.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    
    // Verify audience matches the MCP resource URL
    if (decoded.aud !== config.mcpResourceUrl) {
      return null;
    }
    
    return { uid: decoded.sub };
  } catch (e) {
    return null;
  }
};
