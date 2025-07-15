// Alignment Tool - Main JavaScript
class AlignmentTool {
  constructor() {
      this.canvas = document.getElementById('alignmentCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.isDrawing = false;
      this.isEditing = false;
      this.currentAlignment = null;
      this.tempPoints = [];
      this.tempCurvePoints = [];
      this.draggedPoint = null;
      this.draggedCurvePoint = null;
      this.dragOffset = { x: 0, y: 0 };
      this.alignments = []; // Store multiple alignments
      this.defaultRadius = 100; // Default arc radius
      this.tolerance = 15; // Tolerance for point selection
      this.selectedElement = null; // Track selected alignment element
      this.editingArc = null; // Track arc being edited for radius
      this.init();
  }
  
  init() {
      this.setupCanvas();
      this.setupEventListeners();
      this.initializeCoordinateDisplay();
      //this.setupTestHarness(); // Add test harness
      this.draw();
  }

  // Add test harness method after init()
  setupTestHarness() {
      // Create test alignment with specified points using Y up as positive (surveying convention)
      const testPointsSurveying = [
          { x: 0, y: 0 },           // Start point
          { x: 200, y: 0 },         // IP (Intersection Point)
          { x: 341.4214, y: 141.4214 } // End point (45° from horizontal)
      ];
      
      // Convert from surveying coordinates (Y up) to canvas coordinates (Y down)
      const canvasHeight = this.canvas.height;
      const testPoints = testPointsSurveying.map(point => ({
          x: point.x,
          y: canvasHeight - point.y  // Flip Y coordinate
      }));
      
      // Set radius to 100 as requested
      this.defaultRadius = 100;
      
      // Create the test alignment
      this.tempCurvePoints = []; // Reset curve points
      this.currentAlignment = {
          name: "Test Alignment",
          points: [...testPoints],
          elements: this.calculateAlignmentElements([...testPoints]),
          curvePoints: [...this.tempCurvePoints],
      };
      
      // Add to alignments array
      this.alignments.push(this.currentAlignment);
      
      // Show alignment info
      this.showAlignmentInfo();
      
      // Log the test data for verification
      console.log('=== TEST HARNESS ACTIVATED ===');
      console.log('Original Surveying Points (Y up):', testPointsSurveying);
      console.log('Converted Canvas Points (Y down):', testPoints);
      console.log('Canvas Height:', canvasHeight);
      console.log('Radius:', this.defaultRadius);
      console.log('Generated Alignment:', this.currentAlignment);
      console.log('==============================');
  }
  
  setupCanvas() {
      // Set canvas size to match display size
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  resizeCanvas() {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.initializeCoordinateDisplay();
      this.draw();
  }
  
  setupEventListeners() {
      // Start Alignment Button
      document.getElementById('startAlignmentBtn').addEventListener('click', () => {
          this.startDrawing();
      });
      
      // Cancel Button
      document.getElementById('cancelBtn').addEventListener('click', () => {
          this.cancelDrawing();
      });
      
      // Canvas Events
      this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
      this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
      this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
      
      // Mouse move for coordinate display
      this.canvas.addEventListener('mousemove', (e) => this.updateCoordinateDisplay(e));
      
      // Modal Events
      document.getElementById('saveNameBtn').addEventListener('click', () => {
          this.saveAlignment();
      });
      
      document.getElementById('cancelNameBtn').addEventListener('click', () => {
          this.cancelNaming();
      });
      
      // Enter key to finish drawing
      document.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && this.isDrawing) {
              this.finishDrawing();
          }
      });
      
      // Input field enter key
      document.getElementById('alignmentNameInput').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              this.saveAlignment();
          }
      });

      // Radius Modal Events
      document.getElementById('saveRadiusBtn').addEventListener('click', () => {
          this.saveRadius();
      });
      
      document.getElementById('cancelRadiusBtn').addEventListener('click', () => {
          this.cancelRadius();
      });
      
      // Radius input enter key
      document.getElementById('newRadiusInput').addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
              this.saveRadius();
          }
      });

  }
  
  // Start drawing
  startDrawing() {
      this.isDrawing = true;
      this.tempPoints = [];
      this.tempCurvePoints = [];
      this.showControlsPanel();
      this.hideStartButton();
      this.canvas.classList.add('cursor-crosshair');
  }
  
  // Cancel drawing
  cancelDrawing() {
      this.isDrawing = false;
      this.tempPoints = [];
      this.tempCurvePoints = [];
      this.hideControlsPanel();
      this.showStartButton();
      this.canvas.classList.remove('cursor-crosshair');
      this.draw();
  }
  
  // Handle canvas click
  handleCanvasClick(e) {
      if (this.isDrawing) {
          const point = this.getMousePos(e);
          this.tempPoints.push(point);
          this.draw();
      } else if (this.currentAlignment) {
          // Check for element selection
          const mousePos = this.getMousePos(e);
          const element = this.getElementAt(mousePos);
          
          if (element) {
              this.selectedElement = element;
              console.log('Selected element:', element);
              
              // Show radius dialog for arc elements
              if (element.type === 'arc') {
                  this.showRadiusDialog(element);
              }
              
              this.draw();
          } else {
              this.selectedElement = null;
              this.draw();
          }
      }
  }
  
  // Handle right click
  handleRightClick(e) {
      e.preventDefault();
      if (this.isDrawing && this.tempPoints.length >= 2) {
          this.finishDrawing();
      }
  }
  
  // Handle mouse down
  handleMouseDown(e) {

      if (!this.isDrawing && this.currentAlignment) {
          const mousePos = this.getMousePos(e);
          const point = this.getPointAt(mousePos, this.currentAlignment.points);
          const curvePoint = this.getPointAt(mousePos, this.currentAlignment.curvePoints);
          
          if (point) {
              this.isEditing = true;
              this.draggedPoint = point;
              this.dragOffset = {
                  x: mousePos.x - point.x,
                  y: mousePos.y - point.y
              };
              this.canvas.style.cursor = 'grabbing';
          }
          else if (curvePoint) {
              this.isEditing = true;
              this.draggedCurvePoint = curvePoint;
              this.dragOffset = {
                  x: mousePos.x - curvePoint.x,
                  y: mousePos.y - curvePoint.y
              };
              this.canvas.style.cursor = 'grabbing';
          }
      }
  }
  
  // Handle mouse move
  handleMouseMove(e) {
      
      // If editing alignment IP points, move the dragged IP point
      if (this.isEditing && this.draggedPoint) {
          const mousePos = this.getMousePos(e);
          this.draggedPoint.x = mousePos.x - this.dragOffset.x;
          this.draggedPoint.y = mousePos.y - this.dragOffset.y;
          
          // Recalculate alignment elements when IP is moved
          this.recalculateAlignment();
          this.draw();
      } 
      // If editing curve points, move the dragged curve point
      else if (this.isEditing && this.draggedCurvePoint) {
          const mousePos = this.getMousePos(e);
          this.draggedCurvePoint.point.x = mousePos.x - this.dragOffset.x;
          this.draggedCurvePoint.point.y = mousePos.y - this.dragOffset.y;

          // Recalculate alignment elements when curve point is moved
          this.recalculateAlignment();
          this.draw();
      }
      // If not drawing, show hover cursor on points
      else if (!this.isDrawing && this.currentAlignment) {
          // Show hover cursor on points
          const mousePos = this.getMousePos(e);
          const point = this.getPointAt(mousePos, this.currentAlignment.points);
          this.canvas.style.cursor = point ? 'grab' : 'default';
      }
  }
  
  // Handle mouse up
  handleMouseUp(e) {
      if (this.isEditing) {
          this.isEditing = false;
          this.draggedPoint = null;
          this.canvas.style.cursor = 'default';
      }
  }
  
  // Update coordinate display
  updateCoordinateDisplay(e) {
      const mousePos = this.getMousePos(e);
      const easting = Math.round(mousePos.x);
      const northing = Math.round(this.canvas.height - mousePos.y); // Flip Y so North is up
      
      document.getElementById('eastingValue').textContent = easting;
      document.getElementById('northingValue').textContent = northing;
  }
  
  // Initialize coordinate display
  initializeCoordinateDisplay() {
      // Initialize coordinate display with default values
      document.getElementById('eastingValue').textContent = '0';
      document.getElementById('northingValue').textContent = this.canvas.height;
  }
  
  // Finish drawing the alignment
  finishDrawing() {
      if (this.tempPoints.length >= 2) {
          this.showNameModal();
      }
  }
  
  // Save the alignment
  saveAlignment() {
      const name = document.getElementById('alignmentNameInput').value.trim();
      if (name) {
          this.currentAlignment = {
              name: name,
              points: [...this.tempPoints],
              elements: this.calculateAlignmentElements([...this.tempPoints]),
              curvePoints: [...this.tempCurvePoints],
          };
          this.alignments.push(this.currentAlignment);
          this.hideNameModal();
          this.hideControlsPanel();
          this.showAlignmentInfo();
          this.isDrawing = false;
          this.tempPoints = [];
          this.tempCurvePoints = [];
          this.draw();
      }
  }
  
  // Cancel naming of the alignment
  cancelNaming() {
      this.hideNameModal();
      this.cancelDrawing();
  }
  
  // Recalculate alignment elements when IP or curve point is moved
  recalculateAlignment() {
      if (this.currentAlignment) {
          this.currentAlignment.elements = this.calculateAlignmentElements(this.currentAlignment.points, this.currentAlignment.curvePoints);
          this.updateAlignmentStats();
          this.logAlignmentData();
          this.draw(); // Redraw the canvas immediately
      }
  }
  
  // // Update radius of the arc
  // updateRadius(newRadius) {
  //     this.defaultRadius = newRadius;
  //     document.getElementById('radiusValue').textContent = newRadius;
      
  //     // Recalculate current alignment if it exists
  //     if (this.currentAlignment) {
  //         this.recalculateAlignment();
  //         this.draw();
  //     }
  // }
  
  // Calculate alignment elements from points and curve points
  calculateAlignmentElements(points, curvePoints) {
      if (points.length < 2) return [];
      
      const elements = [];
      const arcs = [];
      
      // First, create arc elements at intermediate IPs (not at first or last point)
      for (let i = 1; i < points.length - 1; i++) {
          const prevPoint = points[i - 1];
          const currentPoint = points[i];
          const nextPoint = points[i + 1];
         
          const arc = this.calculateArcElement(prevPoint, currentPoint, nextPoint, this.defaultRadius);
          if (arc) {
              arcs[i] = arc; // Store arc indexed by IP position
          }
      }
      
      // Create tangent elements, adjusted for arc connections
      for (let i = 0; i < points.length - 1; i++) {
          let startPoint = { ...points[i] };
          let endPoint = { ...points[i + 1] };
          
          // Adjust tangent start point if there's an arc at the start IP
          // The tangent should start from the arc's end point
          if (arcs[i]) {
              startPoint = { ...arcs[i].endPoint };
          }
          
          // Adjust tangent end point if there's an arc at the end IP  
          // The tangent should end at the arc's start point
          if (arcs[i + 1]) {
              endPoint = { ...arcs[i + 1].startPoint };
          }
          
          // Calculate tangent element
          const bearing = this.calculateBearing(startPoint, endPoint);
          const length = this.calculateDistance(startPoint, endPoint);
          
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
  
  calculateBearing(point1, point2) {
      const dx = point2.x - point1.x; // Eastward displacement
      const dy = point1.y - point2.y; // Northward displacement (canvas Y is inverted)
      
      // Calculate bearing from North (0°) clockwise
      // atan2(east, north) gives angle from North axis
      let bearing = Math.atan2(dx, dy);
      
      // Normalize to 0-2π range (0° = North, 90° = East, 180° = South, 270° = West)
      if (bearing < 0) bearing += 2 * Math.PI;
      
      return bearing;
  }
  
  calculateDistance(point1, point2) {
      const dx = point2.x - point1.x;
      const dy = point2.y - point1.y;
      return Math.sqrt(dx * dx + dy * dy);
  }
  
  calculateArcElement(prevPoint, currentPoint, nextPoint, radius) {
      console.log('Radius:', radius);

      // Calculate incoming and outgoing tangent directions
      // Note: In canvas coordinates, Y increases downward, but we treat positive Y as North
      const incomingDx = currentPoint.x - prevPoint.x; // Eastward component
      const incomingDy = currentPoint.y - prevPoint.y; // Canvas Y (downward positive)
      const incomingLength = Math.sqrt(incomingDx * incomingDx + incomingDy * incomingDy);
      const incomingUnitX = incomingDx / incomingLength;
      const incomingUnitY = incomingDy / incomingLength;
      
      const outgoingDx = nextPoint.x - currentPoint.x; // Eastward component
      const outgoingDy = nextPoint.y - currentPoint.y; // Canvas Y (downward positive)
      const outgoingLength = Math.sqrt(outgoingDx * outgoingDx + outgoingDy * outgoingDy);
      const outgoingUnitX = outgoingDx / outgoingLength;
      const outgoingUnitY = outgoingDy / outgoingLength;
      
      // Calculate deflection angle using cross product and dot product
      const crossProduct = incomingUnitX * outgoingUnitY - incomingUnitY * outgoingUnitX;
      const dotProduct = incomingUnitX * outgoingUnitX + incomingUnitY * outgoingUnitY;
      const deflectionAngle = Math.atan2(crossProduct, dotProduct);
      
      // Skip if deflection is too small (nearly straight)
      if (Math.abs(deflectionAngle) < 0.05) return null;
      
      // Determine arc direction
      const isRightTurn = deflectionAngle > 0; // Negative cross product means right turn
      
      // Calculate half deflection angle
      const halfDeflection = Math.abs(deflectionAngle) / 2;
      
      // Calculate tangent length (distance from IP to arc start/end points)
      const tangentLength = radius * Math.tan(halfDeflection);
      
      // Calculate arc start and end points on the tangent lines
      const arcStartX = currentPoint.x - tangentLength * incomingUnitX;
      const arcStartY = currentPoint.y - tangentLength * incomingUnitY;
      
      const arcEndX = currentPoint.x + tangentLength * outgoingUnitX;
      const arcEndY = currentPoint.y + tangentLength * outgoingUnitY;
      
      // Calculate perpendicular directions to tangents (for finding center)
      const incomingPerpX = isRightTurn ? incomingUnitY : -incomingUnitY;
      const incomingPerpY = isRightTurn ? -incomingUnitX : incomingUnitX;
      
      const outgoingPerpX = isRightTurn ? -outgoingUnitY : outgoingUnitY;
      const outgoingPerpY = isRightTurn ? outgoingUnitX : -outgoingUnitX;
      
      // Calculate arc center point as intersection of perpendicular lines from both tangents
      // Line 1: from arcStartX,arcStartY in direction incomingPerpX,incomingPerpY
      // Line 2: from arcEndX,arcEndY in direction outgoingPerpX,outgoingPerpY
      
      // Using parametric line intersection:
      // P1 = arcStart + t1 * incomingPerp
      // P2 = arcEnd + t2 * outgoingPerp
      // Solve for intersection point
      
      const denominator = incomingPerpX * outgoingPerpY - incomingPerpY * outgoingPerpX;
      let centerX, centerY;
      
      if (Math.abs(denominator) < 1e-10) {
          // Lines are parallel, fallback to simple calculation
          centerX = arcStartX + radius * incomingPerpX;
          centerY = arcStartY + radius * incomingPerpY;
      } else {
          // Calculate intersection parameter
          const dx = arcEndX - arcStartX;
          const dy = arcEndY - arcStartY;
          const t1 = (dx * outgoingPerpY - dy * outgoingPerpX) / denominator;
          
          // Calculate intersection point (arc center)
          centerX = arcStartX + t1 * incomingPerpX;
          centerY = arcStartY + t1 * incomingPerpY;
      }
      
      // Calculate the actual radius from center to arc points
    //   const actualRadius = Math.sqrt(
    //       Math.pow(arcStartX - centerX, 2) + Math.pow(arcStartY - centerY, 2)
    //   );
    //   console.log('Actual radius:', actualRadius);
      
      // Calculate start and end angles for drawing the arc
      const startAngle = Math.atan2(arcEndY - centerY, arcEndX - centerX);
      const endAngle = Math.atan2(arcStartY - centerY, arcStartX - centerX);

      // Normalize angles for proper arc drawing
      let normalizedStartAngle = startAngle;
      let normalizedEndAngle = endAngle;
      
      if (isRightTurn) {
          // For right turns, we may need to adjust angles
          if (normalizedEndAngle < normalizedStartAngle) {
              normalizedEndAngle += 2 * Math.PI;
          }
      } else {
          // For left turns, we may need to adjust angles
          if (normalizedEndAngle > normalizedStartAngle) {
              normalizedEndAngle -= 2 * Math.PI;
          }
      }

      // Add the curve points to the tempCurvePoints array
      this.tempCurvePoints.push({ x: arcStartX, y: arcStartY });
      this.tempCurvePoints.push({ x: arcEndX, y: arcEndY });
      //this.tempCurvePoints.push({ x: centerX, y: centerY });
      
      return {
          type: 'arc',
          centerPoint: { x: centerX, y: centerY },
          curvePoints: [...this.tempCurvePoints],
          radius: radius,
          startAngle: normalizedStartAngle,
          endAngle: normalizedEndAngle,
          deflectionAngle: deflectionAngle,
          isRightTurn: isRightTurn,
          startPoint: { x: arcStartX, y: arcStartY },
          endPoint: { x: arcEndX, y: arcEndY },
          ipPoint: { ...currentPoint },
          tangentLength: tangentLength,
          inputRadius: radius // Keep track of the original input radius
      };
  }
  
  getMousePos(e) {
      const rect = this.canvas.getBoundingClientRect();
      return {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      };
  }
  
  getPointAt(mousePos, points) {
      const tolerance = this.tolerance;
      for (let point of points) {
          const distance = Math.sqrt(
              Math.pow(mousePos.x - point.x, 2) + 
              Math.pow(mousePos.y - point.y, 2)
          );
          if (distance <= tolerance) {
              return point;
          }
      }
      return null;
  }
  
  // Get element at mouse position
  getElementAt(mousePos) {
      if (!this.currentAlignment || !this.currentAlignment.elements) return null;
      
      const tolerance = this.tolerance;
      
      // Check each element
      for (let element of this.currentAlignment.elements) {
          if (element.type === 'tangent') {
              // Check if click is on tangent line
              if (this.isPointOnLine(mousePos, element.startPoint, element.endPoint, tolerance)) {
                  return element;
              }
          } else if (element.type === 'arc') {
              // Check if click is on arc
              if (this.isPointOnArc(mousePos, element, tolerance)) {
                  return element;
              }
          }
      }
      
      return null;
  }
  
  // Check if point is on line segment
  isPointOnLine(point, lineStart, lineEnd, tolerance) {
      const lineLength = this.calculateDistance(lineStart, lineEnd);
      const distanceToStart = this.calculateDistance(point, lineStart);
      const distanceToEnd = this.calculateDistance(point, lineEnd);
      
      // Check if point is approximately on the line
      return Math.abs(distanceToStart + distanceToEnd - lineLength) < tolerance;
  }
  
  // Check if point is on arc
  isPointOnArc(point, arc, tolerance) {
      const centerDistance = this.calculateDistance(point, arc.centerPoint);
      const radiusDiff = Math.abs(centerDistance - arc.radius);
      
      if (radiusDiff > tolerance) return false;
      
      // Check if point is within the arc's angular range
      const pointAngle = Math.atan2(point.y - arc.centerPoint.y, point.x - arc.centerPoint.x);
      
      // Normalize angle to match arc's angle range
      let normalizedAngle = pointAngle;
      if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
      
      // Check if angle is within arc range (simplified check)
      return true; // For now, just check radius distance
  }
  
  draw() {
      // Clear canvas
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw grid (optional)
      this.drawGrid();
      
      // Draw saved alignments
      this.alignments.forEach(alignment => {
          this.drawComplexAlignment(alignment, alignment === this.currentAlignment);
      });
      
      // Draw temporary alignment while drawing
      if (this.isDrawing && this.tempPoints.length > 0) {
          this.drawTempAlignment();
      }
  }
  
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
  
  drawComplexAlignment(alignment, isActive = false) {
      if (!alignment.elements || alignment.elements.length === 0) return;
      
      // Draw elements
      alignment.elements.forEach(element => {
          if (element.type === 'tangent') {
              this.drawTangent(element, isActive);
          } else if (element.type === 'arc') {
              this.drawArc(element, isActive);
          }
      });
      
      // Draw IPs
      alignment.points.forEach((point, index) => {
          this.drawPoint(point, isActive, index === 0 || index === alignment.points.length - 1);
      });
  }
  
  drawTangent(tangent, isActive = false) {
      const isSelected = this.selectedElement === tangent;
      
      if (isSelected) {
          // Draw selection highlight
          this.ctx.strokeStyle = '#fbbf24'; // Yellow highlight
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
  
  drawArc(arc, isActive = false) {
      const isSelected = this.selectedElement === arc;
      
      if (isSelected) {
          // Draw selection highlight
          this.ctx.strokeStyle = '#fbbf24'; // Yellow highlight
          this.ctx.lineWidth = 5;
          this.ctx.beginPath();
          this.ctx.arc(arc.centerPoint.x, arc.centerPoint.y, arc.radius, 
                       arc.startAngle, arc.endAngle, arc.isRightTurn);
          this.ctx.stroke();
      }
      
      // Draw normal arc
      this.ctx.strokeStyle = isActive ? '#dc2626' : '#ef4444'; // Red color for arcs
      this.ctx.lineWidth = isActive ? 3 : 2;
      this.ctx.beginPath();
      
      // Draw arc - use the anticlockwise parameter based on turn direction
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
          this.ctx.fillStyle = '#22c55e'; // Green for start/end points
          this.ctx.beginPath();
          this.ctx.arc(arc.startPoint.x, arc.startPoint.y, 4, 0, 2 * Math.PI);
          this.ctx.fill();
          
          this.ctx.beginPath();
          this.ctx.arc(arc.endPoint.x, arc.endPoint.y, 4, 0, 2 * Math.PI);
          this.ctx.fill();
      }
  }
  
  drawTempAlignment() {
      if (this.tempPoints.length < 1) return;
      
      // Draw lines
      this.ctx.strokeStyle = '#dc2626';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      
      this.ctx.moveTo(this.tempPoints[0].x, this.tempPoints[0].y);
      for (let i = 1; i < this.tempPoints.length; i++) {
          this.ctx.lineTo(this.tempPoints[i].x, this.tempPoints[i].y);
      }
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      
      // Draw points
      this.tempPoints.forEach((point, index) => {
          this.drawPoint(point, false, index === 0 || index === this.tempPoints.length - 1, true);
      });
  }
  
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
  
  // Legacy method for backward compatibility
  drawAlignment(alignment, isActive = false) {
      this.drawComplexAlignment(alignment, isActive);
  }
  
  // UI Helper Methods
  showControlsPanel() {
      document.getElementById('controlsPanel').classList.remove('hidden');
  }
  
  hideControlsPanel() {
      document.getElementById('controlsPanel').classList.add('hidden');
  }
  
  showStartButton() {
      document.getElementById('startAlignmentBtn').classList.remove('hidden');
  }
  
  hideStartButton() {
      document.getElementById('startAlignmentBtn').classList.add('hidden');
  }
  
  showNameModal() {
      document.getElementById('nameModal').classList.remove('hidden');
      document.getElementById('alignmentNameInput').value = '';
      document.getElementById('alignmentNameInput').focus();
  }
  
  hideNameModal() {
      document.getElementById('nameModal').classList.add('hidden');
  }
  
  showRadiusDialog(arc) {
      document.getElementById('radiusModal').classList.remove('hidden');
      document.getElementById('currentRadiusDisplay').textContent = arc.radius.toFixed(1);
      document.getElementById('newRadiusInput').value = arc.radius.toFixed(1);
      document.getElementById('newRadiusInput').focus();
      
      // Store reference to the arc being edited
      this.editingArc = arc;
  }
  
  hideRadiusDialog() {
      document.getElementById('radiusModal').classList.add('hidden');
      this.editingArc = null;
  }
  
  saveRadius() {
      const newRadius = parseFloat(document.getElementById('newRadiusInput').value);
      
      if (isNaN(newRadius) || newRadius <= 0) {
          alert('Please enter a valid radius value greater than 0.');
          return;
      }
      
      if (this.editingArc && this.currentAlignment) {
          // Update the radius and recalculate
          this.defaultRadius = newRadius;
          
          // Clear selection since arc object will be recreated
          this.selectedElement = null;
          
          // Recalculate alignment (this will call draw() automatically)
          this.recalculateAlignment();
          this.hideRadiusDialog();
          
          console.log('Arc radius updated to:', newRadius);
      }
  }
  
  cancelRadius() {
      this.hideRadiusDialog();
  }
  
  showAlignmentInfo() {
      document.getElementById('alignmentInfo').classList.remove('hidden');
      document.getElementById('alignmentName').textContent = this.currentAlignment.name;
      this.updateAlignmentStats();
      this.logAlignmentData();
  }
  
  logAlignmentData() {
      if (!this.currentAlignment) return;
      
      console.log('=== Alignment Data Structure ===');
      console.log('Name:', this.currentAlignment.name);
      console.log('Points:', this.currentAlignment.points);
      console.log('Curve Points:', this.currentAlignment.curvePoints);
      console.log('Elements:', this.currentAlignment.elements);
      
      // Log detailed element information
      this.currentAlignment.elements.forEach((element, index) => {
          console.log(`Element ${index + 1}:`, element.type.toUpperCase());
          if (element.type === 'tangent') {
              console.log(`  - Length: ${element.length.toFixed(2)}px`);
              console.log(`  - Bearing: ${this.formatBearing(element.bearing)} (${(element.bearing * 180 / Math.PI).toFixed(2)}°)`);
          } else if (element.type === 'arc') {
              console.log(`  - Radius: ${element.radius.toFixed(2)}px`);
              console.log(`  - Deflection: ${(Math.abs(element.deflectionAngle) * 180 / Math.PI).toFixed(2)}°`);
              console.log('  - Start Point:', element.startPoint);
              console.log('  - End Point:', element.endPoint);
              console.log(`  - Direction: ${element.isRightTurn ? 'Right' : 'Left'} turn`);
          }
      });
      console.log('==================================');
  }
  
  formatBearing(bearing) {
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
  
  updateAlignmentStats() {
      if (!this.currentAlignment || !this.currentAlignment.elements) return;
      
      const tangentCount = this.currentAlignment.elements.filter(el => el.type === 'tangent').length;
      const arcCount = this.currentAlignment.elements.filter(el => el.type === 'arc').length;
      const totalElements = tangentCount + arcCount;
      
      document.getElementById('elementCount').textContent = totalElements;
      document.getElementById('tangentCount').textContent = tangentCount;
      document.getElementById('arcCount').textContent = arcCount;
  }
  
  hideAlignmentInfo() {
      document.getElementById('alignmentInfo').classList.add('hidden');
  }
}

// Initialize the tool when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new AlignmentTool();
});
