import { describe, expect, it } from "vitest";
import { isPrivateIp } from "./security.js";

describe("isPrivateIp", () => {
  it("blocks local networks", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
  });
  it("allows public addresses", () => expect(isPrivateIp("8.8.8.8")).toBe(false));
});
