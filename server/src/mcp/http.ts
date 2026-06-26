import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { mcpServer } from "./server.js";
import { mcpContextStorage } from "../middleware/oauthAuth.js";

export const mcpRouter = express.Router();

let transport: SSEServerTransport | null = null;

mcpRouter.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/mcp/messages", res);
  await mcpContextStorage.run({ req }, async () => {
    await mcpServer.server.connect(transport!);
  });
});

mcpRouter.post("/messages", async (req, res) => {
  if (transport) {
    await mcpContextStorage.run({ req }, async () => {
      await transport!.handlePostMessage(req as any, res as any);
    });
  } else {
    res.status(503).send("SSE transport not initialized");
  }
});
