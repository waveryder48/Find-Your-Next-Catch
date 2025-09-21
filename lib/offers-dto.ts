import { z } from "zod";

export const OfferCardDTO = z.object({
    tripId: z.string(),
    title: z.string(),
    landingName: z.string(),
    landingSlug: z.string(),
    vesselName: z.string().optional(),
    vesselSlug: z.string().optional(),

    departIso: z.string(),         // ISO string
    timezone: z.string(),          // e.g., "America/Los_Angeles"
    status: z.string(),
    spotsLeft: z.number().int().nullable(),
    load: z.number().int().nullable(),

    priceFromCents: z.number().int().nullable(), // min ADULT else any
    currency: z.string().length(3).default("USD"),
    priceIncludesFees: z.boolean(),
    serviceFeePct: z.number().nullable(),        // coerced to number

    promoSummary: z.string().optional(),         // first promo summary
    flags: z.array(z.string()).default([]),      // meals/permits/passport
});
export type OfferCardDTO = z.infer<typeof OfferCardDTO>;

