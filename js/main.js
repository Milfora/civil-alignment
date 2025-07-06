// Alignment Tool - Main JavaScript
class AlignmentTool {
    constructor() {
        this.canvas = document.getElementById('alignmentCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.isEditing = false;
        this.currentAlignment = null;
        this.tempPoints = [];
        this.draggedPoint = null;
        this.dragOffset = { x: 0, y: 0 };
        this.alignments = []; // Store multiple alignments
        this.defaultRadius = 50; // Default arc radius
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.draw();
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
        
        // Radius slider event
        document.getElementById('radiusSlider').addEventListener('input', (e) => {
            this.updateRadius(parseInt(e.target.value));
        });
    }
    
    startDrawing() {
        this.isDrawing = true;
        this.tempPoints = [];
        this.showControlsPanel();
        this.hideStartButton();
        this.canvas.classList.add('cursor-crosshair');
    }
    
    cancelDrawing() {
        this.isDrawing = false;
        this.tempPoints = [];
        this.hideControlsPanel();
        this.showStartButton();
        this.canvas.classList.remove('cursor-crosshair');
        this.draw();
    }
    
    handleCanvasClick(e) {
        if (this.isDrawing) {
            const point = this.getMousePos(e);
            this.tempPoints.push(point);
            this.draw();
        }
    }
    
    handleRightClick(e) {
        e.preventDefault();
        if (this.isDrawing && this.tempPoints.length >= 2) {
            this.finishDrawing();
        }
    }
    
    handleMouseDown(e) {
        if (!this.isDrawing && this.currentAlignment) {
            const mousePos = this.getMousePos(e);
            const point = this.getPointAt(mousePos, this.currentAlignment.points);
            
            if (point) {
                this.isEditing = true;
                this.draggedPoint = point;
                this.dragOffset = {
                    x: mousePos.x - point.x,
                    y: mousePos.y - point.y
                };
                this.canvas.style.cursor = 'grabbing';
            }
        }
    }
    
    handleMouseMove(e) {
        if (this.isEditing && this.draggedPoint) {
            const mousePos = this.getMousePos(e);
            this.draggedPoint.x = mousePos.x - this.dragOffset.x;
            this.draggedPoint.y = mousePos.y - this.dragOffset.y;
            
            // Recalculate alignment elements when IP is moved
            this.recalculateAlignment();
            this.draw();
        } else if (!this.isDrawing && this.currentAlignment) {
            // Show hover cursor on points
            const mousePos = this.getMousePos(e);
            const point = this.getPointAt(mousePos, this.currentAlignment.points);
            this.canvas.style.cursor = point ? 'grab' : 'default';
        }
    }
    
    handleMouseUp(e) {
        if (this.isEditing) {
            this.isEditing = false;
            this.draggedPoint = null;
            this.canvas.style.cursor = 'default';
        }
    }
    
    finishDrawing() {
        if (this.tempPoints.length >= 2) {
            this.showNameModal();
        }
    }
    
    saveAlignment() {
        const name = document.getElementById('alignmentNameInput').value.trim();
        if (name) {
            this.currentAlignment = {
                name: name,
                points: [...this.tempPoints],
                elements: this.calculateAlignmentElements([...this.tempPoints])
            };
            this.alignments.push(this.currentAlignment);
            this.hideNameModal();
            this.hideControlsPanel();
            this.showAlignmentInfo();
            this.isDrawing = false;
            this.tempPoints = [];
            this.draw();
        }
    }
    
    cancelNaming() {
        this.hideNameModal();
        this.cancelDrawing();
    }
    
    recalculateAlignment() {
        if (this.currentAlignment) {
            this.currentAlignment.elements = this.calculateAlignmentElements(this.currentAlignment.points);
            this.updateAlignmentStats();
            this.logAlignmentData();
        }
    }
    
    updateRadius(newRadius) {
        this.defaultRadius = newRadius;
        document.getElementById('radiusValue').textContent = newRadius;
        
        // Recalculate current alignment if it exists
        if (this.currentAlignment) {
            this.recalculateAlignment();
            this.draw();
        }
    }
    
    calculateAlignmentElements(points) {
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
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        let bearing = Math.atan2(dx, -dy); // Note: y is inverted in canvas coordinates
        
        // Normalize to 0-2π range
        if (bearing < 0) bearing += 2 * Math.PI;
        
        return bearing;
    }
    
    calculateDistance(point1, point2) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    calculateArcElement(prevPoint, currentPoint, nextPoint, radius) {
        // Calculate incoming and outgoing tangent directions
        const incomingDx = currentPoint.x - prevPoint.x;
        const incomingDy = currentPoint.y - prevPoint.y;
        const incomingLength = Math.sqrt(incomingDx * incomingDx + incomingDy * incomingDy);
        const incomingUnitX = incomingDx / incomingLength;
        const incomingUnitY = incomingDy / incomingLength;
        
        const outgoingDx = nextPoint.x - currentPoint.x;
        const outgoingDy = nextPoint.y - currentPoint.y;
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
        const isRightTurn = deflectionAngle < 0; // Negative cross product means right turn
        
        // Calculate half deflection angle
        const halfDeflection = Math.abs(deflectionAngle) / 2;
        
        // Calculate tangent length (distance from IP to arc start/end points)
        const tangentLength = radius / Math.tan(halfDeflection);
        
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
        const actualRadius = Math.sqrt(
            Math.pow(arcStartX - centerX, 2) + Math.pow(arcStartY - centerY, 2)
        );
        
        // Calculate start and end angles for drawing the arc
        const startAngle = Math.atan2(arcStartY - centerY, arcStartX - centerX);
        const endAngle = Math.atan2(arcEndY - centerY, arcEndX - centerX);
        
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
        
        return {
            type: 'arc',
            centerPoint: { x: centerX, y: centerY },
            radius: actualRadius,
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
        const tolerance = 10;
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
        this.ctx.strokeStyle = isActive ? '#2563eb' : '#6b7280';
        this.ctx.lineWidth = isActive ? 3 : 2;
        this.ctx.beginPath();
        this.ctx.moveTo(tangent.startPoint.x, tangent.startPoint.y);
        this.ctx.lineTo(tangent.endPoint.x, tangent.endPoint.y);
        this.ctx.stroke();
    }
    
    drawArc(arc, isActive = false) {
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
        console.log('Elements:', this.currentAlignment.elements);
        
        // Log detailed element information
        this.currentAlignment.elements.forEach((element, index) => {
            console.log(`Element ${index + 1}:`, element.type.toUpperCase());
            if (element.type === 'tangent') {
                console.log(`  - Length: ${element.length.toFixed(2)}px`);
                console.log(`  - Bearing: ${(element.bearing * 180 / Math.PI).toFixed(2)}°`);
            } else if (element.type === 'arc') {
                console.log(`  - Radius: ${element.radius}px`);
                console.log(`  - Deflection: ${(element.deflectionAngle * 180 / Math.PI).toFixed(2)}°`);
                console.log(`  - Direction: ${element.isRightTurn ? 'Right' : 'Left'} turn`);
            }
        });
        console.log('==================================');
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
  