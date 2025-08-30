import { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
    return <div className="rounded-2xl border bg-white/60 shadow-sm backdrop-blur p-4" > {children} </div>;
}
export function CardTitle({ children }: { children: ReactNode }) {
    return <h3 className="text-lg font-semibold" > {children} </h3>;
}
export function CardMeta({ children }: { children: ReactNode }) {
    return <div className="mt-1 text-sm text-gray-500" > {children} </div>;
}
export function Badge({ children }: { children: ReactNode }) {
    return <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs" > {children} </span>;
}
