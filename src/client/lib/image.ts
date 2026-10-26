import { MAX_SCREENSHOTS } from "@/shared/types";

/** Image rules shared by the upload UI (spec.md > Core Journey, step 2) */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const MAX_EDGE_PX = 1600;
// Total for all screenshots together; matches the server cap so the request stays under Vercel's 4.5 MB body limit
const MAX_TOTAL_BASE64_CHARS = 4_000_000;
const JPEG_QUALITIES = [0.85, 0.7, 0.55, 0.4];

export interface PreparedImage {
    imageBase64: string;
    mimeType: "image/jpeg";
}

export function isAcceptedImage(file: File): boolean {
    const typeOk = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);
    return typeOk && file.size > 0 && file.size <= MAX_IMAGE_BYTES;
}

function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Could not decode image"));
        };
        img.src = url;
    });
}

/** Downscales one image (long edge at most 1600px) and re-encodes it as JPEG within a character budget. */
async function encodeImage(file: File, maxChars: number): Promise<PreparedImage> {
    if (!isAcceptedImage(file)) {
        throw new Error("Unsupported image type or size");
    }

    const img = await loadImage(file);
    const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
    if (longEdge === 0) throw new Error("Empty image");

    const scale = Math.min(1, MAX_EDGE_PX / longEdge);
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available");

    // White background so transparent PNGs don't turn black as JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    for (const quality of JPEG_QUALITIES) {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const imageBase64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
        if (imageBase64.length <= maxChars) {
            return { imageBase64, mimeType: "image/jpeg" };
        }
    }

    throw new Error("Image is still too large after compression");
}

/**
 * Prepares 1 to MAX_SCREENSHOTS screenshots of one post, keeping their order.
 * The size budget is split evenly so the whole request stays under the limit.
 */
export async function prepareImages(files: File[]): Promise<PreparedImage[]> {
    if (files.length === 0 || files.length > MAX_SCREENSHOTS) {
        throw new Error("Unsupported number of screenshots");
    }
    const budget = Math.floor(MAX_TOTAL_BASE64_CHARS / files.length);
    return Promise.all(files.map((file) => encodeImage(file, budget)));
}