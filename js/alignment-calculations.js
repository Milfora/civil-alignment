/**
 * Alignment Calculations Module
 * Contains specialized calculations for road alignment geometry
 */

import { GeometryUtils } from './geometry.js';

export class AlignmentCalculations {
  /**
   * Calculate alignment elements from points and curve points
   * @param {Array} points - Array of IP points
   * @param {Array} curvePoints - Array of curve points
   * @param {number} defaultRadius - Default radius for arcs
   * @returns {Array} Array of alignment elements
   */
  static calculateAlignmentElements(points, curvePoints = [], defaultRadius = 100) {
    if (points.length < 2) return [];
    
    const elements = [];
    const arcs = [];
    
    // First, create arc elements at intermediate IPs (not at first or last point)
    for (let i = 1; i < points.length - 1; i++) {
      const prevPoint = points[i - 1];
      const currentPoint = points[i];
      const nextPoint = points[i + 1];
     
      const arc = this.calculateArcElement(prevPoint, currentPoint, nextPoint, defaultRadius);
      if (arc) {
        arcs[i] = arc; // Store arc indexed by IP position
      }
    }
    
    // Create tangent elements, adjusted for arc connections
    for (let i = 0; i < points.length - 1; i++) {
      let startPoint = { ...points[i] };
      let endPoint = { ...points[i + 1] };
      
      // Adjust tangent start point if there's an arc at the start IP
      if (arcs[i]) {
        startPoint = { ...arcs[i].endPoint };
      }
      
      // Adjust tangent end point if there's an arc at the end IP  
      if (arcs[i + 1]) {
        endPoint = { ...arcs[i + 1].startPoint };
      }
      
      // Calculate tangent element
      const bearing = GeometryUtils.calculateBearing(startPoint, endPoint);
      const length = GeometryUtils.calculateDistance(startPoint, endPoint);
      
      const tangent = {
        type: 'tangent',
        startPoint: startPoint,
        endPoint: endPoint,
        bearing: bearing,
        length: length,
        originalStart: { ...points[i] },
        originalEnd: { ...points[i + 1] }
      };
      
      elements.push(tangent);
    }
    
    // Add arcs to elements array
    for (let i = 1; i < points.length - 1; i++) {
      if (arcs[i]) {
        elements.push(arcs[i]);
      }
    }
    
    return elements;
  }

  /**
   * Calculate arc element for a given IP
   * @param {Object} prevPoint - Previous IP point
   * @param {Object} currentPoint - Current IP point
   * @param {Object} nextPoint - Next IP point
   * @param {number} radius - Arc radius
   * @returns {Object|null} Arc element or null if too straight
   */
  static calculateArcElement(prevPoint, currentPoint, nextPoint, radius) {
    // Calculate incoming and outgoing unit vectors
    const incomingVector = GeometryUtils.getUnitVector(prevPoint, currentPoint);
    const outgoingVector = GeometryUtils.getUnitVector(currentPoint, nextPoint);
    
    // Calculate deflection angle
    const deflectionAngle = GeometryUtils.calculateAngleBetweenVectors(incomingVector, outgoingVector);
    
    // Skip if deflection is too small (nearly straight)
    if (Math.abs(deflectionAngle) < 0.05) return null;
    
    // Determine arc direction
    const isRightTurn = deflectionAngle > 0;
    
    // Calculate half deflection angle
    const halfDeflection = Math.abs(deflectionAngle) / 2;
    
    // Calculate tangent length (distance from IP to arc start/end points)
    const tangentLength = radius * Math.tan(halfDeflection);
    
    // Calculate arc start and end points on the tangent lines
    const arcStart = {
      x: currentPoint.x - tangentLength * incomingVector.x,
      y: currentPoint.y - tangentLength * incomingVector.y
    };
    
    const arcEnd = {
      x: currentPoint.x + tangentLength * outgoingVector.x,
      y: currentPoint.y + tangentLength * outgoingVector.y
    };
    
    // Calculate arc center
    const center = this.calculateArcCenter(arcStart, arcEnd, incomingVector, outgoingVector, radius, isRightTurn);
    
    // Calculate start and end angles for drawing the arc
    const startAngle = Math.atan2(arcEnd.y - center.y, arcEnd.x - center.x);
    const endAngle = Math.atan2(arcStart.y - center.y, arcStart.x - center.x);

    // Normalize angles for proper arc drawing
    const { normalizedStartAngle, normalizedEndAngle } = this.normalizeArcAngles(startAngle, endAngle, isRightTurn);
    
    return {
      type: 'arc',
      centerPoint: center,
      radius: radius,
      startAngle: normalizedStartAngle,
      endAngle: normalizedEndAngle,
      deflectionAngle: deflectionAngle,
      isRightTurn: isRightTurn,
      startPoint: arcStart,
      endPoint: arcEnd,
      ipPoint: { ...currentPoint },
      tangentLength: tangentLength,
      inputRadius: radius
    };
  }

  /**
   * Calculate arc center point
   * @param {Object} arcStart - Arc start point
   * @param {Object} arcEnd - Arc end point
   * @param {Object} incomingVector - Incoming unit vector
   * @param {Object} outgoingVector - Outgoing unit vector
   * @param {number} radius - Arc radius
   * @param {boolean} isRightTurn - Whether it's a right turn
   * @returns {Object} Arc center point
   */
  static calculateArcCenter(arcStart, arcEnd, incomingVector, outgoingVector, radius, isRightTurn) {
    // Calculate perpendicular directions to tangents
    const incomingPerp = GeometryUtils.getPerpendicularVector(incomingVector);
    const outgoingPerp = GeometryUtils.getPerpendicularVector(outgoingVector);
    
    // Adjust perpendicular directions based on turn direction
    const adjustedIncomingPerp = {
      x: isRightTurn ? incomingPerp.x : -incomingPerp.x,
      y: isRightTurn ? incomingPerp.y : -incomingPerp.y
    };
    
    const adjustedOutgoingPerp = {
      x: isRightTurn ? -outgoingPerp.x : outgoingPerp.x,
      y: isRightTurn ? -outgoingPerp.y : outgoingPerp.y
    };
    
    // Calculate center using line intersection
    const center = GeometryUtils.calculateLineIntersection(
      arcStart, adjustedIncomingPerp,
      arcEnd, adjustedOutgoingPerp
    );
    
    // Fallback calculation if lines are parallel
    if (!center) {
      return {
        x: arcStart.x + radius * adjustedIncomingPerp.x,
        y: arcStart.y + radius * adjustedIncomingPerp.y
      };
    }
    
    return center;
  }

  /**
   * Normalize arc angles for proper drawing
   * @param {number} startAngle - Start angle in radians
   * @param {number} endAngle - End angle in radians
   * @param {boolean} isRightTurn - Whether it's a right turn
   * @returns {Object} Normalized angles
   */
  static normalizeArcAngles(startAngle, endAngle, isRightTurn) {
    let normalizedStartAngle = startAngle;
    let normalizedEndAngle = endAngle;
    
    if (isRightTurn) {
      if (normalizedEndAngle < normalizedStartAngle) {
        normalizedEndAngle += 2 * Math.PI;
      }
    } else {
      if (normalizedEndAngle > normalizedStartAngle) {
        normalizedEndAngle -= 2 * Math.PI;
      }
    }
    
    return { normalizedStartAngle, normalizedEndAngle };
  }

  /**
   * Calculate offset alignment elements
   * @param {Array} elements - Original alignment elements
   * @param {number} offsetDistance - Offset distance (positive = right, negative = left)
   * @returns {Array} Array of offset elements
   */
  static calculateOffsetAlignment(elements, offsetDistance) {
    if (!elements || elements.length === 0) return [];
    
    const offsetElements = [];
    
    elements.forEach(element => {
      if (element.type === 'tangent') {
        const offsetTangent = this.calculateOffsetTangent(element, offsetDistance);
        if (offsetTangent) offsetElements.push(offsetTangent);
      } else if (element.type === 'arc') {
        const offsetArc = this.calculateOffsetArc(element, offsetDistance);
        if (offsetArc) offsetElements.push(offsetArc);
      }
    });
    
    return offsetElements;
  }

  /**
   * Calculate offset tangent element
   * @param {Object} tangent - Original tangent element
   * @param {number} offsetDistance - Offset distance
   * @returns {Object|null} Offset tangent element
   */
  static calculateOffsetTangent(tangent, offsetDistance) {
    const direction = GeometryUtils.getUnitVector(tangent.startPoint, tangent.endPoint);
    const perpendicular = GeometryUtils.getPerpendicularVector(direction);
    
    // Calculate offset points
    const offsetStart = {
      x: tangent.startPoint.x + offsetDistance * perpendicular.x,
      y: tangent.startPoint.y + offsetDistance * perpendicular.y
    };
    
    const offsetEnd = {
      x: tangent.endPoint.x + offsetDistance * perpendicular.x,
      y: tangent.endPoint.y + offsetDistance * perpendicular.y
    };
    
    return {
      type: 'tangent',
      startPoint: offsetStart,
      endPoint: offsetEnd,
      bearing: tangent.bearing,
      length: tangent.length,
      offset: offsetDistance,
      parentElement: tangent
    };
  }

  /**
   * Calculate offset arc element
   * @param {Object} arc - Original arc element
   * @param {number} offsetDistance - Offset distance
   * @returns {Object|null} Offset arc element
   */
  static calculateOffsetArc(arc, offsetDistance) {
    // Calculate offset radius
    let offsetRadius;
    if (arc.isRightTurn) {
      offsetRadius = arc.radius + offsetDistance;
    } else {
      offsetRadius = arc.radius - offsetDistance;
    }
    
    // Skip if offset radius becomes negative or too small
    if (offsetRadius <= 0) return null;
    
    // Calculate offset start and end points
    const startPerpendicular = {
      x: -Math.sin(arc.startAngle),
      y: Math.cos(arc.startAngle)
    };
    
    const endPerpendicular = {
      x: -Math.sin(arc.endAngle),
      y: Math.cos(arc.endAngle)
    };
    
    const offsetStart = {
      x: arc.startPoint.x + offsetDistance * startPerpendicular.x,
      y: arc.startPoint.y + offsetDistance * startPerpendicular.y
    };
    
    const offsetEnd = {
      x: arc.endPoint.x + offsetDistance * endPerpendicular.x,
      y: arc.endPoint.y + offsetDistance * endPerpendicular.y
    };
    
    return {
      type: 'arc',
      centerPoint: { ...arc.centerPoint },
      radius: offsetRadius,
      startAngle: arc.startAngle,
      endAngle: arc.endAngle,
      deflectionAngle: arc.deflectionAngle,
      isRightTurn: arc.isRightTurn,
      startPoint: offsetStart,
      endPoint: offsetEnd,
      ipPoint: { ...arc.ipPoint },
      tangentLength: arc.tangentLength,
      offset: offsetDistance,
      parentElement: arc
    };
  }

  /**
   * Check if element is at mouse position
   * @param {Object} mousePos - Mouse position {x, y}
   * @param {Object} element - Alignment element
   * @param {number} tolerance - Selection tolerance
   * @returns {boolean} True if element is at position
   */
  static isElementAtPosition(mousePos, element, tolerance) {
    if (element.type === 'tangent') {
      return GeometryUtils.isPointOnLine(mousePos, element.startPoint, element.endPoint, tolerance);
    } else if (element.type === 'arc') {
      return GeometryUtils.isPointOnArc(mousePos, element.centerPoint, element.radius, tolerance);
    }
    return false;
  }
} 