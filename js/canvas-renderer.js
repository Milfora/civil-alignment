/**
 * Canvas Renderer Module
 * Handles all drawing operations for the alignment tool
 */

import { AlignmentCalculations } from './alignment-calculations.js';

export class CanvasRenderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.roadMarkings = {
      pavementWidth: 3.5,
      travelLaneWidth: 3.0,
      showPavementEdges: true,
      showTravelLaneEdges: true,
      showCentreline: true
    };
  }

  /**
   * Update road marking settings
   * @param {Object} settings - Road marking settings
   */
  updateRoadMarkings(settings) {
    this.roadMarkings = { ...this.roadMarkings, ...settings };
  }

  /**
   * Clear the canvas
   */
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Draw complete scene
   * @param {Array} alignments - Array of alignments
   * @param {Object} currentAlignment - Current active alignment
   * @param {Array} tempPoints - Temporary points during drawing
   * @param {Object} selectedElement - Currently selected element
   * @param {boolean} isDrawing - Whether currently drawing
   */
  drawScene(alignments, currentAlignment, tempPoints, selectedElement, isDrawing) {
    this.clear();
    this.drawGrid();
    
    // Draw saved alignments
    alignments.forEach(alignment => {
      this.drawAlignment(alignment, alignment === currentAlignment, selectedElement);
    });
    
    // Draw temporary alignment while drawing
    if (isDrawing && tempPoints.length > 0) {
      this.drawTempAlignment(tempPoints);
    }
  }

  /**
   * Draw grid background
   */
  drawGrid() {
    const gridSize = 20;
    this.ctx.strokeStyle = '#e5e7eb';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw a complete alignment
   * @param {Object} alignment - Alignment object
   * @param {boolean} isActive - Whether this is the active alignment
   * @param {Object} selectedElement - Currently selected element
   */
  drawAlignment(alignment, isActive = false, selectedElement = null) {
    if (!alignment.elements || alignment.elements.length === 0) return;
    
    // Draw road markings first (underneath the main alignment)
    this.drawRoadMarkings(alignment, isActive);
    
    // Draw main alignment elements
    alignment.elements.forEach(element => {
      const isSelected = selectedElement === element;
      
      if (element.type === 'tangent') {
        this.drawTangent(element, isActive, isSelected);
      } else if (element.type === 'arc') {
        this.drawArc(element, isActive, isSelected);
      }
    });
    
    // Draw IPs
    alignment.points.forEach((point, index) => {
      const isEndpoint = index === 0 || index === alignment.points.length - 1;
      this.drawPoint(point, isActive, isEndpoint);
    });
  }

  /**
   * Draw road markings (pavement edges, travel lane edges, centreline)
   * @param {Object} alignment - Alignment object
   * @param {boolean} isActive - Whether this is the active alignment
   */
  drawRoadMarkings(alignment, isActive = false) {
    if (!alignment.elements || alignment.elements.length === 0) return;
    
    const pixelsPerMeter = 20; // Assuming 20 pixels per meter for visualization
    
    // Calculate offset distances in pixels
    const pavementHalfWidth = (this.roadMarkings.pavementWidth / 2) * pixelsPerMeter;
    const travelLaneHalfWidth = (this.roadMarkings.travelLaneWidth / 2) * pixelsPerMeter;
    
    // Draw pavement edges
    if (this.roadMarkings.showPavementEdges) {
      const leftPavementEdge = AlignmentCalculations.calculateOffsetAlignment(alignment.elements, pavementHalfWidth);
      const rightPavementEdge = AlignmentCalculations.calculateOffsetAlignment(alignment.elements, -pavementHalfWidth);
      
      this.drawOffsetElements(leftPavementEdge, '#4b5563', 2, false);
      this.drawOffsetElements(rightPavementEdge, '#4b5563', 2, false);
    }
    
    // Draw travel lane edges
    if (this.roadMarkings.showTravelLaneEdges) {
      const leftTravelLaneEdge = AlignmentCalculations.calculateOffsetAlignment(alignment.elements, travelLaneHalfWidth);
      const rightTravelLaneEdge = AlignmentCalculations.calculateOffsetAlignment(alignment.elements, -travelLaneHalfWidth);
      
      this.drawOffsetElements(leftTravelLaneEdge, '#fbbf24', 2, false);
      this.drawOffsetElements(rightTravelLaneEdge, '#fbbf24', 2, false);
    }
    
    // Draw centreline
    if (this.roadMarkings.showCentreline) {
      this.drawOffsetElements(alignment.elements, '#1f2937', 2, true);
    }
  }

  /**
   * Draw offset elements with specified style
   * @param {Array} elements - Array of offset elements
   * @param {string} color - Stroke color
   * @param {number} lineWidth - Line width
   * @param {boolean} isDashed - Whether to draw dashed line
   */
  drawOffsetElements(elements, color, lineWidth, isDashed = false) {
    if (!elements || elements.length === 0) return;
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    
    if (isDashed) {
      this.ctx.setLineDash([10, 10]);
    } else {
      this.ctx.setLineDash([]);
    }
    
    elements.forEach(element => {
      if (element.type === 'tangent') {
        this.drawOffsetTangent(element);
      } else if (element.type === 'arc') {
        this.drawOffsetArc(element);
      }
    });
    
    // Reset line dash
    this.ctx.setLineDash([]);
  }

  /**
   * Draw offset tangent element
   * @param {Object} tangent - Tangent element
   */
  drawOffsetTangent(tangent) {
    this.ctx.beginPath();
    this.ctx.moveTo(tangent.startPoint.x, tangent.startPoint.y);
    this.ctx.lineTo(tangent.endPoint.x, tangent.endPoint.y);
    this.ctx.stroke();
  }

  /**
   * Draw offset arc element
   * @param {Object} arc - Arc element
   */
  drawOffsetArc(arc) {
    this.ctx.beginPath();
    this.ctx.arc(arc.centerPoint.x, arc.centerPoint.y, arc.radius, 
                 arc.startAngle, arc.endAngle, arc.isRightTurn);
    this.ctx.stroke();
  }

  /**
   * Draw tangent element
   * @param {Object} tangent - Tangent element
   * @param {boolean} isActive - Whether this is from active alignment
   * @param {boolean} isSelected - Whether this element is selected
   */
  drawTangent(tangent, isActive = false, isSelected = false) {
    if (isSelected) {
      // Draw selection highlight
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.moveTo(tangent.startPoint.x, tangent.startPoint.y);
      this.ctx.lineTo(tangent.endPoint.x, tangent.endPoint.y);
      this.ctx.stroke();
    }
    
    // Draw normal tangent
    this.ctx.strokeStyle = isActive ? '#2563eb' : '#6b7280';
    this.ctx.lineWidth = isActive ? 3 : 2;
    this.ctx.beginPath();
    this.ctx.moveTo(tangent.startPoint.x, tangent.startPoint.y);
    this.ctx.lineTo(tangent.endPoint.x, tangent.endPoint.y);
    this.ctx.stroke();
  }

  /**
   * Draw arc element
   * @param {Object} arc - Arc element
   * @param {boolean} isActive - Whether this is from active alignment
   * @param {boolean} isSelected - Whether this element is selected
   */
  drawArc(arc, isActive = false, isSelected = false) {
    if (isSelected) {
      // Draw selection highlight
      this.ctx.strokeStyle = '#fbbf24';
      this.ctx.lineWidth = 5;
      this.ctx.beginPath();
      this.ctx.arc(arc.centerPoint.x, arc.centerPoint.y, arc.radius, 
                   arc.startAngle, arc.endAngle, arc.isRightTurn);
      this.ctx.stroke();
    }
    
    // Draw normal arc
    this.ctx.strokeStyle = isActive ? '#dc2626' : '#ef4444';
    this.ctx.lineWidth = isActive ? 3 : 2;
    this.ctx.beginPath();
    this.ctx.arc(arc.centerPoint.x, arc.centerPoint.y, arc.radius, 
                 arc.startAngle, arc.endAngle, arc.isRightTurn);
    this.ctx.stroke();
    
    // Draw arc center point (small circle)
    if (isActive) {
      this.ctx.fillStyle = '#dc2626';
      this.ctx.beginPath();
      this.ctx.arc(arc.centerPoint.x, arc.centerPoint.y, 3, 0, 2 * Math.PI);
      this.ctx.fill();
    }
    
    // Draw arc start and end points for debugging
    if (isActive) {
      this.ctx.fillStyle = '#22c55e';
      this.ctx.beginPath();
      this.ctx.arc(arc.startPoint.x, arc.startPoint.y, 4, 0, 2 * Math.PI);
      this.ctx.fill();
      
      this.ctx.beginPath();
      this.ctx.arc(arc.endPoint.x, arc.endPoint.y, 4, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }

  /**
   * Draw temporary alignment during drawing
   * @param {Array} tempPoints - Array of temporary points
   */
  drawTempAlignment(tempPoints) {
    if (tempPoints.length < 1) return;
    
    // Draw lines
    this.ctx.strokeStyle = '#dc2626';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    
    this.ctx.moveTo(tempPoints[0].x, tempPoints[0].y);
    for (let i = 1; i < tempPoints.length; i++) {
      this.ctx.lineTo(tempPoints[i].x, tempPoints[i].y);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    
    // Draw points
    tempPoints.forEach((point, index) => {
      const isEndpoint = index === 0 || index === tempPoints.length - 1;
      this.drawPoint(point, false, isEndpoint, true);
    });
  }

  /**
   * Draw a point
   * @param {Object} point - Point to draw {x, y}
   * @param {boolean} isActive - Whether this is from active alignment
   * @param {boolean} isEndpoint - Whether this is an endpoint
   * @param {boolean} isTemp - Whether this is a temporary point
   */
  drawPoint(point, isActive = false, isEndpoint = false, isTemp = false) {
    const radius = isEndpoint ? 8 : 6;
    
    // Draw point
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    
    if (isTemp) {
      this.ctx.fillStyle = '#dc2626';
      this.ctx.strokeStyle = '#ffffff';
    } else if (isActive) {
      this.ctx.fillStyle = isEndpoint ? '#1d4ed8' : '#3b82f6';
      this.ctx.strokeStyle = '#ffffff';
    } else {
      this.ctx.fillStyle = isEndpoint ? '#4b5563' : '#9ca3af';
      this.ctx.strokeStyle = '#ffffff';
    }
    
    this.ctx.fill();
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }
} 