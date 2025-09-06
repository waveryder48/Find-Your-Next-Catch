export type PermissionedConfig = {
    sourceId: string;           // from your DB
    operatorName: string;       // for logs
    baseUrl: string;            // e.g. "https://examplelanding.com"
    listPaths: string[];        // e.g. ["/boats", "/trips"]
    listItemSelector: string;   // CSS: each card/link to detail
    detailLinkSelector: string; // CSS within card to the actual detail/booking
    throttleMs?: number;        // be polite
};
