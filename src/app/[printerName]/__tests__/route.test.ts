import { POST } from "../route";
import { NextRequest } from "next/server";
import * as db from "@/lib/db";

// Mock the database module
jest.mock("@/lib/db", () => ({
  setupDatabase: jest.fn().mockResolvedValue(undefined),
  insertMessage: jest.fn().mockResolvedValue(undefined),
}));

describe("/[printerName] POST route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should accept multipart/form-data file upload and insert into database", async () => {
    // Create a test image buffer
    const testImageData = Buffer.from("fake-image-data");
    const file = new File([testImageData], "test.png", {
      type: "image/png",
    });

    // Create FormData with the file
    const formData = new FormData();
    formData.append("file", file);

    // Create a mock request
    const request = new NextRequest("http://localhost:3000/testprinter", {
      method: "POST",
      body: formData,
    });

    // Call the POST handler with params
    const params = Promise.resolve({ printerName: "testprinter" });
    const response = await POST(request, { params });

    // Verify setupDatabase was called
    expect(db.setupDatabase).toHaveBeenCalledTimes(1);

    // Verify insertMessage was called with correct parameters
    expect(db.insertMessage).toHaveBeenCalledTimes(1);
    expect(db.insertMessage).toHaveBeenCalledWith(
      "testprinter",
      expect.any(Buffer)
    );

    // Verify response
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Printi is printing!");
  });

  it("should accept JSON payload with base64 images", async () => {
    const testImageBase64 = Buffer.from("fake-image-data").toString("base64");

    // Create a mock request with JSON body
    const request = new NextRequest("http://localhost:3000/myprinter", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        images: [testImageBase64],
      }),
    });

    // Call the POST handler
    const params = Promise.resolve({ printerName: "myprinter" });
    const response = await POST(request, { params });

    // Verify insertMessage was called
    expect(db.insertMessage).toHaveBeenCalledTimes(1);
    expect(db.insertMessage).toHaveBeenCalledWith(
      "myprinter",
      expect.any(Buffer)
    );

    // Verify response
    expect(response.status).toBe(200);
  });

  it("should handle multiple files in form-data", async () => {
    const file1 = new File([Buffer.from("image1")], "test1.png", {
      type: "image/png",
    });
    const file2 = new File([Buffer.from("image2")], "test2.png", {
      type: "image/png",
    });

    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);

    const request = new NextRequest("http://localhost:3000/multiprinter", {
      method: "POST",
      body: formData,
    });

    const params = Promise.resolve({ printerName: "multiprinter" });
    const response = await POST(request, { params });

    // Verify insertMessage was called twice
    expect(db.insertMessage).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
  });

  it("should reject files larger than MAX_SIZE", async () => {
    // Create a large buffer (> 10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    const largeFile = new File([largeBuffer], "large.png", {
      type: "image/png",
    });

    const formData = new FormData();
    formData.append("file", largeFile);

    const request = new NextRequest("http://localhost:3000/testprinter", {
      method: "POST",
      body: formData,
    });

    const params = Promise.resolve({ printerName: "testprinter" });
    const response = await POST(request, { params });

    // Verify insertMessage was NOT called
    expect(db.insertMessage).not.toHaveBeenCalled();
    expect(response.status).toBe(200); // Still returns 200 but doesn't insert
  });
});
