"use client";

import type { RefObject } from "react";
import { LANE_META } from "@/client/components/LaneCard";
import type { Segment } from "@/shared/highlight";

interface PostViewProps {
    segments: Segment[];
    containerRef: RefObject<HTMLDivElement | null>;
    /** 0 when the post was pasted text or a sample */
    screenshotCount: number;
}

function titleFor(screenshotCount: number): string {
    if (screenshotCount === 0) return "The post";
    if (screenshotCount === 1) return "Text read from your screenshot";
    return `Text read from your ${screenshotCount} screenshots`;
}

export function PostView({ segments, containerRef, screenshotCount }: PostViewProps) {
    const fromScreenshot = screenshotCount > 0;

    return (
        <section aria-labelledby="post-view-title" className="paper-card rounded-md">
            <header className="border-b border-rule px-4 py-3 sm:px-5">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Exhibit A</p>
                <h3 id="post-view-title" className="font-serif text-lg">
                    {titleFor(screenshotCount)}
                </h3>
                <p className="mt-0.5 text-xs text-ink-soft">
                    {fromScreenshot
                        ? "Read by AI from the image. AI reading can contain small errors, so compare it with your screenshot. Lines that triggered a signal are highlighted."
                        : "Lines that triggered a signal are highlighted in their lane's color."}
                </p>
            </header>

            <div
                ref={containerRef}
                className="whitespace-pre-wrap break-words p-4 font-mono text-sm leading-7 sm:p-5 lg:max-h-[75vh] lg:overflow-x-hidden lg:overflow-y-auto"
            >
                {segments.map((segment) =>
                    segment.lane ? (
                        <mark
                            key={segment.start}
                            data-signals={segment.signalIds.join(" ")}
                            title={LANE_META[segment.lane].title}
                            className={`box-decoration-clone rounded-[2px] px-0.5 text-ink ${LANE_META[segment.lane].mark}`}
                        >
                            {segment.text}
                        </mark>
                    ) : (
                        <span key={segment.start}>{segment.text}</span>
                    ),
                )}
            </div>
        </section>
    );
}