import { z } from "zod";
import { MAX_SCREENSHOTS } from "@/shared/types";

// ---------- Context (matches the chip options exactly) ----------

export const SourceEnum = z.enum([
    "linkedin",
    "job_board",
    "facebook_group",
    "whatsapp_telegram",
    "company_website",
    "other",
]);

export const AgeEnum = z.enum([
    "under_1_week",
    "1_4_weeks",
    "1_3_months",
    "over_3_months",
    "not_sure",
]);

export const RepostedEnum = z.enum(["yes", "no", "not_sure"]);

export const ContextSchema = z.object({
    source: SourceEnum,
    age: AgeEnum,
    reposted: RepostedEnum,
});

export type Context = z.infer<typeof ContextSchema>;

// ---------- API request ----------

const TextRequestSchema = z.object({
    mode: z.literal("text"),
    text: z.string().min(80).max(8000),
    context: ContextSchema,
});

const ImageSchema = z.object({
    imageBase64: z.string().min(1),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

const ImageRequestSchema = z.object({
    mode: z.literal("image"),
    /** Screenshots of one post, in reading order */
    images: z.array(ImageSchema).min(1).max(MAX_SCREENSHOTS),
    context: ContextSchema,
});

export const AnalyzeRequestSchema = z.discriminatedUnion("mode", [
    TextRequestSchema,
    ImageRequestSchema,
]);

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

// ---------- AI response ----------

export const PostSignalSchema = z.object({
    source: z.literal("post"),
    quote: z.string().min(1),
    reason: z.string(),
});

export const ContextSignalSchema = z.object({
    source: z.literal("context"),
    reason: z.string(),
});

export const SignalSchema = z.discriminatedUnion("source", [
    PostSignalSchema,
    ContextSignalSchema,
]);

export const LaneSchema = z.object({
    strength: z.enum(["low", "medium", "high"]),
    signals: z.array(SignalSchema),
});

export const AnalyzeResponseSchema = z.object({
    isJobPost: z.boolean(),
    extractedText: z.string(),
    lanes: z.object({
        scam: LaneSchema,
        ghost: LaneSchema,
        mismatch: LaneSchema,
    }),
    verificationSteps: z.array(z.string()).min(2).max(3),
});

export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;