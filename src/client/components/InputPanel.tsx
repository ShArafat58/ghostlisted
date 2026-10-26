"use client";

import { useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import type { SamplePost } from "@/shared/data/samples";
import { MAX_SCREENSHOTS } from "@/shared/types";

export type InputTab = "text" | "image" | "sample";

const TABS: { id: InputTab; label: string }[] = [
    { id: "text", label: "Paste text" },
    { id: "image", label: "Upload screenshot" },
    { id: "sample", label: "Try a sample" },
];

const MIN_CHARS = 80;
const MAX_CHARS = 8000;

interface InputPanelProps {
    tab: InputTab;
    onTabChange: (tab: InputTab) => void;
    text: string;
    onTextChange: (text: string) => void;
    files: File[];
    fileError: string | null;
    onAddFiles: (files: File[]) => void;
    onRemoveFile: (index: number) => void;
    samples: SamplePost[];
    sampleId: SamplePost["id"] | null;
    onSampleChange: (id: SamplePost["id"]) => void;
}

export function InputPanel({
    tab,
    onTabChange,
    text,
    onTextChange,
    files,
    fileError,
    onAddFiles,
    onRemoveFile,
    samples,
    sampleId,
    onSampleChange,
}: InputPanelProps) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    function handleTabKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const current = TABS.findIndex((t) => t.id === tab);
        const step = event.key === "ArrowRight" ? 1 : -1;
        const next = (current + step + TABS.length) % TABS.length;
        onTabChange(TABS[next].id);
        tabRefs.current[next]?.focus();
    }

    return (
        <div>
            <div
                role="tablist"
                aria-label="How do you want to share the post?"
                className="flex flex-wrap gap-1.5 pl-2"
                onKeyDown={handleTabKeyDown}
            >
                {TABS.map((t, index) => {
                    const selected = t.id === tab;
                    return (
                        <button
                            key={t.id}
                            ref={(el) => {
                                tabRefs.current[index] = el;
                            }}
                            id={`tab-${t.id}`}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-controls={`panel-${t.id}`}
                            tabIndex={selected ? 0 : -1}
                            onClick={() => onTabChange(t.id)}
                            className={`relative -mb-[1.5px] rounded-t-md border-[1.5px] border-b-0 border-ink px-4 py-2 text-sm font-medium transition-colors ${selected ? "z-10 bg-card" : "bg-paper-deep text-ink-soft hover:text-ink"
                                }`}
                        >
                            {t.label}
                        </button>
                    );
                })}
            </div>

            <div
                id={`panel-${tab}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
                className="paper-card rounded-md p-4 sm:p-5"
            >
                {tab === "text" && <TextPanel text={text} onTextChange={onTextChange} />}
                {tab === "image" && (
                    <ImagePanel
                        files={files}
                        error={fileError}
                        onAddFiles={onAddFiles}
                        onRemoveFile={onRemoveFile}
                    />
                )}
                {tab === "sample" && (
                    <SamplePanel samples={samples} sampleId={sampleId} onSampleChange={onSampleChange} />
                )}
            </div>
        </div>
    );
}

function TextPanel({
    text,
    onTextChange,
}: {
    text: string;
    onTextChange: (text: string) => void;
}) {
    const length = text.length;
    const tooShort = length > 0 && length < MIN_CHARS;

    return (
        <div>
            <label htmlFor="post-text" className="sr-only">
                Job post text
            </label>
            <textarea
                id="post-text"
                value={text}
                onChange={(event) => onTextChange(event.target.value)}
                maxLength={MAX_CHARS}
                rows={10}
                placeholder="Paste the full job post here — English or Bengali."
                className="block w-full resize-y rounded-sm border border-rule bg-paper/40 p-3 font-mono text-sm leading-relaxed placeholder:text-ink-soft/70 focus:border-ink focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between font-mono text-xs text-ink-soft">
                <span aria-live="polite">
                    {tooShort ? `At least ${MIN_CHARS} characters for a fair read.` : "\u00a0"}
                </span>
                <span>
                    {length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
            </div>
        </div>
    );
}

function ImagePanel({
    files,
    error,
    onAddFiles,
    onRemoveFile,
}: {
    files: File[];
    error: string | null;
    onAddFiles: (files: File[]) => void;
    onRemoveFile: (index: number) => void;
}) {
    const [dragging, setDragging] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);

    useEffect(() => {
        const urls = files.map((file) => URL.createObjectURL(file));
        setPreviews(urls);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [files]);

    const canAddMore = files.length < MAX_SCREENSHOTS;
    const isFirst = files.length === 0;

    function handleDrop(event: DragEvent<HTMLLabelElement>) {
        event.preventDefault();
        setDragging(false);
        const dropped = Array.from(event.dataTransfer.files ?? []);
        if (dropped.length > 0) onAddFiles(dropped);
    }

    return (
        <div className="space-y-3">
            {files.length > 0 && (
                <ol className="grid gap-3 sm:grid-cols-2" aria-label="Screenshots in reading order">
                    {files.map((file, index) => (
                        <li
                            key={`${file.name}-${file.lastModified}-${index}`}
                            className="flex items-center gap-3 rounded-sm border border-rule bg-paper/40 p-3"
                        >
                            <span
                                aria-hidden="true"
                                className="grid size-7 shrink-0 place-items-center rounded-full bg-ink font-mono text-xs text-paper"
                            >
                                {index + 1}
                            </span>
                            {previews[index] && (
                                // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
                                <img
                                    src={previews[index]}
                                    alt={`Screenshot ${index + 1} of the job post`}
                                    className="h-20 w-16 shrink-0 rounded-sm border border-ink/20 object-cover object-top"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-xs">{file.name}</p>
                                <p className="font-mono text-[11px] text-ink-soft">
                                    {(file.size / 1024).toFixed(0)} KB · {index === 0 ? "top of the post" : "continues the post"}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => onRemoveFile(index)}
                                    aria-label={`Remove screenshot ${index + 1}`}
                                    className="mt-1.5 rounded-sm border border-ink px-2.5 py-1 text-xs hover:bg-paper-deep"
                                >
                                    Remove
                                </button>
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {canAddMore && (
                <label
                    onDragOver={(event) => {
                        event.preventDefault();
                        setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-4 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink ${isFirst ? "py-12" : "py-6"
                        } ${dragging ? "border-ink bg-paper-deep" : "border-ink/40 bg-paper/40 hover:bg-paper-deep/60"}`}
                >
                    <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => {
                            const picked = Array.from(event.target.files ?? []);
                            if (picked.length > 0) onAddFiles(picked);
                            event.target.value = "";
                        }}
                    />
                    <span className="font-serif text-lg">
                        {isFirst ? "Drop a screenshot of the post" : "Add the rest of the post"}
                    </span>
                    <span className="text-sm text-ink-soft">
                        {isFirst
                            ? `or click to choose. Long post? Add up to ${MAX_SCREENSHOTS} screenshots, top part first.`
                            : "Optional: a second screenshot if the post continues."}
                    </span>
                    <span className="mt-1 font-mono text-xs text-ink-soft">
                        JPG, PNG, or WebP · up to 4 MB each
                    </span>
                </label>
            )}

            {error && (
                <p role="alert" className="rounded-sm border border-stamp-skip/60 bg-stamp-skip/5 px-3 py-2 text-sm">
                    {error}
                </p>
            )}
        </div>
    );
}

function SamplePanel({
    samples,
    sampleId,
    onSampleChange,
}: {
    samples: SamplePost[];
    sampleId: SamplePost["id"] | null;
    onSampleChange: (id: SamplePost["id"]) => void;
}) {
    return (
        <fieldset>
            <legend className="mb-3 text-sm text-ink-soft">
                Fictional posts from invented companies, ready to check.
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
                {samples.map((sample) => (
                    <label
                        key={sample.id}
                        className="flex cursor-pointer flex-col gap-2 rounded-sm border-[1.5px] border-ink/30 bg-paper/40 p-3 transition-colors hover:border-ink has-checked:border-ink has-checked:bg-paper-deep has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
                    >
                        <input
                            type="radio"
                            name="sample-post"
                            value={sample.id}
                            checked={sampleId === sample.id}
                            onChange={() => onSampleChange(sample.id)}
                            className="sr-only"
                        />
                        <span className="w-fit rounded-full border border-ink/50 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide">
                            {sample.kindLabel}
                        </span>
                        <span className="font-serif text-base leading-snug">{sample.title}</span>
                        <span className="text-xs text-ink-soft">{sample.company} (fictional)</span>
                        <span className="line-clamp-3 font-mono text-xs text-ink-soft">{sample.text}</span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}