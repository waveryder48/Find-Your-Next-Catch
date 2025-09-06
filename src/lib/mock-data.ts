import type { ListingLite } from "./types";

export const MOCK_LISTINGS: ListingLite[] = [
    {
        id: 101,
        boatName: "Pacific Quest",
        captainName: "Capt. Reyes",
        phone: "(619) 555-0134",
        locationText: "San Diego · H&M Landing",
        landingName: "H&M Landing",
        lat: 32.7144, lng: -117.1730,
        species: ["Bluefin Tuna", "Yellowtail"],
        durationHours: 12,
        priceUSD: 325,
        bookingUrl: "https://example.com/book/pacific-quest",
        detailUrl: "https://example.com/trips/pacific-quest-12h",
        imageUrls: ["https://picsum.photos/id/1084/800/500", "https://picsum.photos/id/1011/800/500"],
        description: "12h offshore run targeting bluefin when they’re in range.",
        source: { operatorName: "Example Landing", operatorSiteUrl: "https://example.com", allowPhotos: true, allowLongCopy: true },
        isActive: true
    },
    {
        id: 102,
        boatName: "Sunset Runner",
        captainName: "Capt. Kim",
        phone: "(949) 555-0177",
        locationText: "Dana Point Harbor",
        landingName: "Dana Point Harbor",
        lat: 33.4629, lng: -117.6981,
        species: ["Calico Bass", "Halibut"],
        durationHours: 6,
        priceUSD: 189,
        bookingUrl: "https://example.com/book/sunset-runner",
        detailUrl: "https://example.com/trips/sunset-runner-halfday",
        imageUrls: ["https://picsum.photos/id/1003/800/500"],
        description: "Inshore half-day, perfect for families. Light tackle friendly.",
        source: { operatorName: "Sunset Runner Charters", operatorSiteUrl: "https://sunset-runner.example", allowPhotos: true, allowLongCopy: false },
        isActive: true
    },
    {
        id: 103,
        boatName: "Catalina Voyager",
        captainName: "Capt. Ortega",
        phone: "(562) 555-0119",
        locationText: "Long Beach · Berth 55",
        landingName: "Berth 55",
        lat: 33.7650, lng: -118.2150,
        species: ["Yellowtail", "Bonito"],
        durationHours: 10,
        priceUSD: 279,
        bookingUrl: "https://example.com/book/catalina-voyager",
        imageUrls: ["https://picsum.photos/id/1025/800/500"],
        description: "Island run with live bait. Lunch add-on available.",
        source: { operatorName: "Harbor Sportfishing", operatorSiteUrl: "https://harbor-sport.example", allowPhotos: false, allowLongCopy: false },
        isActive: true
    },
    {
        id: 104,
        boatName: "OC Flyer",
        locationText: "Newport Beach",
        landingName: "Newport Landing",
        lat: 33.6189, lng: -117.9290,
        species: ["Rockfish"],
        durationHours: 5,
        priceUSD: 129,
        bookingUrl: "https://example.com/book/oc-flyer",
        imageUrls: ["https://picsum.photos/id/1015/800/500"],
        description: "Quick morning rockfish limits when open.",
        source: { operatorName: "OC Flyer", operatorSiteUrl: "https://oc-flyer.example", allowPhotos: true, allowLongCopy: true },
        isActive: true
    },
    {
        id: 105,
        boatName: "SoCal Explorer",
        captainName: "Capt. L. Tran",
        phone: "(760) 555-0148",
        locationText: "Oceanside Harbor",
        landingName: "Oceanside Harbor",
        lat: 33.2011, lng: -117.3850,
        species: ["Mahi-Mahi", "Yellowfin Tuna", "Yellowtail"],
        durationHours: 14,
        priceUSD: 369,
        bookingUrl: "https://example.com/book/socal-explorer",
        detailUrl: "https://example.com/trips/socal-explorer-overnight",
        imageUrls: ["https://picsum.photos/id/1043/800/500"],
        description: "Bluewater hunt—when the paddies are lit, this shines.",
        source: { operatorName: "Explorer Sportfishing", operatorSiteUrl: "https://explorer.example", allowPhotos: true, allowLongCopy: true },
        isActive: true
    }
];

export const MOCK_SPECIES = [
    "Bluefin Tuna", "Yellowfin Tuna", "Yellowtail", "Mahi-Mahi", "Calico Bass", "Halibut", "Rockfish", "Bonito"
];

export const MOCK_LOCATIONS = [
    "San Diego", "Dana Point Harbor", "Long Beach", "Newport Beach", "Oceanside Harbor"
];
