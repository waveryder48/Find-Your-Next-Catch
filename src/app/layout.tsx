import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Find Your Next Catch",
    description: "Browse Southern California sportfishing charters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body
                className="min-h-screen bg-fixed bg-cover bg-top text-slate-900"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.55), rgba(255,255,255,0.35)), url('/images/ocean-bg.jpg')",
                }}
            >
                <div className="mx-auto max-w-6xl p-4 md:p-8">
                    <div className="rounded-2xl bg-white/70 backdrop-blur-md shadow-lg">
                        {children}
                    </div>
                </div>
            </body>

            {/* Optional centered content shell with a soft, readable surface */}
            <div className="mx-auto max-w-6xl p-4 md:p-8">
                <div className="rounded-2xl bg-white/70 backdrop-blur-md shadow-lg">
                    {children}
                </div>
            </div>
        </body>
        </html >
    );
}
