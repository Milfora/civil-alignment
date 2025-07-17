/**
 * Geometry Utilities Module
 * Contains basic geometric calculation functions
 */

export class GeometryUtils {
  /**
   * Calculate the bearing between two points
   * @param {Object} point1 - First point {x, y}
   * @param {Object} point2 - Second point {x, y}
   * @returns {number} Bearing in radians (0° = North, clockwise)
   */
  static calculateBearing(point1, point2) {
    const dx = point2.x - point1.x; // Eastward displacement
    const dy = point1.y - point2.y; // Northward displacement (canvas Y is inverted)
    
    // Calculate bearing from North (0°) clockwise
    // atan2(east, north) gives angle from North axis
    let bearing = Math.atan2(dx, dy);
    
    // Normalize to 0-2π range (0° = North, 90° = East, 180° = South, 270° = West)
    if (bearing < 0) bearing += 2 * Math.PI;
    
    return bearing;
  }

  /**
   * Calculate the distance between two points
   * @param {Object} point1 - First point {x, y}
   * @param {Object} point2 - Second point {x, y}
   * @returns {number} Distance between points
   */
  static calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get unit vector from point1 to point2
   * @param {Object} point1 - First point {x, y}
   * @param {Object} point2 - Second point {x, y}
   * @returns {Object} Unit vector {x, y}
   */
  static getUnitVector(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return { x: 0, y: 0 };
    
    return {
      x: dx / length,
      y: dy / length
    };
  }

  /**
   * Get perpendicular vector (rotated 90° counterclockwise)
   * @param {Object} vector - Vector {x, y}
   * @returns {Object} Perpendicular vector {x, y}
   */
  static getPerpendicularVector(vector) {
    return {
      x: -vector.y,
      y: vector.x
    };
  }

  /**
   * Check if a point is within tolerance of another point
   * @param {Object} point1 - First point {x, y}
   * @param {Object} point2 - Second point {x, y}
   * @param {number} tolerance - Tolerance distance
   * @returns {boolean} True if points are within tolerance
   */
  static isPointNear(point1, point2, tolerance) {
    const distance = this.calculateDistance(point1, point2);
    return distance <= tolerance;
  }

  /**
   * Check if a point is on a line segment within tolerance
   * @param {Object} point - Point to check {x, y}
   * @param {Object} lineStart - Line start point {x, y}
   * @param {Object} lineEnd - Line end point {x, y}
   * @param {number} tolerance - Tolerance distance
   * @returns {boolean} True if point is on line segment
   */
  static isPointOnLine(point, lineStart, lineEnd, tolerance) {
    const lineLength = this.calculateDistance(lineStart, lineEnd);
    const distanceToStart = this.calculateDistance(point, lineStart);
    const distanceToEnd = this.calculateDistance(point, lineEnd);
    
    // Check if point is approximately on the line
    return Math.abs(distanceToStart + distanceToEnd - lineLength) < tolerance;
  }

  /**
   * Check if a point is on an arc within tolerance
   * @param {Object} point - Point to check {x, y}
   * @param {Object} arcCenter - Arc center point {x, y}
   * @param {number} radius - Arc radius
   * @param {number} tolerance - Tolerance distance
   * @returns {boolean} True if point is on arc
   */
  static isPointOnArc(point, arcCenter, radius, tolerance) {
    const centerDistance = this.calculateDistance(point, arcCenter);
    const radiusDiff = Math.abs(centerDistance - radius);
    
    return radiusDiff <= tolerance;
  }

  /**
   * Calculate the intersection point of two lines
   * @param {Object} line1Start - First line start point {x, y}
   * @param {Object} line1Direction - First line direction vector {x, y}
   * @param {Object} line2Start - Second line start point {x, y}
   * @param {Object} line2Direction - Second line direction vector {x, y}
   * @returns {Object|null} Intersection point or null if lines are parallel
   */
  static calculateLineIntersection(line1Start, line1Direction, line2Start, line2Direction) {
    const denominator = line1Direction.x * line2Direction.y - line1Direction.y * line2Direction.x;
    
    if (Math.abs(denominator) < 1e-10) {
      return null; // Lines are parallel
    }
    
    const dx = line2Start.x - line1Start.x;
    const dy = line2Start.y - line1Start.y;
    const t1 = (dx * line2Direction.y - dy * line2Direction.x) / denominator;
    
    return {
      x: line1Start.x + t1 * line1Direction.x,
      y: line1Start.y + t1 * line1Direction.y
    };
  }

  /**
   * Format bearing as compass direction string
   * @param {number} bearing - Bearing in radians
   * @returns {string} Formatted bearing string
   */
  static formatBearing(bearing) {
    const degrees = bearing * 180 / Math.PI;
    
    // Convert to compass direction
    if (degrees < 22.5 || degrees >= 337.5) return `N ${degrees.toFixed(1)}°`;
    else if (degrees < 67.5) return `NE ${degrees.toFixed(1)}°`;
    else if (degrees < 112.5) return `E ${degrees.toFixed(1)}°`;
    else if (degrees < 157.5) return `SE ${degrees.toFixed(1)}°`;
    else if (degrees < 202.5) return `S ${degrees.toFixed(1)}°`;
    else if (degrees < 247.5) return `SW ${degrees.toFixed(1)}°`;
    else if (degrees < 292.5) return `W ${degrees.toFixed(1)}°`;
    else return `NW ${degrees.toFixed(1)}°`;
  }

  /**
   * Normalize angle to 0-2π range
   * @param {number} angle - Angle in radians
   * @returns {number} Normalized angle
   */
  static normalizeAngle(angle) {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  }

  /**
   * Calculate angle between two vectors
   * @param {Object} vector1 - First vector {x, y}
   * @param {Object} vector2 - Second vector {x, y}
   * @returns {number} Angle in radians
   */
  static calculateAngleBetweenVectors(vector1, vector2) {
    const crossProduct = vector1.x * vector2.y - vector1.y * vector2.x;
    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
    return Math.atan2(crossProduct, dotProduct);
  }
} 