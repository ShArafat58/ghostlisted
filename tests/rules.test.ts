import { describe, expect, it } from "vitest";
import { buildReport, nextMove, validateQuotes } from "@/shared/rules";
import type { AnalyzeResponse } from "@/shared/schema";

type RawLane = AnalyzeResponse["lanes"]["scam"];

const POST = `Graduate Trainee (Fresher)
Minimum   3 years of experience.
Salary: Negotiable, based on experience.`;

const emptyLane = (): RawLane => ({ strength: "low", signals: [] });

function makeLanes(overrides: Partial<AnalyzeResponse["lanes"]>): AnalyzeResponse["lanes"] {
    return { scam: emptyLane(), ghost: emptyLane(), mismatch: emptyLane(), ...overrides };
}

describe("validateQuotes", () => {
    it("keeps a quote that differs only in whitespace and case, showing the original text", () => {
        const { lanes, droppedQuoteCount } = validateQuotes(
            makeLanes({
                mismatch: {
                    strength: "high",
                    signals: [{ source: "post", quote: "minimum 3 years of experience.", reason: "Senior requirement." }],
                },
            }),
            POST,
        );

        expect(droppedQuoteCount).toBe(0);
        const signal = lanes.mismatch.signals[0];
        expect(signal.source).toBe("post");
        if (signal.source === "post") {
            expect(signal.quote).toBe("Minimum   3 years of experience.");
        }
    });

    it("drops a quote that does not exist in the post", () => {
        const { lanes, droppedQuoteCount } = validateQuotes(
            makeLanes({
                mismatch: {
                    strength: "high",
                    signals: [{ source: "post", quote: "5 years of leadership", reason: "Invented." }],
                },
            }),
            POST,
        );

        expect(droppedQuoteCount).toBe(1);
        expect(lanes.mismatch.signals).toHaveLength(0);
    });

    it("drops a quote whose punctuation does not match", () => {
        const { droppedQuoteCount } = validateQuotes(
            makeLanes({
                ghost: {
                    strength: "low",
                    signals: [{ source: "post", quote: "Salary: Negotiable based on experience.", reason: "Missing comma." }],
                },
            }),
            POST,
        );

        expect(droppedQuoteCount).toBe(1);
    });

    it("keeps context signals without checking for a quote", () => {
        const { lanes } = validateQuotes(
            makeLanes({
                ghost: { strength: "medium", signals: [{ source: "context", reason: "Reposted for months." }] },
            }),
            POST,
        );

        expect(lanes.ghost.signals).toEqual([
            { id: "ghost-0", lane: "ghost", source: "context", reason: "Reposted for months." },
        ]);
        expect(lanes.ghost.strength).toBe("medium");
    });

    it("removes the strength of a lane left with no signals", () => {
        const { lanes } = validateQuotes(
            makeLanes({
                scam: {
                    strength: "high",
                    signals: [{ source: "post", quote: "Pay a fee now", reason: "Invented." }],
                },
            }),
            POST,
        );

        expect(lanes.scam.strength).toBeNull();
    });

    it("keeps a quote repeated in two lanes only in the higher-severity lane", () => {
        const { lanes, droppedQuoteCount } = validateQuotes(
            makeLanes({
                ghost: {
                    strength: "low",
                    signals: [{ source: "post", quote: "Salary: Negotiable, based on experience.", reason: "Vague pay." }],
                },
                mismatch: {
                    strength: "high",
                    signals: [
                        { source: "post", quote: "salary: negotiable,  based on experience.", reason: "Pay tied to experience." },
                    ],
                },
            }),
            POST,
        );

        expect(lanes.mismatch.signals).toHaveLength(1);
        expect(lanes.ghost.signals).toHaveLength(0);
        expect(lanes.ghost.strength).toBeNull();
        // A repeated quote is real, so it is not counted as an invented one
        expect(droppedQuoteCount).toBe(0);
    });
});

describe("nextMove", () => {
    const lanes = (scam: string | null, ghost: string | null, mismatch: string | null) =>
        ({
            scam: { strength: scam },
            ghost: { strength: ghost },
            mismatch: { strength: mismatch },
        }) as Parameters<typeof nextMove>[0];

    it("returns Skip when scam is high", () => {
        expect(nextMove(lanes("high", null, null))).toBe("Skip");
    });

    it("returns Verify first when any lane is medium or high", () => {
        expect(nextMove(lanes(null, "medium", null))).toBe("Verify first");
        expect(nextMove(lanes("medium", null, "low"))).toBe("Verify first");
        expect(nextMove(lanes("low", null, "high"))).toBe("Verify first");
    });

    it("returns Apply when every lane is low or empty", () => {
        expect(nextMove(lanes("low", "low", null))).toBe("Apply");
        expect(nextMove(lanes(null, null, null))).toBe("Apply");
    });
});

describe("buildReport", () => {
    it("validates quotes, then computes the next move from the validated lanes", () => {
        const report = buildReport(
            {
                isJobPost: true,
                extractedText: "",
                lanes: makeLanes({
                    mismatch: {
                        strength: "high",
                        signals: [
                            { source: "post", quote: "Minimum 3 years of experience.", reason: "Senior requirement." },
                        ],
                    },
                    scam: {
                        strength: "high",
                        signals: [{ source: "post", quote: "Send your bank details", reason: "Invented." }],
                    },
                }),
                verificationSteps: ["Check the careers page.", "Ask for a requisition ID."],
            },
            POST,
        );

        expect(report.lanes.scam.strength).toBeNull();
        expect(report.nextMove).toBe("Verify first");
        expect(report.droppedQuoteCount).toBe(1);
        expect(report.postText).toBe(POST);
    });
});