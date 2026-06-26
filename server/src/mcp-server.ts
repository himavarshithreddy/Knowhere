import express from "express";
import cors from "cors";
import { config, assertAuthConfig } from "./config.js";
import { connectDb } from "./db.js";
import { mcpRouter } from "./mcp/http.js";
import { registerTools } from "./mcp/tools.js";
import { registerWidget } from "./mcp/widget.js";

async function main() {
  assertAuthConfig();
  
  try {
    await connectDb();
  } catch (error) {
    console.error("Database connection error");
    process.exit(1);
  }

  // Register MCP tools and widget
  registerTools();
  registerWidget();

  const app = express();
  
  app.use(cors());
  app.use(express.json());

  app.use("/mcp", mcpRouter);

  app.listen(config.mcpPort, () => {
    console.log(`Knowhere MCP server listening on http://localhost:${config.mcpPort}`);
  });
}

main().catch(console.error);
