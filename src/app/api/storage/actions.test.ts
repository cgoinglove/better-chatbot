import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const importActions = async () => await import("./actions");

describe("checkStorageAction", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.FILE_STORAGE_TYPE;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.FILE_STORAGE_S3_BUCKET;
    delete process.env.FILE_STORAGE_S3_REGION;
    delete process.env.AWS_REGION;
  });

  it("invalid when vercel-blob missing token", async () => {
    process.env.FILE_STORAGE_TYPE = "vercel-blob";
    const { checkStorageAction } = await importActions();
    const res = await checkStorageAction();
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/BLOB_READ_WRITE_TOKEN/);
  });

  it("s3 missing config", async () => {
    process.env.FILE_STORAGE_TYPE = "s3";
    const { checkStorageAction } = await importActions();
    const res = await checkStorageAction();
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Missing S3 configuration/);
  });

  it("s3 valid with required envs", async () => {
    process.env.FILE_STORAGE_TYPE = "s3";
    process.env.FILE_STORAGE_S3_BUCKET = "bucket";
    process.env.FILE_STORAGE_S3_REGION = "us-east-1";
    const { checkStorageAction } = await importActions();
    const res = await checkStorageAction();
    expect(res.isValid).toBe(true);
  });
});
