import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service.js';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface NearbyAddress {
  id: string;
  userId: string;
  street?: string;
  city?: string;
  distance: number; // in km
}

export interface DistanceResult {
  distance: number; // in km
}

export interface AddressWithDistance {
  id: string;
  street?: string;
  city?: string;
  distance: number;
}

@Injectable()
export class GeospatialService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find addresses within a specified radius
   * @param centerPoint Center point (latitude, longitude)
   * @param radiusKm Search radius in kilometers
   * @returns Addresses sorted by distance
   */
  async findNearby(centerPoint: GeoPoint, radiusKm: number) {
    const radiusMeters = radiusKm * 1000;
    const pointWkt = `POINT(${centerPoint.longitude} ${centerPoint.latitude})`;

    const results = await this.prisma.$queryRaw<NearbyAddress[]>`
      SELECT
        "id",
        "userId",
        "street",
        "city",
        (ST_Distance(location, ST_GeogFromText(${pointWkt})) / 1000)::numeric AS distance
      FROM "Address"
      WHERE ST_DWithin(
        location,
        ST_GeogFromText(${pointWkt}),
        ${radiusMeters}
      )
      ORDER BY distance ASC
    `;

    return results;
  }

  /**
   * Calculate distance between two addresses
   * @param addressId1 First address ID
   * @param addressId2 Second address ID
   * @returns Distance in kilometers
   */
  async calculateDistance(addressId1: string, addressId2: string): Promise<number> {
    const result = await this.prisma.$queryRaw<DistanceResult[]>`
      SELECT
        (ST_Distance(a1.location, a2.location) / 1000)::numeric AS distance
      FROM "Address" a1, "Address" a2
      WHERE a1."id" = ${addressId1} AND a2."id" = ${addressId2}
    `;

    if (result.length === 0) {
      return 0;
    }

    return Number(result[0].distance);
  }

  /**
   * Calculate distance from a point to an address
   * @param addressId Address ID
   * @param point Reference point (latitude, longitude)
   * @returns Distance in kilometers
   */
  async calculateDistanceFromPoint(addressId: string, point: GeoPoint): Promise<number> {
    const pointWkt = `POINT(${point.longitude} ${point.latitude})`;

    const result = await this.prisma.$queryRaw<DistanceResult[]>`
      SELECT
        (ST_Distance(location, ST_GeogFromText(${pointWkt})) / 1000)::numeric AS distance
      FROM "Address"
      WHERE "id" = ${addressId}
    `;

    if (result.length === 0) {
      return 0;
    }

    return Number(result[0].distance);
  }

  /**
   * Find addresses within a polygon (region)
   * @param polygon WKT polygon string e.g., 'POLYGON((-74.1 40.6, -74.1 40.8, -73.9 40.8, -73.9 40.6, -74.1 40.6))'
   * @returns Addresses within the polygon
   */
  async findInPolygon(polygon: string) {
    const results = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "Address"
      WHERE ST_Contains(
        ST_GeomFromText(${polygon}),
        location
      )
    `;

    return results;
  }

  /**
   * Find nearest address to a point
   * @param point Reference point (latitude, longitude)
   * @returns Nearest address
   */
  async findNearest(point: GeoPoint) {
    const pointWkt = `POINT(${point.longitude} ${point.latitude})`;

    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM "Address"
      WHERE location IS NOT NULL
      ORDER BY ST_Distance(location, ST_GeogFromText(${pointWkt})) ASC
      LIMIT 1
    `;

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Find all addresses and their distance from a reference point
   * @param point Reference point (latitude, longitude)
   * @returns Addresses sorted by distance
   */
  async findAllWithDistance(point: GeoPoint) {
    const pointWkt = `POINT(${point.longitude} ${point.latitude})`;

    const results = await this.prisma.$queryRaw<AddressWithDistance[]>`
      SELECT
        "id",
        "street",
        "city",
        (ST_Distance(location, ST_GeogFromText(${pointWkt})) / 1000)::numeric AS distance
      FROM "Address"
      WHERE location IS NOT NULL
      ORDER BY ST_Distance(location, ST_GeogFromText(${pointWkt})) ASC
    `;

    return results;
  }

  /**
   * Create a GeoJSON Point from latitude and longitude
   */
  static createPoint(latitude: number, longitude: number) {
    return {
      type: 'Point',
      coordinates: [longitude, latitude],
    };
  }

  /**
   * Validate if coordinates are valid
   */
  static isValidCoordinates(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }
}
