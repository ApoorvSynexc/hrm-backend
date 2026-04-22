export class NetworkUtil {
  /**
   * Convert IP address string to numeric value
   */
  private static ipToNumber(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      throw new Error('Invalid IP address');
    }
    return (
      parseInt(parts[0]) * 16777216 +
      parseInt(parts[1]) * 65536 +
      parseInt(parts[2]) * 256 +
      parseInt(parts[3])
    );
  }

  /**
   * Check if IP address is within given range
   */
  static isIpInRange(ip: string, rangeStart: string, rangeEnd: string): boolean {
    try {
      const ipNum = this.ipToNumber(ip);
      const startNum = this.ipToNumber(rangeStart);
      const endNum = this.ipToNumber(rangeEnd);
      return ipNum >= startNum && ipNum <= endNum;
    } catch {
      return false;
    }
  }

  /**
   * Check if IP is in any of multiple IP ranges (for multiple routers)
   */
  static isIpInMultipleRanges(ip: string, ipRanges: Array<{ start: string; end: string }>): boolean {
    if (!ipRanges || ipRanges.length === 0) {
      return false;
    }
    return ipRanges.some((range) => this.isIpInRange(ip, range.start, range.end));
  }

  /**
   * Extract client IP from request
   */
  static getClientIp(request: any): string {
    const ip =
      request.headers['x-forwarded-for']?.split(',')[0].trim() ||
      request.headers['x-real-ip'] ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      request.connection.socket?.remoteAddress ||
      '';

    return ip.replace(/^::ffff:/, ''); // Remove IPv6 prefix if present
  }
}
