"use client";
import { useEffect, useState } from "react";
import type { LatLng } from "./geo";

export function useGeolocation() {
    const [pos, setPos] = useState<LatLng | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const request = () => {
        if (!("geolocation" in navigator)) {
            setError("Geolocation not supported");
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (p) => {
                setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
                setError(null);
                setLoading(false);
            },
            (err) => {
                setError(err.message || "Failed to get location");
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    return { pos, error, loading, request };
}
