/**
 * UI Manager Module
 * Handles modal and control interactions for the alignment tool
 */

import { GeometryUtils } from './geometry.js';

export class UIManager {
  constructor() {
    this.editingArc = null;
    this.callbacks = {};
  }

  /**
   * Register callbacks for various UI events
   * @param {Object} callbacks - Object with callback functions
   */
  registerCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Setup event listeners for all UI controls
   */
  setupEventListeners() {
    // Start Alignment Button
    document.getElementById('startAlignmentBtn').addEventListener('click', () => {
      this.callbacks.startDrawing?.();
    });
    
    // Cancel Button
    document.getElementById('cancelBtn').addEventListener('click', () => {
      this.callbacks.cancelDrawing?.();
    });
    
    // Modal Events
    document.getElementById('saveNameBtn').addEventListener('click', () => {
      this.callbacks.saveAlignment?.();
    });
    
    document.getElementById('cancelNameBtn').addEventListener('click', () => {
      this.callbacks.cancelNaming?.();
    });
    
    // Enter key to finish drawing
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.callbacks.isDrawing?.()) {
        this.callbacks.finishDrawing?.();
      }
    });
    
    // Input field enter key
    document.getElementById('alignmentNameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.callbacks.saveAlignment?.();
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

    // Road marking controls
    document.getElementById('showPavementEdges').addEventListener('change', (e) => {
      this.callbacks.updateRoadMarkings?.({ showPavementEdges: e.target.checked });
    });
    
    document.getElementById('showTravelLaneEdges').addEventListener('change', (e) => {
      this.callbacks.updateRoadMarkings?.({ showTravelLaneEdges: e.target.checked });
    });
    
    document.getElementById('showCentreline').addEventListener('change', (e) => {
      this.callbacks.updateRoadMarkings?.({ showCentreline: e.target.checked });
    });
  }

  /**
   * Initialize coordinate display
   * @param {number} canvasHeight - Canvas height for coordinate calculation
   */
  initializeCoordinateDisplay(canvasHeight) {
    document.getElementById('eastingValue').textContent = '0';
    document.getElementById('northingValue').textContent = canvasHeight;
  }

  /**
   * Update coordinate display
   * @param {Object} mousePos - Mouse position {x, y}
   * @param {number} canvasHeight - Canvas height for coordinate calculation
   */
  updateCoordinateDisplay(mousePos, canvasHeight) {
    const easting = Math.round(mousePos.x);
    const northing = Math.round(canvasHeight - mousePos.y); // Flip Y so North is up
    
    document.getElementById('eastingValue').textContent = easting;
    document.getElementById('northingValue').textContent = northing;
  }

  /**
   * Show controls panel
   */
  showControlsPanel() {
    document.getElementById('controlsPanel').classList.remove('hidden');
  }

  /**
   * Hide controls panel
   */
  hideControlsPanel() {
    document.getElementById('controlsPanel').classList.add('hidden');
  }

  /**
   * Show start button
   */
  showStartButton() {
    document.getElementById('startAlignmentBtn').classList.remove('hidden');
  }

  /**
   * Hide start button
   */
  hideStartButton() {
    document.getElementById('startAlignmentBtn').classList.add('hidden');
  }

  /**
   * Show name modal
   */
  showNameModal() {
    document.getElementById('nameModal').classList.remove('hidden');
    document.getElementById('alignmentNameInput').value = '';
    document.getElementById('alignmentNameInput').focus();
  }

  /**
   * Hide name modal
   */
  hideNameModal() {
    document.getElementById('nameModal').classList.add('hidden');
  }

  /**
   * Get alignment name from input
   * @returns {string} Alignment name
   */
  getAlignmentName() {
    return document.getElementById('alignmentNameInput').value.trim();
  }

  /**
   * Show radius dialog
   * @param {Object} arc - Arc element being edited
   */
  showRadiusDialog(arc) {
    document.getElementById('radiusModal').classList.remove('hidden');
    
    // Update arc info display
    const ipIndex = arc.ipIndex || 'unknown';
    document.getElementById('arcInfoDisplay').textContent = `Editing Arc at IP ${ipIndex}`;
    
    document.getElementById('currentRadiusDisplay').textContent = arc.radius.toFixed(1);
    document.getElementById('newRadiusInput').value = arc.radius.toFixed(1);
    document.getElementById('newRadiusInput').focus();
    
    // Store reference to the arc being edited
    this.editingArc = arc;
    
    // Log which arc is being edited for debugging
    console.log(`Editing arc at IP ${arc.ipIndex || 'unknown'} with radius ${arc.radius}`);
  }

  /**
   * Hide radius dialog
   */
  hideRadiusDialog() {
    document.getElementById('radiusModal').classList.add('hidden');
    this.editingArc = null;
  }

  /**
   * Save radius from dialog
   */
  saveRadius() {
    const newRadius = parseFloat(document.getElementById('newRadiusInput').value);
    
    if (isNaN(newRadius) || newRadius <= 0) {
      alert('Please enter a valid radius value greater than 0.');
      return;
    }
    
    if (this.editingArc) {
      this.callbacks.updateRadius?.(newRadius);
      this.hideRadiusDialog();
    }
  }

  /**
   * Cancel radius editing
   */
  cancelRadius() {
    this.hideRadiusDialog();
  }

  /**
   * Show alignment info panel
   * @param {Object} alignment - Current alignment
   */
  showAlignmentInfo(alignment) {
    document.getElementById('alignmentInfo').classList.remove('hidden');
    document.getElementById('alignmentName').textContent = alignment.name;
    this.updateAlignmentStats(alignment);
  }

  /**
   * Hide alignment info panel
   */
  hideAlignmentInfo() {
    document.getElementById('alignmentInfo').classList.add('hidden');
  }

  /**
   * Update alignment statistics
   * @param {Object} alignment - Current alignment
   */
  updateAlignmentStats(alignment) {
    if (!alignment || !alignment.elements) return;
    
    const tangentCount = alignment.elements.filter(el => el.type === 'tangent').length;
    const arcCount = alignment.elements.filter(el => el.type === 'arc').length;
    const totalElements = tangentCount + arcCount;
    
    document.getElementById('elementCount').textContent = totalElements;
    document.getElementById('tangentCount').textContent = tangentCount;
    document.getElementById('arcCount').textContent = arcCount;
  }

  /**
   * Log alignment data to console
   * @param {Object} alignment - Current alignment
   */
  logAlignmentData(alignment) {
    if (!alignment) return;
    
    console.log('=== Alignment Data Structure ===');
    console.log('Name:', alignment.name);
    console.log('Points:', alignment.points);
    console.log('Curve Points:', alignment.curvePoints);
    console.log('Elements:', alignment.elements);
    
    // Log detailed element information
    alignment.elements.forEach((element, index) => {
      console.log(`Element ${index + 1}:`, element.type.toUpperCase());
      if (element.type === 'tangent') {
        console.log(`  - Length: ${element.length.toFixed(2)}px`);
        console.log(`  - Bearing: ${GeometryUtils.formatBearing(element.bearing)} (${(element.bearing * 180 / Math.PI).toFixed(2)}°)`);
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

  /**
   * Set canvas cursor style
   * @param {HTMLElement} canvas - Canvas element
   * @param {string} cursor - Cursor style
   */
  setCursor(canvas, cursor) {
    canvas.style.cursor = cursor;
  }

  /**
   * Add CSS class to canvas
   * @param {HTMLElement} canvas - Canvas element
   * @param {string} className - CSS class name
   */
  addCanvasClass(canvas, className) {
    canvas.classList.add(className);
  }

  /**
   * Remove CSS class from canvas
   * @param {HTMLElement} canvas - Canvas element
   * @param {string} className - CSS class name
   */
  removeCanvasClass(canvas, className) {
    canvas.classList.remove(className);
  }

  /**
   * Update road marking checkboxes
   * @param {Object} settings - Road marking settings
   */
  updateRoadMarkingControls(settings) {
    document.getElementById('showPavementEdges').checked = settings.showPavementEdges;
    document.getElementById('showTravelLaneEdges').checked = settings.showTravelLaneEdges;
    document.getElementById('showCentreline').checked = settings.showCentreline;
  }
} 