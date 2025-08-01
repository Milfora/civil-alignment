// Alignment Tool - Main JavaScript (Refactored)
import { GeometryUtils } from './geometry.js';
import { AlignmentCalculations } from './alignment-calculations.js';
import { CanvasRenderer } from './canvas-renderer.js';
import { UIManager } from './ui-manager.js';

class AlignmentTool {
  constructor() {
    this.canvas = document.getElementById('alignmentCanvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Initialize modules
    this.renderer = new CanvasRenderer(this.canvas, this.ctx);
    this.uiManager = new UIManager();
    
    // State management
    this.isDrawing = false;
    this.isEditing = false;
    this.currentAlignment = null;
    this.selectedAlignment = null; // New property to track which alignment shows grips
    this.tempPoints = [];
    this.tempCurvePoints = [];
    this.draggedPoint = null;
    this.draggedCurvePoint = null;
    this.dragOffset = { x: 0, y: 0 };
    this.alignments = [];
    this.defaultRadius = 100;
    this.tolerance = 15;
    this.selectedElement = null;
    
    this.init();
  }
  
  init() {
    this.setupCanvas();
    this.setupEventListeners();
    this.uiManager.initializeCoordinateDisplay(this.canvas.height);
    this.draw();
  }
  
  setupCanvas() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }
  
  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.uiManager.initializeCoordinateDisplay(this.canvas.height);
    this.draw();
  }
  
  setupEventListeners() {
    // Register callbacks with UI manager
    this.uiManager.registerCallbacks({
      createAlignment: () => this.createAlignment(),
      cancelDrawing: () => this.cancelDrawing(),
      saveAlignment: () => this.saveAlignment(),
      cancelNaming: () => this.cancelNaming(),
      finishDrawing: () => this.finishDrawing(),
      isDrawing: () => this.isDrawing,
      updateRadius: (radius) => this.updateRadius(radius),
      updateRoadMarkings: (settings) => this.updateRoadMarkings(settings)
    });
    
    this.uiManager.setupEventListeners();
    
    // Canvas Events
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseLeave(e));
    
    // Mouse move for coordinate display
    this.canvas.addEventListener('mousemove', (e) => {
      const mousePos = this.getMousePos(e);
      this.uiManager.updateCoordinateDisplay(mousePos, this.canvas.height);
    });
    
    // Keyboard events for deletion
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && 
          this.selectedAlignment && 
          !this.isDrawing &&
          !e.target.matches('input, textarea')) { // Don't delete when typing in input fields
        e.preventDefault(); // Prevent default browser behavior
        this.deleteSelectedAlignment();
      }
    });
  }
  
  createAlignment() {
    this.isDrawing = true;
    this.tempPoints = [];
    this.tempCurvePoints = [];
    this.uiManager.showControlsPanel();
    this.uiManager.hideCreateAlignmentButton();
    this.uiManager.setCanvasMode(this.canvas, 'drawing');
  }
  
  cancelDrawing() {
    this.isDrawing = false;
    this.tempPoints = [];
    this.tempCurvePoints = [];
    this.selectedAlignment = null; // Clear selection when canceling
    this.currentAlignment = null;
    this.selectedElement = null;
    this.uiManager.hideControlsPanel();
    this.uiManager.showCreateAlignmentButton();
    this.uiManager.hideAlignmentInfo();
    this.uiManager.setCanvasMode(this.canvas, 'normal');
    this.draw();
  }
  
  handleCanvasClick(e) {
    if (this.isDrawing) {
      const point = this.getMousePos(e);
      this.tempPoints.push(point);
      this.draw();
    } else {
      const mousePos = this.getMousePos(e);
      
      // First, check if we clicked on any alignment (to select the alignment itself)
      let clickedAlignment = null;
      for (let alignment of this.alignments) {
        if (this.isPositionOnAlignment(mousePos, alignment)) {
          clickedAlignment = alignment;
          break;
        }
      }
      
      if (clickedAlignment) {
        // Select the alignment (to show grips)
        this.selectedAlignment = clickedAlignment;
        this.currentAlignment = clickedAlignment; // Also make it current for element interaction
        
        // Check if we clicked on a specific element within the alignment
        const element = this.getElementAt(mousePos);
        if (element) {
          this.selectedElement = element;
          console.log('Selected element:', element);
        } else {
          this.selectedElement = null;
        }
        
        this.updateSelectedElementInfo();
        this.uiManager.showAlignmentInfo(clickedAlignment);
        this.draw();
      } else {
        // Clicked on empty space - deselect everything
        this.selectedAlignment = null;
        this.currentAlignment = null;
        this.selectedElement = null;
        this.updateSelectedElementInfo();
        this.uiManager.hideAlignmentInfo();
        this.draw();
      }
    }
  }
  
  handleRightClick(e) {
    e.preventDefault();
    if (this.isDrawing && this.tempPoints.length >= 2) {
      this.finishDrawing();
    } else if (this.currentAlignment) {
      const mousePos = this.getMousePos(e);
      const element = this.getElementAt(mousePos);
      
      if (element && element.type === 'arc') {
        this.selectedElement = element;
        console.log('Right-clicked arc element:', element);
        this.updateSelectedElementInfo();
        this.uiManager.showRadiusDialog(element);
        this.draw();
      }
    }
  }
  
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
        this.uiManager.setCanvasMode(this.canvas, 'dragging');
      }
      else if (curvePoint) {
        this.isEditing = true;
        this.draggedCurvePoint = curvePoint;
        this.dragOffset = {
          x: mousePos.x - curvePoint.x,
          y: mousePos.y - curvePoint.y
        };
        this.uiManager.setCanvasMode(this.canvas, 'dragging');
      }
    }
  }
  
  handleMouseMove(e) {
    if (this.isEditing && this.draggedPoint) {
      const mousePos = this.getMousePos(e);
      this.draggedPoint.x = mousePos.x - this.dragOffset.x;
      this.draggedPoint.y = mousePos.y - this.dragOffset.y;
      this.recalculateAlignment();
      this.draw();
    } 
    else if (this.isEditing && this.draggedCurvePoint) {
      const mousePos = this.getMousePos(e);
      this.draggedCurvePoint.point.x = mousePos.x - this.dragOffset.x;
      this.draggedCurvePoint.point.y = mousePos.y - this.dragOffset.y;
      this.recalculateAlignment();
      this.draw();
    }
    else if (!this.isDrawing && this.currentAlignment) {
      const mousePos = this.getMousePos(e);
      const point = this.getPointAt(mousePos, this.currentAlignment.points);
      const curvePoint = this.getPointAt(mousePos, this.currentAlignment.curvePoints);
      const element = this.getElementAt(mousePos);
      
      // Check if hovering over any interactive element
      const isHoveringInteractive = point || curvePoint || element;
      this.uiManager.setHoverCursor(this.canvas, isHoveringInteractive);
    }
    else if (this.isDrawing && this.uiManager.currentCursorMode === 'create') {
      console.log('Mousemove - isDrawing', this.isDrawing);
      console.log('ui-manager', this.uiManager.currentCursorMode);
      // set hover cursor to crosshair
      
      
    }
  }
  
  handleMouseUp(e) {
    if (this.isEditing) {
      this.isEditing = false;
      this.draggedPoint = null;
      this.draggedCurvePoint = null;
      this.uiManager.setCanvasMode(this.canvas, 'normal');
    }
  }
  
  handleMouseLeave(e) {
    // Reset cursor to default when mouse leaves canvas
    if (!this.isDrawing && !this.isEditing) {
      this.uiManager.setCanvasMode(this.canvas, 'normal');
    }
  }
  
  finishDrawing() {
    if (this.tempPoints.length >= 2) {
      this.uiManager.showNameModal();
    }
  }
  
  saveAlignment() {
    const name = this.uiManager.getAlignmentName();
    if (name) {
      // Initialize radii object with default radius for all IPs
      const radii = { default: this.defaultRadius };
      for (let i = 1; i < this.tempPoints.length - 1; i++) {
        radii[i] = this.defaultRadius;
      }
      
      // Calculate curve points from alignment elements
      const elements = AlignmentCalculations.calculateAlignmentElements(
        [...this.tempPoints], 
        [], 
        radii
      );
      
      // Extract curve points from arc elements
      const curvePoints = [];
      elements.forEach(element => {
        if (element.type === 'arc') {
          curvePoints.push({ x: element.startPoint.x, y: element.startPoint.y });
          curvePoints.push({ x: element.endPoint.x, y: element.endPoint.y });
        }
      });
      
      this.currentAlignment = {
        name: name,
        points: [...this.tempPoints],
        elements: elements,
        curvePoints: curvePoints,
        radii: radii, // Store individual radii
      };
      this.alignments.push(this.currentAlignment);
      
      // Auto-select the newly created alignment to show grips
      this.selectedAlignment = this.currentAlignment;
      
      this.uiManager.hideNameModal();
      this.uiManager.hideControlsPanel();
      this.uiManager.showCreateAlignmentButton(); // Show button again after saving
      this.uiManager.showAlignmentInfo(this.currentAlignment);
      this.uiManager.logAlignmentData(this.currentAlignment);
      this.updateSelectedElementInfo(); // Initialize element info display
      this.isDrawing = false;
      this.tempPoints = [];
      this.tempCurvePoints = [];
      this.uiManager.setCanvasMode(this.canvas, 'normal');
      this.draw();
    }
  }
  
  cancelNaming() {
    this.uiManager.hideNameModal();
    this.cancelDrawing();
  }
  
  recalculateAlignment() {
    if (this.currentAlignment) {
      // Ensure radii object exists, create if missing (for backward compatibility)
      if (!this.currentAlignment.radii) {
        this.currentAlignment.radii = { default: this.defaultRadius };
        for (let i = 1; i < this.currentAlignment.points.length - 1; i++) {
          this.currentAlignment.radii[i] = this.defaultRadius;
        }
      }
      
      // Recalculate elements using individual radii
      const elements = AlignmentCalculations.calculateAlignmentElements(
        this.currentAlignment.points, 
        [], 
        this.currentAlignment.radii
      );
      
      // Update curve points from arc elements
      const curvePoints = [];
      elements.forEach(element => {
        if (element.type === 'arc') {
          curvePoints.push({ x: element.startPoint.x, y: element.startPoint.y });
          curvePoints.push({ x: element.endPoint.x, y: element.endPoint.y });
        }
      });
      
      this.currentAlignment.elements = elements;
      this.currentAlignment.curvePoints = curvePoints;
      this.uiManager.updateAlignmentStats(this.currentAlignment);
      this.uiManager.logAlignmentData(this.currentAlignment);
      
      // Update selected element reference if it exists
      if (this.selectedElement && this.selectedElement.type === 'arc') {
        this.selectedElement = this.currentAlignment.elements.find(el => 
          el.type === 'arc' && el.ipIndex === this.selectedElement.ipIndex
        );
        this.updateSelectedElementInfo();
      }
      
      this.draw();
    }
  }
  
  /**
   * Delete the currently selected alignment
   */
  deleteSelectedAlignment() {
    if (!this.selectedAlignment) return;
    
    // Find and remove the alignment from the array
    const index = this.alignments.indexOf(this.selectedAlignment);
    if (index > -1) {
      this.alignments.splice(index, 1);
      console.log(`Deleted alignment: ${this.selectedAlignment.name}`);
    }
    
    // Clear all selection and drag states
    this.selectedAlignment = null;
    this.currentAlignment = null;
    this.selectedElement = null;
    this.draggedPoint = null;
    this.draggedCurvePoint = null;
    
    // Update UI
    this.uiManager.hideAlignmentInfo();
    this.updateSelectedElementInfo();
    this.draw();
  }
  
  updateRadius(newRadius) {
    if (this.currentAlignment && this.selectedElement && this.selectedElement.type === 'arc') {
      // Update the radius for the specific arc
      const ipIndex = this.selectedElement.ipIndex;
      if (ipIndex !== undefined) {
        this.currentAlignment.radii[ipIndex] = newRadius;
        this.recalculateAlignment();
        
        // Update the selected element to reflect the new radius
        this.selectedElement = this.currentAlignment.elements.find(el => 
          el.type === 'arc' && el.ipIndex === ipIndex
        );
        this.updateSelectedElementInfo();
        
        console.log(`Arc at IP ${ipIndex} radius updated to:`, newRadius);
      }
    } else {
      // Fallback: update default radius for new alignments
      this.defaultRadius = newRadius;
      console.log('Default radius updated to:', newRadius);
    }
  }
  
  updateRoadMarkings(settings) {
    this.renderer.updateRoadMarkings(settings);
    this.draw();
  }
  
  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }
  
  getPointAt(mousePos, points) {
    for (let point of points) {
      if (GeometryUtils.isPointNear(mousePos, point, this.tolerance)) {
        return point;
      }
    }
    return null;
  }
  
  getElementAt(mousePos) {
    if (!this.currentAlignment || !this.currentAlignment.elements) return null;
    
    for (let element of this.currentAlignment.elements) {
      if (AlignmentCalculations.isElementAtPosition(mousePos, element, this.tolerance)) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Check if a mouse position is within the bounds of an alignment
   * @param {object} mousePos - The mouse position { x, y }
   * @param {object} alignment - The alignment object to check
   * @returns {boolean} True if the mouse position is within the alignment's bounds
   */
  isPositionOnAlignment(mousePos, alignment) {
    if (!alignment.elements) return false;
    
    // Check if clicked on any element within the alignment
    for (let element of alignment.elements) {
      if (AlignmentCalculations.isElementAtPosition(mousePos, element, this.tolerance)) {
        return true;
      }
    }
    
    // Also check if clicked on any IP points
    for (let point of alignment.points) {
      if (GeometryUtils.isPointNear(mousePos, point, this.tolerance)) {
        return true;
      }
    }
    
    return false;
  }
  
  draw() {
    this.renderer.drawScene(
      this.alignments,
      this.currentAlignment,
      this.selectedAlignment,
      this.tempPoints,
      this.selectedElement,
      this.isDrawing
    );
  }

  /**
   * Get the radius for a specific IP index
   * @param {number} ipIndex - The IP index
   * @returns {number} The radius for that IP
   */
  getRadiusForIP(ipIndex) {
    if (!this.currentAlignment || !this.currentAlignment.radii) {
      return this.defaultRadius;
    }
    
    if (this.currentAlignment.radii[ipIndex]) {
      return this.currentAlignment.radii[ipIndex];
    }
    
    return this.currentAlignment.radii.default || this.defaultRadius;
  }

  /**
   * Update the selected element info display
   */
  updateSelectedElementInfo() {
    const infoPanel = document.getElementById('selectedElementInfo');
    const typeElement = document.getElementById('selectedElementType');
    const detailsElement = document.getElementById('selectedElementDetails');
    
    if (!this.selectedElement) {
      infoPanel.classList.add('hidden');
      typeElement.textContent = 'None';
      detailsElement.textContent = '';
      return;
    }
    
    infoPanel.classList.remove('hidden');
    
    if (this.selectedElement.type === 'tangent') {
      typeElement.textContent = 'Tangent';
      const length = this.selectedElement.length.toFixed(1);
      const bearing = (this.selectedElement.bearing * 180 / Math.PI).toFixed(1);
      detailsElement.textContent = `Length: ${length}px, Bearing: ${bearing}°`;
    } else if (this.selectedElement.type === 'arc') {
      typeElement.textContent = `Arc (IP ${this.selectedElement.ipIndex || 'unknown'})`;
      const radius = this.selectedElement.radius.toFixed(1);
      const deflection = (Math.abs(this.selectedElement.deflectionAngle) * 180 / Math.PI).toFixed(1);
      const direction = this.selectedElement.isRightTurn ? 'Right' : 'Left';
      detailsElement.textContent = `Radius: ${radius}px, Deflection: ${deflection}°, ${direction} turn`;
    }
  }
}

// Initialize the tool when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new AlignmentTool();
});
