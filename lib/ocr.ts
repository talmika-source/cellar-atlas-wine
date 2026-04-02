import { createWorker } from "tesseract.js";

function extractBase64Payload(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);

  if (!match) {
    throw new Error("Unsupported image payload.");
  }

  return Buffer.from(match[2], "base64");
}

export async function extractTextFromImageDataUrl(dataUrl: string) {
  const imageBuffer = extractBase64Payload(dataUrl);
  const worker = await createWorker("eng");

  try {
    const {
      data: { text }
    } = await worker.recognize(imageBuffer);

    return text.replace(/\s+/g, " ").trim();
  } finally {
    await worker.terminate();
  }
}
