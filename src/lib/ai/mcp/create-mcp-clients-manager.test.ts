import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMCPClientsManager,
  MCPClientsManager,
} from "./create-mcp-clients-manager";
import type { MCPConfigStorage } from "./create-mcp-clients-manager";
import type { MCPServerConfig } from "app-types/mcp";

// Mock dependencies
vi.mock("./create-mcp-client", () => ({
  createMCPClient: vi.fn(),
}));

vi.mock("./mcp-tool-id", () => ({
  createMCPToolId: vi.fn((serverName, toolName) => `${serverName}:${toolName}`),
}));

vi.mock("lib/utils", () => ({
  Locker: vi.fn(() => ({
    lock: vi.fn(),
    unlock: vi.fn(),
    wait: vi.fn(),
    isLocked: false,
  })),
  generateUUID: vi.fn(() => "mock-uuid-12345678"),
  toAny: vi.fn((value) => value),
}));

vi.mock("ts-safe", () => ({
  safe: vi.fn((fn) => ({
    // ifOk: vi.fn((nextFn) => ({
    ifOk: vi.fn((anotherFn) => ({
      watch: vi.fn((watchFn) => ({
        unwrap: vi.fn(() => {
          fn();
          // nextFn();
          if (typeof anotherFn === "function") {
            return anotherFn();
          }
          watchFn();
        }),
      })),
    })),
    // })),
  })),
}));

const mockCreateMCPClient = await import("./create-mcp-client").then(
  (m) => m.createMCPClient,
);

describe("MCPClientsManager", () => {
  let manager: MCPClientsManager;
  let mockStorage: MCPConfigStorage;
  let mockClient: any;

  const mockServerConfig: MCPServerConfig = {
    command: "python",
    args: ["test.py"],
  };

  const mockServer = {
    id: "test-server",
    name: "test-server",
    config: mockServerConfig,
    enabled: true,
    userId: "test-user-id",
    visibility: "private" as const,
    perUserAuth: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContext = (servers: any[] = [mockServer]) => ({
    userId: "test-user-id",
    servers,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock process.on to prevent actual listener registration
    vi.spyOn(process, "on").mockImplementation(() => process);

    mockClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getInfo: vi.fn(() => ({
        name: "test-server",
        config: mockServerConfig,
        status: "connected" as const,
        toolInfo: [
          {
            name: "test-tool",
            description: "A test tool",
            inputSchema: {},
          },
        ],
      })),
      tools: {
        "test-tool": vi.fn(),
      },
    };

    vi.mocked(mockCreateMCPClient).mockReturnValue(mockClient);

    mockStorage = {
      init: vi.fn(),
      loadAll: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
      get: vi.fn(),
    };
  });

  afterEach(async () => {
    vi.clearAllTimers();
    // Clean up any manager instances to prevent memory leaks
    if (manager) {
      await manager.cleanup();
    }
  });

  describe("constructor", () => {
    it("should create manager without storage", () => {
      manager = new MCPClientsManager();
      expect(manager).toBeInstanceOf(MCPClientsManager);
    });

    it("should create manager with storage", () => {
      manager = new MCPClientsManager(mockStorage);
      expect(manager).toBeInstanceOf(MCPClientsManager);
    });

    it("should create manager with custom auto-disconnect timeout", () => {
      manager = new MCPClientsManager(mockStorage, 1800); // 30 minutes
      expect(manager).toBeInstanceOf(MCPClientsManager);
    });
  });

  describe("init", () => {
    beforeEach(() => {
      manager = new MCPClientsManager(mockStorage);
    });

    it("should initialize without storage", async () => {
      manager = new MCPClientsManager();
      await expect(manager.init()).resolves.toBeUndefined();
    });

    it("should initialize with storage and connect new servers", async () => {
      vi.mocked(mockStorage.loadAll).mockResolvedValue([mockServer]);

      await manager.init();

      expect(mockStorage.init).toHaveBeenCalledWith(manager);
      expect(mockStorage.loadAll).toHaveBeenCalled();
      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "test-server",
        "test-server",
        mockServerConfig,
        expect.objectContaining({ autoDisconnectSeconds: 1800 }),
      );
      // New servers (no cache, no error) connect during init
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it("should use cached tool info and skip connect", async () => {
      const cachedToolInfo = [
        { name: "cached-tool", description: "A cached tool" },
      ];
      vi.mocked(mockStorage.loadAll).mockResolvedValue([
        { ...mockServer, toolInfo: cachedToolInfo },
      ]);

      await manager.init();

      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "test-server",
        "test-server",
        mockServerConfig,
        expect.objectContaining({
          autoDisconnectSeconds: 1800,
          initialToolInfo: cachedToolInfo,
        }),
      );
      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    it("should connect when no cached tool info exists", async () => {
      vi.mocked(mockStorage.loadAll).mockResolvedValue([
        { ...mockServer, toolInfo: null },
      ]);

      await manager.init();

      expect(mockClient.connect).toHaveBeenCalled();
    });

    it("should register errored servers without connecting", async () => {
      vi.mocked(mockStorage.loadAll).mockResolvedValue([
        { ...mockServer, toolInfo: null, lastConnectionStatus: "error" },
      ]);

      await manager.init();

      expect(mockCreateMCPClient).toHaveBeenCalled();
      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    it("should handle storage initialization errors", async () => {
      vi.mocked(mockStorage.init).mockRejectedValue(new Error("Storage error"));

      await expect(manager.init()).rejects.toThrow("Storage error");
    });
  });

  describe("addClient", () => {
    beforeEach(async () => {
      manager = new MCPClientsManager(mockStorage);
      await manager.init();
    });

    it("should add new client", async () => {
      await manager.addClient("new-server", "new-server", mockServerConfig);

      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "new-server",
        "new-server",
        mockServerConfig,
        expect.objectContaining({ autoDisconnectSeconds: 1800 }),
      );
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it("should replace existing client", async () => {
      // Add first client
      await manager.addClient("test-server", "test-server", mockServerConfig);

      const firstClient = mockClient;
      const secondClient = { ...mockClient, disconnect: vi.fn() };
      vi.mocked(mockCreateMCPClient).mockReturnValue(secondClient);

      // Add client with same ID
      await manager.addClient("test-server", "test-server", mockServerConfig);

      expect(firstClient.disconnect).toHaveBeenCalled();
      expect(secondClient.connect).toHaveBeenCalled();
    });
  });

  describe("persistClient", () => {
    beforeEach(async () => {
      manager = new MCPClientsManager(mockStorage);
      await manager.init();
    });

    it("should persist client with storage", async () => {
      const serverToSave = {
        name: "new-server",
        config: mockServerConfig,
        userId: "test-user-id",
      };

      vi.mocked(mockStorage.save).mockResolvedValue({
        ...serverToSave,
        id: "new-server-id",
        visibility: "private" as const,
        perUserAuth: false,
      });

      await manager.persistClient(serverToSave);

      expect(mockStorage.save).toHaveBeenCalledWith(serverToSave);
      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "new-server-id",
        "new-server",
        mockServerConfig,
        expect.objectContaining({ autoDisconnectSeconds: 1800 }),
      );
    });

    it("should persist per-user auth client with creator context", async () => {
      const serverToSave = {
        name: "new-server",
        config: mockServerConfig,
        userId: "test-user-id",
        perUserAuth: true,
      };

      vi.mocked(mockStorage.save).mockResolvedValue({
        ...serverToSave,
        id: "new-server-id",
        visibility: "private" as const,
      });
      vi.mocked(mockStorage.get).mockResolvedValue({
        ...serverToSave,
        id: "new-server-id",
        visibility: "private" as const,
      });

      const result = await manager.persistClient(serverToSave);

      expect(result).toEqual({ client: mockClient, name: "new-server" });
      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "new-server-id",
        "new-server",
        mockServerConfig,
        expect.objectContaining({
          autoDisconnectSeconds: 1800,
          perUserAuth: true,
          userId: "test-user-id",
        }),
      );
    });

    it("should persist client without storage", async () => {
      manager = new MCPClientsManager();
      await manager.init();

      const serverToSave = {
        name: "new-server",
        config: mockServerConfig,
        userId: "test-user-id",
      };

      await manager.persistClient(serverToSave);

      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "memory-1",
        "new-server",
        mockServerConfig,
        expect.objectContaining({ autoDisconnectSeconds: 1800 }),
      );
    });
  });

  describe("removeClient", () => {
    beforeEach(async () => {
      manager = new MCPClientsManager(mockStorage);
      await manager.init();
      await manager.addClient("test-server", "test-server", mockServerConfig);
    });

    it("should remove client with storage", async () => {
      vi.mocked(mockStorage.has).mockResolvedValue(true);

      await manager.removeClient("test-server");

      expect(mockStorage.has).toHaveBeenCalledWith("test-server");
      expect(mockStorage.delete).toHaveBeenCalledWith("test-server");
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it("should remove client without storage persistence", async () => {
      vi.mocked(mockStorage.has).mockResolvedValue(false);

      await manager.removeClient("test-server");

      expect(mockStorage.has).toHaveBeenCalledWith("test-server");
      expect(mockStorage.delete).not.toHaveBeenCalled();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    it("should handle removing non-existent client", async () => {
      vi.mocked(mockStorage.has).mockResolvedValue(false);

      await manager.removeClient("non-existent");

      expect(mockStorage.delete).not.toHaveBeenCalled();
    });
  });

  describe("refreshClient", () => {
    beforeEach(async () => {
      manager = new MCPClientsManager(mockStorage);
      await manager.init();
      await manager.addClient("test-server", "test-server", mockServerConfig);
    });

    it("should refresh client with storage", async () => {
      const updatedConfig = { command: "node", args: ["test.js"] };
      const updatedServer = {
        ...mockServer,
        config: updatedConfig,
        userId: "test-user-id",
        visibility: "private" as const,
      };

      vi.mocked(mockStorage.get).mockResolvedValue(updatedServer);

      const newClient = { ...mockClient };
      vi.mocked(mockCreateMCPClient).mockReturnValue(newClient);

      await manager.refreshClient("test-server", mockContext([updatedServer]));

      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "test-server",
        "test-server",
        updatedConfig,
        expect.objectContaining({ autoDisconnectSeconds: 1800 }),
      );
    });

    it("should throw error for non-existent client", async () => {
      await expect(
        manager.refreshClient("non-existent", mockContext()),
      ).rejects.toThrow("MCP server non-existent is not accessible");
    });

    it("should throw error when storage client not found", async () => {
      await expect(
        manager.refreshClient("test-server", mockContext([])),
      ).rejects.toThrow("MCP server test-server is not accessible");
    });
  });

  describe("getClients", () => {
    beforeEach(async () => {
      manager = new MCPClientsManager(mockStorage);
      await manager.init();
    });

    it("should return empty array when no clients", async () => {
      const clients = await manager.getClients(mockContext([]));
      expect(clients).toEqual([]);
    });

    it("should return all clients", async () => {
      await manager.addClient("server1", "server1", mockServerConfig);
      await manager.addClient("server2", "server2", mockServerConfig);
      vi.mocked(mockStorage.loadAll).mockResolvedValue([
        {
          ...mockServer,
          id: "server1",
          name: "server1",
        },
        {
          ...mockServer,
          id: "server2",
          name: "server2",
        },
      ]);

      const clients = await manager.getClients(
        mockContext([
          {
            ...mockServer,
            id: "server1",
            name: "server1",
          },
          {
            ...mockServer,
            id: "server2",
            name: "server2",
          },
        ]),
      );

      expect(clients).toHaveLength(2);
      expect(clients[0]).toMatchObject({
        id: "server1",
        clientId: "server1",
        client: mockClient,
        name: "server1",
      });
      expect(clients[1]).toMatchObject({
        id: "server2",
        clientId: "server2",
        client: mockClient,
        name: "server2",
      });
    });
  });

  describe("tools", () => {
    beforeEach(async () => {
      manager = new MCPClientsManager(mockStorage);
      await manager.init();
    });

    it("should return empty object when no clients", async () => {
      const tools = await manager.tools(mockContext([]));
      expect(tools).toEqual({});
    });

    it("should exclude clients with no tools", async () => {
      const clientWithoutTools = {
        ...mockClient,
        getInfo: vi.fn(() => ({
          name: "empty-server",
          config: mockServerConfig,
          status: "connected" as const,
          toolInfo: [],
        })),
        tools: {},
      };

      vi.mocked(mockCreateMCPClient).mockReturnValue(clientWithoutTools);
      await manager.addClient("empty-server", "empty-server", mockServerConfig);

      const tools = await manager.tools(
        mockContext([
          {
            ...mockServer,
            id: "empty-server",
            name: "empty-server",
          },
        ]),
      );
      expect(tools).toEqual({});
    });

    it("should expose cached public per-user tools without connecting", async () => {
      const cachedToolInfo = [
        {
          name: "cached-tool",
          description: "Cached public tool",
          inputSchema: { type: "object" },
        },
      ];
      const server = {
        ...mockServer,
        id: "shared-per-user",
        name: "shared-per-user",
        userId: "owner-user-id",
        visibility: "public" as const,
        perUserAuth: true,
        toolInfo: cachedToolInfo,
      };

      const tools = await manager.tools(mockContext([server]));

      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "shared-per-user",
        "shared-per-user",
        mockServerConfig,
        expect.objectContaining({
          autoDisconnectSeconds: 1800,
          initialToolInfo: cachedToolInfo,
          perUserAuth: true,
          userId: "test-user-id",
        }),
      );
      expect(mockClient.connect).not.toHaveBeenCalled();
      expect(Object.keys(tools)).toEqual(["shared-per-user:cached-tool"]);
      expect(tools["shared-per-user:cached-tool"]).toMatchObject({
        _mcpServerId: "shared-per-user",
        _mcpServerName: "shared-per-user",
        _originToolName: "cached-tool",
      });
    });

    it("should not pre-authorize uncached per-user servers during discovery", async () => {
      const server = {
        ...mockServer,
        id: "uncached-per-user",
        name: "uncached-per-user",
        visibility: "public" as const,
        perUserAuth: true,
        toolInfo: null,
      };

      const tools = await manager.tools(mockContext([server]));

      expect(mockCreateMCPClient).not.toHaveBeenCalled();
      expect(mockClient.connect).not.toHaveBeenCalled();
      expect(tools).toEqual({});
    });

    it("should discover uncached shared-auth tools by connecting", async () => {
      mockClient.toolInfo = [
        {
          name: "live-tool",
          description: "Live tool",
          inputSchema: { type: "object" },
        },
      ];
      const server = {
        ...mockServer,
        id: "shared-auth",
        name: "shared-auth",
        visibility: "public" as const,
        perUserAuth: false,
        toolInfo: null,
      };

      const tools = await manager.tools(mockContext([server]));

      expect(mockCreateMCPClient).toHaveBeenCalledWith(
        "shared-auth",
        "shared-auth",
        mockServerConfig,
        expect.objectContaining({
          autoDisconnectSeconds: 1800,
          perUserAuth: false,
          userId: "test-user-id",
        }),
      );
      expect(mockClient.connect).toHaveBeenCalled();
      expect(Object.keys(tools)).toEqual(["shared-auth:live-tool"]);
    });
  });

  describe("cleanup", () => {
    beforeEach(async () => {
      manager = new MCPClientsManager(mockStorage);
      await manager.init();
    });

    it("should disconnect all clients", async () => {
      await manager.addClient("server1", "server1", mockServerConfig);
      await manager.addClient("server2", "server2", mockServerConfig);

      await manager.cleanup();

      expect(mockClient.disconnect).toHaveBeenCalledTimes(2);
    });

    it("should clear clients map", async () => {
      await manager.addClient("test-server", "test-server", mockServerConfig);

      await manager.cleanup();

      const clients = await manager.getClients(mockContext());
      expect(clients).toEqual([]);
    });
  });

  describe("onToolInfoUpdate callback", () => {
    it("should persist tool info to storage when callback fires", async () => {
      mockStorage.updateToolInfo = vi.fn().mockResolvedValue(undefined);
      manager = new MCPClientsManager(mockStorage);
      await manager.init();

      await manager.addClient("test-server", "test-server", mockServerConfig);

      const createCall = vi.mocked(mockCreateMCPClient).mock.calls.at(-1)!;
      const options = createCall[3] as any;
      expect(options.onToolInfoUpdate).toBeDefined();

      const newToolInfo = [{ name: "new-tool", description: "New tool" }];
      options.onToolInfoUpdate(newToolInfo);

      expect(mockStorage.updateToolInfo).toHaveBeenCalledWith(
        "test-server",
        newToolInfo,
      );
    });
  });

  describe("onConnectionStatusChange callback", () => {
    it("should persist connection status to storage when callback fires", async () => {
      mockStorage.updateConnectionStatus = vi.fn().mockResolvedValue(undefined);
      manager = new MCPClientsManager(mockStorage);
      await manager.init();

      await manager.addClient("test-server", "test-server", mockServerConfig);

      const createCall = vi.mocked(mockCreateMCPClient).mock.calls.at(-1)!;
      const options = createCall[3] as any;
      expect(options.onConnectionStatusChange).toBeDefined();

      options.onConnectionStatusChange("connected");

      expect(mockStorage.updateConnectionStatus).toHaveBeenCalledWith(
        "test-server",
        "connected",
      );
    });
  });

  describe("createMCPClientsManager factory function", () => {
    it("should create manager without storage", () => {
      const manager = createMCPClientsManager();
      expect(manager).toBeInstanceOf(MCPClientsManager);
    });

    it("should create manager with storage", () => {
      const manager = createMCPClientsManager(mockStorage);
      expect(manager).toBeInstanceOf(MCPClientsManager);
    });

    it("should create manager with custom timeout", () => {
      const manager = createMCPClientsManager(mockStorage, 3600);
      expect(manager).toBeInstanceOf(MCPClientsManager);
    });
  });

  describe("process signal handlers", () => {
    it("should register cleanup handlers for SIGINT and SIGTERM", () => {
      // Clear previous mocks for this specific test
      vi.clearAllMocks();
      const processSpy = vi
        .spyOn(process, "on")
        .mockImplementation(() => process);

      new MCPClientsManager(mockStorage);

      expect(processSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    });
  });
});
