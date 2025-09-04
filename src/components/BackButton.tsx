// src/components/BackButton.tsx
"use client";

import { useRouter } from "next/navigation";
import React from "react";

type Props = {
    className?: string;
    label?: string;
};

export default function BackButton({ className = "", label = "Back" }: Props) {
    const router = useRouter();

    const base =
        "inline-flex items-center gap-2 rounded-lg border border-black px-3 py-1.5 " +
        "bg-white text-black hover:bg-gray-50 transition";

    return (
        <button
            type="button"
            onClick={() => router.back()}
            className={`${base} ${className}`}
            aria-label="Go back"
        >
            ← {label}
        </button>
    );
}
