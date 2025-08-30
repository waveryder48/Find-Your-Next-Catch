model Charter {
  id            String   @id @default(cuid())
  name          String
  port          String
  website       String   @unique
  canonicalUrl  String?  @unique
  description   String?
  variants      TripVariant[]
  sources       Source[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model TripVariant {
  id            String   @id @default(cuid())
  charterId     String
  charter       Charter  @relation(fields: [charterId], references: [id])
  durationHours Int
  isPrivate     Boolean  @default(false)
  priceFrom     Int      // store cents
  priceUnit     PriceUnit @default(trip)
  priceHistory  PriceHistory[]
}

model PriceHistory {
  id             String   @id @default(cuid())
  variantId      String
  variant        TripVariant @relation(fields: [variantId], references: [id])
  priceCents     Int
  observedAt     DateTime  @default(now())
}

model Source {
  id           String   @id @default(cuid())
  charterId    String
  charter      Charter  @relation(fields: [charterId], references: [id])
  sourceUrl    String
  canonicalUrl String?
  lastStatus   String?
  lastFetched  DateTime?
}

enum PriceUnit {
  trip
  person
}
