export type Platform =
    | "FRN"
    | "FAREHARBOR"
    | "XOLA"
    | "VIRTUAL"
    | "UNKNOWN";

export type ExtractedPriceTier = {
    type: "ADULT" | "JUNIOR" | "SENIOR" | "MILITARY" | "STUDENT" | "OTHER";
    label: string;
    priceCents: number;
    currency?: "USD";
};

export type ExtractedTrip = {
    sourceUrl: string;
    sourceItemId?: string | null;
    title: string;
    departLocal: Date;
    returnLocal?: Date | null;
    timezone?: string;
    status?: string;
    load?: number | null;
    spots?: number | null;
    notes?: string | null;
    priceIncludesFees?: boolean;
    serviceFeePct?: number | null;
    priceTiers: ExtractedPriceTier[];
    promoSummary?: string | null;
    flags?: string[];
};
