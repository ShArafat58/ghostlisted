import type { AnalyzeResponse } from "@/shared/schema";

export type LaneId = keyof AnalyzeResponse["lanes"];
export type Strength = AnalyzeResponse["lanes"]["scam"]["strength"];
export type NextMove = "Apply" | "Verify first" | "Skip";

/** Up to 2 screenshots per check: each image costs 2,048 tokens against an 8,000 tokens-per-minute free limit */
export const MAX_SCREENSHOTS = 2;

/** Display order of the lanes */
export const LANE_ORDER: readonly LaneId[] = ["scam", "ghost", "mismatch"];

/** When highlights overlap, the higher number wins the color (spec: Scam > Mismatch > Ghost) */
export const LANE_SEVERITY: Record<LaneId, number> = {
    scam: 3,
    mismatch: 2,
    ghost: 1,
};

export interface PostSignalView {
    id: string;
    lane: LaneId;
    source: "post";
    /** Exact text from the post (original casing and spacing) */
    quote: string;
    reason: string;
    /** Character range of the quote in the post text */
    start: number;
    end: number;
}

export interface ContextSignalView {
    id: string;
    lane: LaneId;
    source: "context";
    reason: string;
}

export type SignalView = PostSignalView | ContextSignalView;

export interface LaneView {
    id: LaneId;
    /** null when the lane has no signals after validation */
    strength: Strength | null;
    signals: SignalView[];
}

export interface ProcessedReport {
    postText: string;
    lanes: Record<LaneId, LaneView>;
    nextMove: NextMove;
    verificationSteps: string[];
    /** Quotes from the AI that could not be found in the post and were removed */
    droppedQuoteCount: number;
}

/** Shape of a successful response from POST /api/analyze */
export interface AnalyzeSuccessBody {
    report: ProcessedReport;
}