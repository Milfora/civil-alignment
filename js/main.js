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
      startDrawing: () => this.startDrawing(),
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
    
    // Mouse move for coordinate display
    this.canvas.addEventListener('mousemove', (e) => {
      const mousePos = this.getMousePos(e);
      this.uiManager.updateCoordinateDisplay(mousePos, this.canvas.height);
    });
  }
  
  startDrawing() {
    this.isDrawing = true;
    this.tempPoints = [];
    this.tempCurvePoints = [];
    this.uiManager.showControlsPanel();
    this.uiManager.hideStartButton();
    this.uiManager.addCanvasClass(this.canvas, 'cursor-crosshair');
  }
  
  cancelDrawing() {
    this.isDrawing = false;
    this.tempPoints = [];
    this.tempCurvePoints = [];
    this.uiManager.hideControlsPanel();
    this.uiManager.showStartButton();
    this.uiManager.removeCanvasClass(this.canvas, 'cursor-crosshair');
    this.draw();
  }
  
  handleCanvasClick(e) {
    if (this.isDrawing) {
      const point = this.getMousePos(e);
      this.tempPoints.push(point);
      this.draw();
    } else if (this.currentAlignment) {
      const mousePos = this.getMousePos(e);
      const element = this.getElementAt(mousePos);
      
      if (element) {
        this.selectedElement = element;
        console.log('Selected element:', element);
        this.draw();
      } else {
        this.selectedElement = null;
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
        this.uiManager.setCursor(this.canvas, 'grabbing');
      }
      else if (curvePoint) {
        this.isEditing = true;
        this.draggedCurvePoint = curvePoint;
        this.dragOffset = {
          x: mousePos.x - curvePoint.x,
          y: mousePos.y - curvePoint.y
        };
        this.uiManager.setCursor(this.canvas, 'grabbing');
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
      this.uiManager.setCursor(this.canvas, point ? 'grab' : 'default');
    }
  }
  
  handleMouseUp(e) {
    if (this.isEditing) {
      this.isEditing = false;
      this.draggedPoint = null;
      this.draggedCurvePoint = null;
      this.uiManager.setCursor(this.canvas, 'default');
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
      // Calculate curve points from alignment elements
      const elements = AlignmentCalculations.calculateAlignmentElements(
        [...this.tempPoints], 
        [], 
        this.defaultRadius
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
      };
      this.alignments.push(this.currentAlignment);
      this.uiManager.hideNameModal();
      this.uiManager.hideControlsPanel();
      this.uiManager.showAlignmentInfo(this.currentAlignment);
      this.uiManager.logAlignmentData(this.currentAlignment);
      this.isDrawing = false;
      this.tempPoints = [];
      this.tempCurvePoints = [];
      this.draw();
    }
  }
  
  cancelNaming() {
    this.uiManager.hideNameModal();
    this.cancelDrawing();
  }
  
  recalculateAlignment() {
    if (this.currentAlignment) {
      // Recalculate elements
      const elements = AlignmentCalculations.calculateAlignmentElements(
        this.currentAlignment.points, 
        [], 
        this.defaultRadius
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
      this.draw();
    }
  }
  
  updateRadius(newRadius) {
    this.defaultRadius = newRadius;
    
    if (this.currentAlignment) {
      this.selectedElement = null;
      this.recalculateAlignment();
      console.log('Arc radius updated to:', newRadius);
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
  
  draw() {
    this.renderer.drawScene(
      this.alignments,
      this.currentAlignment,
      this.tempPoints,
      this.selectedElement,
      this.isDrawing
    );
  }
}

// Initialize the tool when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new AlignmentTool();
});
