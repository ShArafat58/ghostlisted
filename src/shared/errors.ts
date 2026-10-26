export const ERROR_CODES = [
    "TOO_SHORT",
    "NOT_A_JOB_POST",
    "UNREADABLE_IMAGE",
    "INVALID_IMAGE",
    "RATE_LIMITED",
    "AI_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Shape of every error response from POST /api/analyze */
export interface ApiErrorBody {
    error: { code: ErrorCode };
}

/** Thrown on the server to carry a typed error code up to the route. */
export class AnalyzeError extends Error {
    readonly code: ErrorCode;

    constructor(code: ErrorCode, message?: string) {
        super(message ?? code);
        this.name = "AnalyzeError";
        this.code = code;
    }
}

export const ERROR_STATUS: Record<ErrorCode, number> = {
    TOO_SHORT: 400,
    INVALID_IMAGE: 400,
    NOT_A_JOB_POST: 422,
    UNREADABLE_IMAGE: 422,
    RATE_LIMITED: 429,
    AI_ERROR: 502,
};

export const ERROR_MESSAGES: Record<ErrorCode, { title: string; body: string }> = {
    TOO_SHORT: {
        title: "We need the full post",
        body: "Paste the complete job post, between 80 and 8,000 characters, so the check has enough to read.",
    },
    NOT_A_JOB_POST: {
        title: "This doesn't look like a job post",
        body: "Try pasting the full listing, or run one of the sample posts to see how the check works.",
    },
    UNREADABLE_IMAGE: {
        title: "We couldn't read that screenshot",
        body: "Try a clearer, uncropped image, or paste the post text instead.",
    },
    INVALID_IMAGE: {
        title: "That file can't be checked",
        body: "Use up to 2 JPG, PNG, or WebP screenshots, each up to 4 MB.",
    },
    RATE_LIMITED: {
        title: "The AI service is busy",
        body: "Too many checks at once. Wait a moment and try again.",
    },
    AI_ERROR: {
        title: "Something went wrong on our side",
        body: "The analysis didn't come back cleanly. Please try again.",
    },
};

export function isErrorCode(value: unknown): value is ErrorCode {
    return typeof value === "string" && (ERROR_CODES as readonly string[]).includes(value);
}