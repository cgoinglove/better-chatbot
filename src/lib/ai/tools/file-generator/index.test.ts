import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FileStorage } from "lib/file-storage/file-storage.interface";

// Mock the server file storage
const mockUpload = vi.fn();
const mockGetDownloadUrl = vi.fn();

vi.mock("lib/file-storage", () => ({
  serverFileStorage: {
    upload: mockUpload,
    getDownloadUrl: mockGetDownloadUrl,
  } as Partial<FileStorage>,
}));

// Mock logger
vi.mock("logger", () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Import after mocking
const { fileGeneratorTool } = await import("./index");

type FileGeneratorToolResult = {
  files: {
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }[];
  description?: string;
  guide?: string;
};

describe("fileGeneratorTool.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MIME type inference", () => {
    const testCases = [
      { ext: "csv", expected: "text/csv" },
      { ext: "json", expected: "application/json" },
      { ext: "xml", expected: "application/xml" },
      { ext: "yaml", expected: "text/yaml" },
      { ext: "yml", expected: "text/yaml" },
      { ext: "txt", expected: "text/plain" },
      { ext: "md", expected: "text/markdown" },
      { ext: "html", expected: "text/html" },
      { ext: "css", expected: "text/css" },
      { ext: "js", expected: "text/javascript" },
      { ext: "ts", expected: "text/typescript" },
      { ext: "py", expected: "text/x-python" },
      { ext: "sh", expected: "application/x-sh" },
      { ext: "sql", expected: "application/sql" },
      { ext: "env", expected: "text/plain" },
      { ext: "log", expected: "text/plain" },
      { ext: "unknown", expected: "text/plain" }, // fallback
    ];

    testCases.forEach(({ ext, expected }) => {
      it(`should infer ${expected} for .${ext} files`, async () => {
        mockUpload.mockResolvedValue({
          key: "test-key",
          sourceUrl: "https://example.com/file",
          metadata: {
            key: "test-key",
            filename: `test.${ext}`,
            contentType: expected,
            size: 100,
            uploadedAt: new Date(),
          },
        });

        if (fileGeneratorTool.execute) {
          await fileGeneratorTool.execute(
            {
              files: [
                {
                  filename: `test.${ext}`,
                  content: "test content",
                },
              ],
            },
            {} as any, // ToolCallOptions
          );
        }

        expect(mockUpload).toHaveBeenCalledWith(
          expect.any(Buffer),
          expect.objectContaining({
            filename: `test.${ext}`,
            contentType: expected,
          }),
        );
      });
    });

    it("should use provided mimeType over inferred one", async () => {
      mockUpload.mockResolvedValue({
        key: "test-key",
        sourceUrl: "https://example.com/file",
        metadata: {
          key: "test-key",
          filename: "test.csv",
          contentType: "application/custom",
          size: 100,
          uploadedAt: new Date(),
        },
      });

      if (fileGeneratorTool.execute) {
        await fileGeneratorTool.execute(
          {
            files: [
              {
                filename: "test.csv",
                content: "test content",
                mimeType: "application/custom",
              },
            ],
          },
          {} as any,
        );
      }

      expect(mockUpload).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          contentType: "application/custom",
        }),
      );
    });
  });

  describe("file upload", () => {
    it("should upload file content as Buffer", async () => {
      mockUpload.mockResolvedValue({
        key: "test-key",
        sourceUrl: "https://example.com/file",
        metadata: {
          key: "test-key",
          filename: "test.txt",
          contentType: "text/plain",
          size: 12,
          uploadedAt: new Date(),
        },
      });

      const content = "test content";
      if (fileGeneratorTool.execute) {
        await fileGeneratorTool.execute(
          {
            files: [
              {
                filename: "test.txt",
                content,
              },
            ],
          },
          {} as any,
        );
      }

      expect(mockUpload).toHaveBeenCalledTimes(1);
      const uploadedBuffer = mockUpload.mock.calls[0][0] as Buffer;
      expect(uploadedBuffer.toString("utf-8")).toBe(content);
    });

    it("should use presigned URL when available", async () => {
      mockUpload.mockResolvedValue({
        key: "test-key",
        sourceUrl: "https://s3.example.com/file",
        metadata: {
          key: "test-key",
          filename: "test.txt",
          contentType: "text/plain",
          size: 12,
          uploadedAt: new Date(),
        },
      });

      mockGetDownloadUrl.mockResolvedValue(
        "https://s3.example.com/file?presigned=true",
      );

      let result:
        | FileGeneratorToolResult
        | AsyncIterable<FileGeneratorToolResult>
        | undefined;
      if (fileGeneratorTool.execute) {
        result = await fileGeneratorTool.execute(
          {
            files: [
              {
                filename: "test.txt",
                content: "test",
              },
            ],
          },
          {} as any,
        );
      }

      expect(mockGetDownloadUrl).toHaveBeenCalledWith("test-key");
      if (result && !(Symbol.asyncIterator in result)) {
        expect(result.files[0].url).toBe(
          "https://s3.example.com/file?presigned=true",
        );
      }
    });

    it("should fall back to sourceUrl when getDownloadUrl returns null", async () => {
      mockUpload.mockResolvedValue({
        key: "test-key",
        sourceUrl: "https://example.com/file",
        metadata: {
          key: "test-key",
          filename: "test.txt",
          contentType: "text/plain",
          size: 12,
          uploadedAt: new Date(),
        },
      });

      mockGetDownloadUrl.mockResolvedValue(null);

      let result:
        | FileGeneratorToolResult
        | AsyncIterable<FileGeneratorToolResult>
        | undefined;
      if (fileGeneratorTool.execute) {
        result = await fileGeneratorTool.execute(
          {
            files: [
              {
                filename: "test.txt",
                content: "test",
              },
            ],
          },
          {} as any,
        );
      }

      if (result && !(Symbol.asyncIterator in result)) {
        expect(result.files[0].url).toBe("https://example.com/file");
      }
    });

    it("should upload multiple files in parallel", async () => {
      mockUpload.mockImplementation(async (buffer, options) => ({
        key: `key-${options?.filename}`,
        sourceUrl: `https://example.com/${options?.filename}`,
        metadata: {
          key: `key-${options?.filename}`,
          filename: options?.filename || "file",
          contentType: options?.contentType || "text/plain",
          size: (buffer as Buffer).length,
          uploadedAt: new Date(),
        },
      }));

      let result:
        | FileGeneratorToolResult
        | AsyncIterable<FileGeneratorToolResult>
        | undefined;
      if (fileGeneratorTool.execute) {
        result = await fileGeneratorTool.execute(
          {
            files: [
              { filename: "file1.txt", content: "content1" },
              { filename: "file2.txt", content: "content2" },
              { filename: "file3.txt", content: "content3" },
            ],
          },
          {} as any,
        );
      }

      expect(mockUpload).toHaveBeenCalledTimes(3);
      if (result && !(Symbol.asyncIterator in result)) {
        expect(result.files).toHaveLength(3);
        expect(result.files[0].filename).toBe("file1.txt");
        expect(result.files[1].filename).toBe("file2.txt");
        expect(result.files[2].filename).toBe("file3.txt");
      }
    });
  });

  describe("result format", () => {
    it("should return correct result structure", async () => {
      mockUpload.mockResolvedValue({
        key: "test-key",
        sourceUrl: "https://example.com/file.csv",
        metadata: {
          key: "test-key",
          filename: "data.csv",
          contentType: "text/csv",
          size: 100,
          uploadedAt: new Date(),
        },
      });

      let result:
        | FileGeneratorToolResult
        | AsyncIterable<FileGeneratorToolResult>
        | undefined;
      if (fileGeneratorTool.execute) {
        result = await fileGeneratorTool.execute(
          {
            files: [
              {
                filename: "data.csv",
                content: "col1,col2\nval1,val2",
                mimeType: "text/csv",
              },
            ],
            description: "Test CSV file",
          },
          {} as any,
        );
      }

      if (result && !(Symbol.asyncIterator in result)) {
        expect(result).toMatchObject({
          files: [
            {
              url: "https://example.com/file.csv",
              filename: "data.csv",
              mimeType: "text/csv",
              size: 100,
            },
          ],
          description: "Test CSV file",
        });
        expect(result.guide).toBeDefined();
      }
    });

    it("should include file size in result", async () => {
      const content = "test content with some length";

      mockUpload.mockResolvedValue({
        key: "test-key",
        sourceUrl: "https://example.com/file",
        metadata: {
          key: "test-key",
          filename: "test.txt",
          contentType: "text/plain",
          size: Buffer.from(content).length,
          uploadedAt: new Date(),
        },
      });

      let result:
        | FileGeneratorToolResult
        | AsyncIterable<FileGeneratorToolResult>
        | undefined;
      if (fileGeneratorTool.execute) {
        result = await fileGeneratorTool.execute(
          {
            files: [
              {
                filename: "test.txt",
                content,
              },
            ],
          },
          {} as any,
        );
      }

      if (result && !(Symbol.asyncIterator in result)) {
        expect(result.files[0].size).toBe(Buffer.from(content).length);
      }
    });
  });

  describe("error handling", () => {
    it("should throw error when upload fails", async () => {
      mockUpload.mockRejectedValue(new Error("Upload failed"));

      if (fileGeneratorTool.execute) {
        await expect(
          fileGeneratorTool.execute(
            {
              files: [
                {
                  filename: "test.txt",
                  content: "test",
                },
              ],
            },
            {} as any,
          ),
        ).rejects.toThrow(
          "File generation was successful, but file upload failed",
        );
      }
    });
  });
});
