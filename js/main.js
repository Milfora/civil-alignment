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
                points: [...this.tempPoints]
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
            this.drawAlignment(alignment, alignment === this.currentAlignment);
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
    
    drawAlignment(alignment, isActive = false) {
        if (alignment.points.length < 2) return;
        
        // Draw lines
        this.ctx.strokeStyle = isActive ? '#2563eb' : '#6b7280';
        this.ctx.lineWidth = isActive ? 3 : 2;
        this.ctx.beginPath();
        
        this.ctx.moveTo(alignment.points[0].x, alignment.points[0].y);
        for (let i = 1; i < alignment.points.length; i++) {
            this.ctx.lineTo(alignment.points[i].x, alignment.points[i].y);
        }
        this.ctx.stroke();
        
        // Draw points
        alignment.points.forEach((point, index) => {
            this.drawPoint(point, isActive, index === 0 || index === alignment.points.length - 1);
        });
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
    }
    
    hideAlignmentInfo() {
        document.getElementById('alignmentInfo').classList.add('hidden');
    }
}

// Initialize the tool when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AlignmentTool();
});
  