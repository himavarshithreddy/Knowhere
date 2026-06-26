import { registerAppResource } from "@modelcontextprotocol/ext-apps/server";
import { mcpServer } from "./server.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const registerWidget = () => {
  const widgetPath = path.resolve(__dirname, "../../../mcp-widget/dist/widget.html");
  
  registerAppResource(
    mcpServer,
    "Search Results Widget",
    "ui://knowhere/search-results.html",
    {
      description: "Interactive UI for Knowhere search results"
    },
    async () => {
      const content = fs.readFileSync(widgetPath, "utf-8");
      return {
        contents: [{
          uri: "ui://knowhere/search-results.html",
          mimeType: "text/html;profile=mcp-app",
          text: content
        }]
      };
    }
  );
};
