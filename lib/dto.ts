import { z } from "zod";

export const TripCardDTO = z.object({
    tripId: z.string(),

    // landing
    landingName: z.string(),
    landingSlug: z.string(),
    landingWebsite: z.string().url(),
    landingCity: z.string().nullable().optional(),
    landingState: z.string().nullable().optional(),

    // vessel (optional if we can't match)
    vesselName: z.string().nullable().optional(),
    vesselWebsite: z.string().url().nullable().optional(),

    // title is the trip type or cleaned title; we’ll display as "VesselName — Title"
    title: z.string(),

    // time
    departUtc: z.string().datetime(),
    departTz: z.string(),
    returnUtc: z.string().datetime().nullable().optional(),
    durationMinutes: z.number().nullable().optional(),

    // price & availability
    priceMinCents: z.number().nullable().optional(),
    load: z.number().nullable().optional(),
    spots: z.number().nullable().optional(),
    status: z.enum(["OPEN", "SOLD_OUT", "UNKNOWN"]).default("UNKNOWN"),

    // booking & description
    bookingUrl: z.string().url(),     // per-trip booking page
    description: z.string().nullable().optional(),
});

export type TripCard = z.infer<typeof TripCardDTO>;
