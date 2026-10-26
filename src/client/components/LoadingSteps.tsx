"use client";

import { useEffect, useState } from "react";

// Fast enough that all three steps show during a typical 1-1.5 second check
const STEP_MS = 450;

interface LoadingStepsProps {
    /** 0 for pasted text or samples */
    screenshotCount: number;
}

function firstStepLabel(screenshotCount: number): string {
    if (screenshotCount === 0) return "Reading the post";
    if (screenshotCount === 1) return "Reading the screenshot";
    return `Reading your ${screenshotCount} screenshots`;
}

export function LoadingSteps({ screenshotCount }: LoadingStepsProps) {
    const steps = [firstStepLabel(screenshotCount), "Looking for signals", "Checking quotes"];
    const lastIndex = steps.length - 1;
    const [active, setActive] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => {
            setActive((current) => Math.min(current + 1, lastIndex));
        }, STEP_MS);
        return () => window.clearInterval(id);
    }, [lastIndex]);

    return (
        <div role="status" aria-live="polite" className="paper-card rounded-md p-5">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">Working on it</p>
            <ol className="mt-3 space-y-2.5 font-mono text-sm">
                {steps.map((step, index) => {
                    const done = index < active;
                    const current = index === active;
                    return (
                        <li
                            key={step}
                            className={`flex items-center gap-3 ${index > active ? "text-ink-soft/60" : ""}`}
                        >
                            <span
                                aria-hidden="true"
                                className="grid size-5 shrink-0 place-items-center rounded-full border border-ink text-[11px]"
                            >
                                {done ? "✓" : current ? <span className="size-2 animate-pulse rounded-full bg-ink" /> : null}
                            </span>
                            <span>
                                {step}
                                {current ? "…" : ""}
                            </span>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}