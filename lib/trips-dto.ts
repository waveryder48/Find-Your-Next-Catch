import { z } from "zod";

export const TripsCardDTO = z.object({
    tripId: z.string(),
    title: z.string(),
    landingName: z.string(),
    landingSlug: z.string(),
    vesselName: z.string().optional(),
    vesselSlug: z.string().optional(),

    departIso: z.string(),
    timezone: z.string(),

    status: z.string(),
    spotsLeft: z.number().int().nullable(),
    load: z.number().int().nullable(),

    priceFromCents: z.number().int().nullable(),
    currency: z.string().length(3).default("USD"),
    priceIncludesFees: z.boolean(),
    serviceFeePct: z.number().nullable(),

    promoSummary: z.string().optional(),
    flags: z.array(z.string()).default([]),
});
export type TripsCardDTO = z.infer<typeof TripsCardDTO>;

