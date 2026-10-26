import { findQuoteRange, normalizeForMatch } from "@/shared/highlight";
import type { AnalyzeResponse } from "@/shared/schema";
import {
    LANE_ORDER,
    LANE_SEVERITY,
    type LaneId,
    type LaneView,
    type NextMove,
    type ProcessedReport,
    type SignalView,
    type Strength,
} from "@/shared/types";

export interface ValidatedLanes {
    lanes: Record<LaneId, LaneView>;
    droppedQuoteCount: number;
}

/**
 * If the same quote (whitespace and case ignored) appears in more than one lane,
 * keep it only in the higher-severity lane (Scam > Mismatch > Ghost).
 * A quote repeated inside one lane is also kept once. Context signals are untouched.
 */
export function dedupeQuotesAcrossLanes(
    signalsByLane: Record<LaneId, SignalView[]>,
): Record<LaneId, SignalView[]> {
    const owner = new Map<string, LaneId>();

    for (const laneId of LANE_ORDER) {
        for (const signal of signalsByLane[laneId]) {
            if (signal.source !== "post") continue;
            const key = normalizeForMatch(signal.quote);
            const current = owner.get(key);
            if (!current || LANE_SEVERITY[laneId] > LANE_SEVERITY[current]) {
                owner.set(key, laneId);
            }
        }
    }

    const seen = new Set<string>();
    const result = {} as Record<LaneId, SignalView[]>;

    for (const laneId of LANE_ORDER) {
        result[laneId] = signalsByLane[laneId].filter((signal) => {
            if (signal.source !== "post") return true;
            const key = normalizeForMatch(signal.quote);
            if (owner.get(key) !== laneId || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    return result;
}

/**
 * Keeps a "post" signal only if its quote exists in the post text
 * (whitespace and case ignored, punctuation exact). "context" signals are kept as they are.
 * Then removes quotes repeated across lanes. A lane left with no signals has no strength.
 */
export function validateQuotes(rawLanes: AnalyzeResponse["lanes"], postText: string): ValidatedLanes {
    let droppedQuoteCount = 0;
    const kept = {} as Record<LaneId, SignalView[]>;

    for (const laneId of LANE_ORDER) {
        const signals: SignalView[] = [];

        rawLanes[laneId].signals.forEach((signal, index) => {
            const id = `${laneId}-${index}`;

            if (signal.source === "context") {
                signals.push({ id, lane: laneId, source: "context", reason: signal.reason });
                return;
            }

            const range = findQuoteRange(postText, signal.quote);
            if (!range) {
                droppedQuoteCount += 1;
                return;
            }

            signals.push({
                id,
                lane: laneId,
                source: "post",
                quote: postText.slice(range.start, range.end),
                reason: signal.reason,
                start: range.start,
                end: range.end,
            });
        });

        kept[laneId] = signals;
    }

    const deduped = dedupeQuotesAcrossLanes(kept);
    const lanes = {} as Record<LaneId, LaneView>;

    for (const laneId of LANE_ORDER) {
        const signals = deduped[laneId];
        lanes[laneId] = {
            id: laneId,
            strength: signals.length > 0 ? rawLanes[laneId].strength : null,
            signals,
        };
    }

    return { lanes, droppedQuoteCount };
}

/** Skip if scam is High; Verify first if any lane is Medium or High; otherwise Apply. */
export function nextMove(lanes: Record<LaneId, { strength: Strength | null }>): NextMove {
    if (lanes.scam.strength === "high") return "Skip";

    const anyConcern = LANE_ORDER.some((laneId) => {
        const strength = lanes[laneId].strength;
        return strength === "medium" || strength === "high";
    });

    return anyConcern ? "Verify first" : "Apply";
}

/** Turns a raw, schema-valid AI reply into the report the UI shows. */
export function buildReport(raw: AnalyzeResponse, postText: string): ProcessedReport {
    const { lanes, droppedQuoteCount } = validateQuotes(raw.lanes, postText);
    return {
        postText,
        lanes,
        nextMove: nextMove(lanes),
        verificationSteps: raw.verificationSteps,
        droppedQuoteCount,
    };
}