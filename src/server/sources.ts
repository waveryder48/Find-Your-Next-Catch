import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

export async function createSource(input: {
    kind: "INTAKE_FORM" | "OPERATOR_PERMISSION" | "PUBLIC_SYNC" | "PARTNER_FEED";
    operatorName: string;
    contactEmail?: string;
    operatorSiteUrl?: string;
    proofText?: string;
    proofUrl?: string;
    permissions?: Partial<{
        allowFacts: boolean;
        allowPrices: boolean;
        allowPhotos: boolean;
        allowLongCopy: boolean;
        allowSync: boolean;
    }>;
}) {
    return prisma.source.create({
        data: {
            kind: input.kind,
            operatorName: input.operatorName,
            contactEmail: input.contactEmail,
            operatorSiteUrl: input.operatorSiteUrl,
            proofText: input.proofText,
            proofUrl: input.proofUrl,
            ...input.permissions,
        },
    });
}

export async function linkListingToSource(listingId: number, sourceId: string, role: "PRIMARY" | "SECONDARY" | "MANUAL" = "PRIMARY", notes?: string) {
    return prisma.listingSource.upsert({
        where: { listingId_sourceId: { listingId, sourceId } },
        update: { role, notes, lastSeenAt: new Date() },
        create: { listingId, sourceId, role, notes },
    });
}

export async function generatePreviewToken(sourceId: string, listingId?: number, ttlHours = 72) {
    const token = crypto.randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000);
    return prisma.previewToken.create({
        data: { token, sourceId, listingId, expiresAt },
    });
}

export async function resolvePreviewToken(token: string) {
    const pt = await prisma.previewToken.findUnique({
        where: { token },
        include: { source: true },
    });
    if (!pt) return null;
    if (pt.expiresAt.getTime() < Date.now()) return null;
    return pt;
}
