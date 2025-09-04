// src/components/BackButton.tsx
"use client";

import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function BackButton({ className }: { className?: string }) {
    const router = useRouter();
    return (
        <button
            onClick={() => router.back()}
            className={clsx(
                "inline-flex items-center gap-2 rounded-lg border border-black bg-white px-3 py-1.5 text-sm hover:bg-gray-100 transition",
                className
            )}
            aria-label="Go back"
        >
            ← Back
        </button>
    );
}
