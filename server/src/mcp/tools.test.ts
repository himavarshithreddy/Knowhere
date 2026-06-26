import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerTools } from "./tools.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { extractUserFromMcpContext } from "../middleware/oauthAuth.js";
import { hybridSearch } from "../services/search.js";

vi.mock("@modelcontextprotocol/ext-apps/server", () => ({
  registerAppTool: vi.fn()
}));
vi.mock("../middleware/oauthAuth.js", () => ({
  extractUserFromMcpContext: vi.fn()
}));
vi.mock("../services/search.js", () => ({
  hybridSearch: vi.fn()
}));
vi.mock("../models/index.js", () => ({
  Resource: { findOne: vi.fn() },
  Category: { find: vi.fn().mockReturnValue({ sort: vi.fn().mockResolvedValue([]) }) }
}));

describe("MCP Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register search, fetch, and list_categories tools", () => {
    registerTools();
    expect(registerAppTool).toHaveBeenCalledTimes(3);
    const names = vi.mocked(registerAppTool).mock.calls.map((call: any) => call[1]);
    expect(names).toContain("search");
    expect(names).toContain("fetch");
    expect(names).toContain("list_categories");
  });

  describe("search handler", () => {
    it("should return auth error if no user", async () => {
      registerTools();
      const searchHandler = vi.mocked(registerAppTool).mock.calls.find((c: any) => c[1] === "search")![3];
      
      vi.mocked(extractUserFromMcpContext).mockReturnValue(null);
      const res = await searchHandler({ query: "test" }, {});
      expect((res as any).isError).toBe(true);
      expect((res as any)._meta["mcp/www_authenticate"]).toBeDefined();
    });

    it("should call hybridSearch and return structured results", async () => {
      registerTools();
      const searchHandler = vi.mocked(registerAppTool).mock.calls.find((c: any) => c[1] === "search")![3];
      
      vi.mocked(extractUserFromMcpContext).mockReturnValue({ uid: "user1" });
      vi.mocked(hybridSearch).mockResolvedValue([{
        resource: { _id: "doc1", title: "Doc 1", url: "http://doc", type: "link" } as any,
        score: 0.9,
        matchType: "semantic"
      }]);

      const res: any = await searchHandler({ query: "test" }, {});
      expect(res.isError).toBeUndefined();
      expect(res.structuredContent.results).toHaveLength(1);
      expect(res.structuredContent.results[0].title).toBe("Doc 1");
    });
  });
});
