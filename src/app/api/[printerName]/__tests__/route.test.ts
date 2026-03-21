import { POST } from "../route";
import { NextRequest } from "next/server";
import { getPool, setupDatabase } from "@/lib/db";

describe("/[printerName] POST route", () => {
  beforeAll(async () => {
    await setupDatabase();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    const pool = getPool();
    await pool.query("DELETE FROM printi_message WHERE printer_name LIKE 'test%'");
    await pool.query("DELETE FROM printi_seen WHERE name LIKE 'test%'");
  });

  afterAll(async () => {
    // Clean up and close pool after all tests
    const pool = getPool();
    await pool.query("DELETE FROM printi_message WHERE printer_name LIKE 'test%'");
    await pool.query("DELETE FROM printi_seen WHERE name LIKE 'test%'");
    await pool.end();
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
    const request = new NextRequest("http://localhost:3000/api/testprinter", {
      method: "POST",
      body: formData,
    });

    // Call the POST handler with params
    const params = Promise.resolve({ printerName: "testprinter" });
    const response = await POST(request, { params });

    // Verify response
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("Printi is printing!");

    // Verify data was inserted into database
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM printi_message WHERE printer_name = $1",
      ["testprinter"]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].printer_name).toBe("testprinter");
    expect(result.rows[0].image_data).toBeTruthy();
  });

  it("should accept JSON payload with base64 images", async () => {
    const testImageBase64 = Buffer.from("fake-image-data").toString("base64");

    // Create a mock request with JSON body
    const request = new NextRequest("http://localhost:3000/api/testjson", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        images: [testImageBase64],
      }),
    });

    // Call the POST handler
    const params = Promise.resolve({ printerName: "testjson" });
    const response = await POST(request, { params });

    // Verify response
    expect(response.status).toBe(200);

    // Verify data was inserted into database
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM printi_message WHERE printer_name = $1",
      ["testjson"]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].image_data.toString()).toBe("fake-image-data");
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

    const request = new NextRequest("http://localhost:3000/api/testmulti", {
      method: "POST",
      body: formData,
    });

    const params = Promise.resolve({ printerName: "testmulti" });
    const response = await POST(request, { params });

    expect(response.status).toBe(200);

    // Verify both files were inserted into database
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM printi_message WHERE printer_name = $1",
      ["testmulti"]
    );
    expect(result.rows.length).toBe(2);
  });

  it("should record printi in printi_seen with description from header", async () => {
    const request = new NextRequest("http://localhost:3000/api/testseen", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Printi-Description": "My living room printer",
      },
      body: JSON.stringify({ images: [] }),
    });

    const params = Promise.resolve({ printerName: "testseen" });
    await POST(request, { params });

    const pool = getPool();
    const result = await pool.query(
      "SELECT name, description FROM printi_seen WHERE name = $1",
      ["testseen"]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]).toMatchObject({
      name: "testseen",
      description: "My living room printer",
    });
  });

  it("should record printi_seen with null description when header is absent", async () => {
    const request = new NextRequest("http://localhost:3000/api/testnodesc", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ images: [] }),
    });

    const params = Promise.resolve({ printerName: "testnodesc" });
    await POST(request, { params });

    const pool = getPool();
    const result = await pool.query(
      "SELECT name, description FROM printi_seen WHERE name = $1",
      ["testnodesc"]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].description).toBeNull();
  });

  it("should update description in printi_seen on subsequent calls", async () => {
    const params = Promise.resolve({ printerName: "testupdate" });

    await POST(
      new NextRequest("http://localhost:3000/api/testupdate", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Printi-Description": "Old desc" },
        body: JSON.stringify({ images: [] }),
      }),
      { params }
    );

    await POST(
      new NextRequest("http://localhost:3000/api/testupdate", {
        method: "POST",
        headers: { "content-type": "application/json", "X-Printi-Description": "New desc" },
        body: JSON.stringify({ images: [] }),
      }),
      { params }
    );

    const pool = getPool();
    const result = await pool.query(
      "SELECT name, description FROM printi_seen WHERE name = $1",
      ["testupdate"]
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].description).toBe("New desc");
  });

  it("should reject files larger than MAX_SIZE", async () => {
    // Create a large buffer (> 10MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    const largeFile = new File([largeBuffer], "large.png", {
      type: "image/png",
    });

    const formData = new FormData();
    formData.append("file", largeFile);

    const request = new NextRequest("http://localhost:3000/api/testlarge", {
      method: "POST",
      body: formData,
    });

    const params = Promise.resolve({ printerName: "testlarge" });
    const response = await POST(request, { params });

    expect(response.status).toBe(200); // Still returns 200 but doesn't insert

    // Verify nothing was inserted into database
    const pool = getPool();
    const result = await pool.query(
      "SELECT * FROM printi_message WHERE printer_name = $1",
      ["testlarge"]
    );
    expect(result.rows.length).toBe(0);
  });
});
