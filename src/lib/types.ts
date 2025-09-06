export type SourceMini = {
    operatorName: string;
    operatorSiteUrl?: string | null;
    allowPhotos?: boolean;
    allowLongCopy?: boolean;
};

export type ListingLite = {
    id: number;
    boatName: string;
    captainName?: string;
    phone?: string;
    locationText?: string;   // e.g., "San Diego · H&M Landing"
    landingName?: string;    // e.g., "H&M Landing"
    lat?: number;            // landing latitude
    lng?: number;            // landing longitude
    species: string[];
    durationHours?: number;
    priceUSD?: number;
    bookingUrl: string;
    detailUrl?: string;
    imageUrls: string[];
    description?: string;
    source?: SourceMini | null;
    isActive?: boolean;
};
