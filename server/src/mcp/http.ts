import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { mcpServer } from "./server.js";
import { mcpContextStorage } from "../middleware/oauthAuth.js";

export const mcpRouter = express.Router();

// Map to hold active client connections, preventing session hijacking or collisions
const transports = new Map<string, SSEServerTransport>();

mcpRouter.get(["/", "/sse"], async (req, res) => {
  const transport = new SSEServerTransport("/mcp/messages", res);
  
  // Track transport by its unique session ID
  transports.set(transport.sessionId, transport);
  
  // Clean up when client disconnects to prevent memory leaks
  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await mcpContextStorage.run({ req }, async () => {
    await mcpServer.server.connect(transport);
  });
});

mcpRouter.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);

  if (transport) {
    await mcpContextStorage.run({ req }, async () => {
      await transport.handlePostMessage(req as any, res as any, req.body);
    });
  } else {
    res.status(400).send("Invalid or missing session ID");
  }
});
