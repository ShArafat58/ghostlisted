"use client";

import { useMemo, useRef, useState } from "react";
import { LaneCard } from "@/client/components/LaneCard";
import { NextMoveStamp } from "@/client/components/NextMoveStamp";
import { PostView } from "@/client/components/PostView";
import { buildSegments, highlightRanges } from "@/shared/highlight";
import { LANE_ORDER, type ProcessedReport } from "@/shared/types";

interface ReportViewProps {
    report: ProcessedReport;
    screenshotCount: number;
    savedExample: boolean;
    onReset: () => void;
}

export function ReportView({ report, screenshotCount, savedExample, onReset }: ReportViewProps) {
    const postRef = useRef<HTMLDivElement>(null);
    const [activeSignalId, setActiveSignalId] = useState<string | null>(null);

    const segments = useMemo(
        () => buildSegments(report.postText, highlightRanges(report)),
        [report],
    );

    function handleSignalClick(signalId: string) {
        setActiveSignalId(signalId);

        const container = postRef.current;
        if (!container) return;

        const marks = container.querySelectorAll<HTMLElement>(
            `[data-signals~="${CSS.escape(signalId)}"]`,
        );
        if (marks.length === 0) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        marks[0].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });

        marks.forEach((mark) => {
            mark.classList.remove("mark-pulse");
            void mark.offsetWidth; // restart the animation
            mark.classList.add("mark-pulse");
        });
        window.setTimeout(() => marks.forEach((mark) => mark.classList.remove("mark-pulse")), 2400);
    }

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Findings</p>
                    <h2 className="font-serif text-3xl">The report</h2>
                </div>
                <button
                    type="button"
                    onClick={onReset}
                    className="rounded-md border-[1.5px] border-ink bg-card px-4 py-2 text-sm font-medium shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-y-0.5"
                >
                    Check another post
                </button>
            </div>

            {savedExample && (
                <div
                    role="note"
                    className="mb-6 rounded-md border-[1.5px] border-dashed border-ink bg-paper-deep px-4 py-3"
                >
                    <p className="font-mono text-xs uppercase tracking-[0.2em]">Saved example result</p>
                    <p className="mt-1 text-sm text-ink-soft">
                        The AI service didn&apos;t respond, so this is a result captured earlier from a real run
                        of this sample with its default answers.
                    </p>
                </div>
            )}

            {/* Mobile: stamp, lanes, then post. Desktop: post left, stamp + lanes right. */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="space-y-6 lg:col-start-2 lg:row-start-1">
                    <NextMoveStamp move={report.nextMove} steps={report.verificationSteps} />
                    {LANE_ORDER.map((laneId) => (
                        <LaneCard
                            key={laneId}
                            lane={report.lanes[laneId]}
                            activeSignalId={activeSignalId}
                            onSignalClick={handleSignalClick}
                        />
                    ))}
                </div>

                <div className="lg:col-start-1 lg:row-start-1">
                    <div className="lg:sticky lg:top-6">
                        <PostView segments={segments} containerRef={postRef} screenshotCount={screenshotCount} />
                    </div>
                </div>
            </div>

            <div className="mt-8 space-y-1 text-xs text-ink-soft">
                {report.droppedQuoteCount > 0 && (
                    <p>
                        {report.droppedQuoteCount === 1
                            ? "1 quote from the AI could not be found in the post, so it was left out."
                            : `${report.droppedQuoteCount} quotes from the AI could not be found in the post, so they were left out.`}
                    </p>
                )}
                <p>Signals, not verdicts. A post can&apos;t prove what a company decides internally.</p>
            </div>
        </div>
    );
}