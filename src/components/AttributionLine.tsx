import type { SourceMini } from "@/lib/types";

export default function AttributionLine({
    source, listingId, showChangeLink = true
}: { source?: SourceMini | null; listingId: number; showChangeLink?: boolean }) {
    if (!source) return null;
    return (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="opacity-80">Source:</span>
            {source.operatorSiteUrl ? (
                <a className="underline hover:no-underline" href={source.operatorSiteUrl} target="_blank" rel="noopener noreferrer">
                    {source.operatorName}
                </a>
            ) : (
                <span>{source.operatorName}</span>
            )}
            {showChangeLink && (
                <>
                    <span className="opacity-50">·</span>
                    <a className="underline hover:no-underline" href={`/request-change?listing=${listingId}`}>
                        Request changes
                    </a>
                </>
            )}
        </div>
    );
}
