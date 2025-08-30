"use client";

import React from "react";

type PriceUnit = "trip" | "person";

export type TripVariant = {
    id: string;
    durationHours: number;
    isPrivate?: boolean | null;
    priceFrom?: number | null;      // cents
    priceUnit?: PriceUnit | null;   // default "person" for open party
    lastObservedAt?: string | Date; // ISO
    seatsAvailable?: number | null; // optional if you scrape it
};

export type TripCardProps = {
    charterName: string;
    port?: string;
    description?: string;
    website?: string;          // external booking/site link
    canonicalUrl?: string;     // internal details page
    species?: string[];        // optional: tuna, yellowtail, etc.
    seasonTags?: string[];     // optional: "Fall", "Summer", etc.
    variants: TripVariant[];
    updatedAt?: string | Date; // when this charter was refreshed
};

function formatPriceCents(cents?: number | null) {
    if (cents == null) return null;
    return `$${Math.round(cents / 100).toLocaleString()}`;
}

function durationRange(variants: TripVariant[]) {
    const durs = variants
        .map(v => v.durationHours)
        .filter((n): n is number => Number.isFinite(n));
    if (!durs.length) return null;
    const min = Math.min(...durs);
    const max = Math.max(...durs);
    if (min === max) return `${min} hr`;
    return `${min}–${max} hr typical`;
}

function earliestPrice(variants: TripVariant[]) {
    // choose the lowest visible price to show "from"
    const prices = variants
        .map(v => (v.priceFrom ?? undefined))
        .filter((n): n is number => Number.isFinite(n));
    if (!prices.length) return null;
    return Math.min(...prices);
}

function inferIsPrivateDefault(variants: TripVariant[]) {
    // default to Open Party unless *all* variants say private
    const anyPublic = variants.some(v => !v.isPrivate);
    return !anyPublic; // if any public -> false; else true
}

function anyRecent(when?: string | Date, minutes = 60) {
    if (!when) return false;
    const t = typeof when === "string" ? new Date(when).getTime() : when.getTime();
    return Date.now() - t < minutes * 60 * 1000;
}

function RelativeTime({ when }: { when?: string | Date }) {
    if (!when) return null;
    const d = typeof when === "string" ? new Date(when) : when;
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    const label =
        mins < 1 ? "just now" :
            mins < 60 ? `${mins}m ago` :
                hours < 24 ? `${hours}h ago` : `${days}d ago`;
    return <span title={d.toLocaleString()} className="text-xs text-gray-500">{label}</span>;
}

export default function TripCard({
    charterName,
    port,
    description,
    website,
    canonicalUrl,
    species = [],
    seasonTags = [],
    variants,
    updatedAt,
}: TripCardProps) {
    const assumedPrivate = inferIsPrivateDefault(variants);
    const isOpenParty = !assumedPrivate;
    const dur = durationRange(variants);
    const minPrice = earliestPrice(variants);
    const priceStr = formatPriceCents(minPrice);
    const priceUnit: PriceUnit = (variants.find(v => v.priceUnit)?.priceUnit ?? (isOpenParty ? "person" : "trip")) as PriceUnit;

    return (
        <div className="rounded-2xl border bg-white/70 shadow-sm backdrop-blur p-4 hover:shadow-md transition">
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <a href={canonicalUrl ?? "#"} className="text-base font-semibold hover:underline">
                            {charterName}
                        </a>
                        {port && <span className="text-sm text-gray-600">• {port}</span>}
                        <Badge variant={isOpenParty ? "green" : "amber"}>
                            {isOpenParty ? "Open Party" : "Private Charter"}
                        </Badge>
                        {anyRecent(updatedAt) && <LiveDot />}
                    </div>

                    {description && (
                        <p className="mt-1 text-sm text-gray-700 line-clamp-2">{description}</p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                        {dur && (
                            <Badge title="Trip length may flex by bite, weather, or season.">
                                {dur}
                            </Badge>
                        )}
                        {species.slice(0, 4).map(sp => (
                            <Badge key={sp}>{sp}</Badge>
                        ))}
                        {seasonTags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="sky">{tag}</Badge>
                        ))}
                    </div>
                </div>

                <div className="min-w-[140px] text-right">
                    <div className="text-sm text-gray-500">from</div>
                    <div className="text-2xl font-bold leading-6">
                        {priceStr ? priceStr : "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                        {priceStr ? (priceUnit === "person" ? "per person" : "per trip") : "price varies"}
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-2">
                        {website && (
                            <a
                                href={website}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                                Book
                            </a>
                        )}
                        {canonicalUrl && (
                            <a
                                href={canonicalUrl}
                                className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                                Details
                            </a>
                        )}
                    </div>

                    <div className="mt-2 text-right">
                        <RelativeTime when={updatedAt} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Badge({
    children,
    variant,
    title,
}: {
    children: React.ReactNode;
    variant?: "green" | "amber" | "sky" | "gray";
    title?: string;
}) {
    const styles: Record<string, string> = {
        green: "border-green-200 text-green-700 bg-green-50",
        amber: "border-amber-200 text-amber-800 bg-amber-50",
        sky: "border-sky-200 text-sky-700 bg-sky-50",
        gray: "border-gray-200 text-gray-700 bg-gray-50",
    };
    return (
        <span
            title={title}
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${styles[variant ?? "gray"]}`}
        >
            {children}
        </span>
    );
}

function LiveDot() {
    return (
        <span className="inline-flex items-center gap-1 text-xs text-gray-600">
            <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Live
        </span>
    );
}
