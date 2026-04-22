export class GeolocationUtil {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param lat1 Office latitude
   * @param lon1 Office longitude
   * @param lat2 User latitude
   * @param lon2 User longitude
   * @returns Distance in meters
   */
  static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) *
        Math.cos(φ2) *
        Math.sin(Δλ / 2) *
        Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if user is within office radius
   */
  static isWithinRadius(
    officeLat: number,
    officeLon: number,
    userLat: number,
    userLon: number,
    radiusMeters: number,
  ): boolean {
    const distance = this.calculateDistance(
      officeLat,
      officeLon,
      userLat,
      userLon,
    );
    return distance <= radiusMeters;
  }
}
