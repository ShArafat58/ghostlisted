import { NextResponse } from "next/server";
import { analyzePost } from "@/server/groq";
import { AnalyzeError, ERROR_STATUS, type ApiErrorBody, type ErrorCode } from "@/shared/errors";
import { buildReport } from "@/shared/rules";
import { AnalyzeRequestSchema } from "@/shared/schema";
import type { AnalyzeSuccessBody } from "@/shared/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MIN_TEXT_CHARS = 80;
// Total for all screenshots; keeps the whole request under Vercel's 4.5 MB body limit
const MAX_IMAGE_BASE64_CHARS = 4_000_000;

function errorResponse(code: ErrorCode) {
    return NextResponse.json<ApiErrorBody>({ error: { code } }, { status: ERROR_STATUS[code] });
}

function isImageMode(body: unknown): boolean {
    return (
        typeof body === "object" &&
        body !== null &&
        (body as { mode?: unknown }).mode === "image"
    );
}

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return errorResponse("TOO_SHORT");
    }

    const parsed = AnalyzeRequestSchema.safeParse(body);
    if (!parsed.success) {
        return errorResponse(isImageMode(body) ? "INVALID_IMAGE" : "TOO_SHORT");
    }

    const request = parsed.data;

    if (request.mode === "text" && request.text.trim().length < MIN_TEXT_CHARS) {
        return errorResponse("TOO_SHORT");
    }
    if (request.mode === "image") {
        const totalChars = request.images.reduce((sum, image) => sum + image.imageBase64.length, 0);
        if (totalChars > MAX_IMAGE_BASE64_CHARS) {
            return errorResponse("INVALID_IMAGE");
        }
    }

    try {
        const result = await analyzePost(request);

        if (!result.isJobPost) {
            return errorResponse("NOT_A_JOB_POST");
        }

        // Text mode: analyze the user's exact text, never a model rewrite of it
        const postText = request.mode === "text" ? request.text : result.extractedText.trim();

        if (request.mode === "image" && postText.length === 0) {
            return errorResponse("UNREADABLE_IMAGE");
        }

        // Deterministic rules run on the server: invented quotes never reach the browser
        const report = buildReport(result, postText);
        return NextResponse.json<AnalyzeSuccessBody>({ report });
    } catch (error) {
        if (error instanceof AnalyzeError) {
            if (error.code === "AI_ERROR") console.error("[analyze]", error.message);
            return errorResponse(error.code);
        }
        console.error("[analyze] unexpected error", error);
        return errorResponse("AI_ERROR");
    }
}