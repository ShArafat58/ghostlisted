import "server-only";
import Groq from "groq-sdk";
import { z } from "zod";
import { buildSystemPrompt, buildUserText } from "@/server/prompt";
import { AnalyzeError } from "@/shared/errors";
import {
    AnalyzeResponseSchema,
    type AnalyzeRequest,
    type AnalyzeResponse,
} from "@/shared/schema";

const MAX_ATTEMPTS = 2;

// Real replies stay well under these. Two images already cost 4,096 tokens,
// so their reply cap is lower to stay inside the 8,000 tokens-per-minute free limit.
const MAX_TOKENS_TEXT = 1500;
const MAX_TOKENS_ONE_IMAGE = 3000;
const MAX_TOKENS_TWO_IMAGES = 1800;

let cachedJsonSchema: Record<string, unknown> | null = null;

/** One source of truth: the JSON Schema sent to Groq is generated from the Zod schema. */
function responseJsonSchema(): Record<string, unknown> {
    if (!cachedJsonSchema) {
        const schema = { ...z.toJSONSchema(AnalyzeResponseSchema) } as Record<string, unknown>;
        delete schema.$schema;
        cachedJsonSchema = schema;
    }
    return cachedJsonSchema;
}

/**
 * Models to try in order. Groq rate limits are per model.
 * Images need the vision model; text requests can fall back to a text-only model.
 */
function getModels(mode: AnalyzeRequest["mode"]): { apiKey: string; models: string[] } {
    const apiKey = process.env.GROQ_API_KEY;
    const primary = process.env.GROQ_MODEL;
    const textFallback = process.env.GROQ_TEXT_FALLBACK_MODEL;

    if (!apiKey || !primary) {
        throw new AnalyzeError("AI_ERROR", "GROQ_API_KEY or GROQ_MODEL is not set");
    }

    const models = [primary];
    if (mode === "text" && textFallback && textFallback !== primary) {
        models.push(textFallback);
    }
    return { apiKey, models };
}

function maxTokensFor(request: AnalyzeRequest): number {
    if (request.mode === "text") return MAX_TOKENS_TEXT;
    return request.images.length > 1 ? MAX_TOKENS_TWO_IMAGES : MAX_TOKENS_ONE_IMAGE;
}

type ParseResult =
    | { success: true; data: AnalyzeResponse }
    | { success: false; problem: string };

function parseReply(raw: string | null | undefined): ParseResult {
    if (!raw) return { success: false, problem: "empty reply" };

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let json: unknown;
    try {
        json = JSON.parse(cleaned);
    } catch {
        return { success: false, problem: "reply was not valid JSON" };
    }

    const result = AnalyzeResponseSchema.safeParse(json);
    if (!result.success) {
        return { success: false, problem: result.error.issues[0]?.message ?? "schema mismatch" };
    }
    return { success: true, data: result.data };
}

type UserContent =
    | string
    | (
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
    )[];

async function runWithModel(
    client: Groq,
    model: string,
    systemPrompt: string,
    userContent: UserContent,
    schema: Record<string, unknown>,
    maxTokens: number,
): Promise<AnalyzeResponse> {
    let lastProblem = "unknown";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        let raw: string | null | undefined;

        try {
            const completion = await client.chat.completions.create({
                model,
                temperature: 0.2,
                max_completion_tokens: maxTokens,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent },
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: { name: "ghostlisted_report", schema, strict: false },
                },
            });
            raw = completion.choices[0]?.message?.content;
        } catch (error) {
            // 429 = too many requests; 413 = one request larger than the per-minute token limit
            if (error instanceof Groq.APIError && (error.status === 429 || error.status === 413)) {
                console.warn(`[groq] ${model} rate limited (${error.status}):`, error.message);
                throw new AnalyzeError("RATE_LIMITED");
            }
            const message = error instanceof Error ? error.message : "Groq request failed";
            throw new AnalyzeError("AI_ERROR", `${model}: ${message}`);
        }

        const parsed = parseReply(raw);
        if (parsed.success) return parsed.data;

        lastProblem = parsed.problem;
        console.warn(`[groq] ${model} attempt ${attempt} rejected: ${lastProblem}`);
    }

    throw new AnalyzeError("AI_ERROR", `${model}: AI reply failed validation: ${lastProblem}`);
}

export async function analyzePost(request: AnalyzeRequest): Promise<AnalyzeResponse> {
    const { apiKey, models } = getModels(request.mode);
    const client = new Groq({ apiKey });

    const schema = responseJsonSchema();
    const systemPrompt = buildSystemPrompt(JSON.stringify(schema));
    const userText = buildUserText(request);

    const userContent: UserContent =
        request.mode === "image"
            ? [
                { type: "text", text: userText },
                ...request.images.map((image) => ({
                    type: "image_url" as const,
                    image_url: { url: `data:${image.mimeType};base64,${image.imageBase64}` },
                })),
            ]
            : userText;

    const maxTokens = maxTokensFor(request);

    for (const model of models) {
        try {
            return await runWithModel(client, model, systemPrompt, userContent, schema, maxTokens);
        } catch (error) {
            // Only a rate limit moves on to the next model; other errors surface immediately
            if (error instanceof AnalyzeError && error.code === "RATE_LIMITED") continue;
            throw error;
        }
    }

    throw new AnalyzeError("RATE_LIMITED");
}