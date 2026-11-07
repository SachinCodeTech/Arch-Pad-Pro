// Pre-seeded professional architectural CAD blueprints and sample drawings
// Provides authentic CAD experience on first launch for architects and store reviewers

export interface SampleBlueprint {
  id: string;
  name: string;
  scale: string;
  description: string;
  category: 'residential' | 'structural' | 'elevation';
  render: (ctx: CanvasRenderingContext2D, width: number, height: number, isDark: boolean) => void;
}

export function drawVillaFloorPlan(ctx: CanvasRenderingContext2D, W: number, H: number, isDark: boolean = true) {
  const wallColor = isDark ? '#ffffff' : '#111827';
  const interiorWallColor = isDark ? '#d1d5db' : '#374151';
  const dimColor = isDark ? '#60a5fa' : '#2563eb';
  const textColor = isDark ? '#93c5fd' : '#1d4ed8';
  const labelColor = isDark ? '#e5e7eb' : '#1f2937';
  const subLabelColor = isDark ? '#9ca3af' : '#6b7280';
  const accentColor = '#3b82f6';
  const glassColor = isDark ? '#38bdf8' : '#0284c7';

  ctx.save();

  // 1. Drawing Border & Sheet Title Block
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  const bX = 180;
  const bY = 140;
  const bW = W - 360;
  const bH = H - 280;
  ctx.strokeRect(bX, bY, bW, bH);

  // Inner border guideline
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bX + 16, bY + 16, bW - 32, bH - 32);

  // 2. Title Block in Bottom Right
  const tbW = 680;
  const tbH = 180;
  const tbX = bX + bW - tbW;
  const tbY = bY + bH - tbH;

  ctx.fillStyle = isDark ? '#0b1120' : '#f8fafc';
  ctx.fillRect(tbX, tbY, tbW, tbH);
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(tbX, tbY, tbW, tbH);

  // Title Block Internal Grid
  ctx.beginPath();
  ctx.moveTo(tbX, tbY + 54);
  ctx.lineTo(tbX + tbW, tbY + 54);
  ctx.moveTo(tbX, tbY + 115);
  ctx.lineTo(tbX + tbW, tbY + 115);
  ctx.moveTo(tbX + 380, tbY + 54);
  ctx.lineTo(tbX + 380, tbY + tbH);
  ctx.stroke();

  // Title Block Typography
  ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
  ctx.font = 'bold 22px "JetBrains Mono", monospace';
  ctx.fillText('ARCH PAD PRO · ARCHITECTURAL CAD SUITE', tbX + 20, tbY + 36);

  ctx.font = 'bold 15px "JetBrains Mono", monospace';
  ctx.fillStyle = accentColor;
  ctx.fillText('PROJECT: MODERN VILLA RESIDENCE', tbX + 20, tbY + 84);
  ctx.fillStyle = labelColor;
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillText('DRAWING: LEVEL 01 MAIN LIVING FLOOR PLAN', tbX + 20, tbY + 104);

  ctx.fillText('STATUS: ISSUED FOR DESIGN (IFD)', tbX + 20, tbY + 144);
  ctx.fillText('DISCIPLINE: ARCHITECTURAL', tbX + 20, tbY + 164);

  ctx.fillText('SCALE: 1:50 @ A1', tbX + 400, tbY + 84);
  ctx.fillText('UNITS: MILLIMETERS (MM)', tbX + 400, tbY + 104);
  ctx.fillText('SHEET NO: A-101', tbX + 400, tbY + 144);
  ctx.fillText('REV: 02 (FINAL STAMP)', tbX + 400, tbY + 164);

  // 3. Architectural North Arrow (Top-Right)
  const nX = bX + bW - 140;
  const nY = bY + 130;
  ctx.lineWidth = 2;
  ctx.strokeStyle = wallColor;
  ctx.beginPath();
  ctx.arc(nX, nY, 48, 0, Math.PI * 2);
  ctx.stroke();

  // Arrow needle
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(nX, nY - 42);
  ctx.lineTo(nX - 14, nY + 28);
  ctx.lineTo(nX, nY + 14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = isDark ? '#ffffff' : '#111827';
  ctx.beginPath();
  ctx.moveTo(nX, nY - 42);
  ctx.lineTo(nX + 14, nY + 28);
  ctx.lineTo(nX, nY + 14);
  ctx.closePath();
  ctx.fill();

  ctx.font = 'bold 18px "JetBrains Mono", monospace';
  ctx.fillStyle = wallColor;
  ctx.fillText('N', nX - 6, nY - 56);

  // 4. Graphic Scale Bar (Bottom-Left)
  const sbX = bX + 40;
  const sbY = bY + bH - 60;
  ctx.fillStyle = labelColor;
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.fillText('GRAPHIC SCALE 1:50', sbX, sbY - 14);

  const segW = 60;
  for (let s = 0; s < 4; s++) {
    ctx.fillStyle = s % 2 === 0 ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#374151' : '#e5e7eb');
    ctx.fillRect(sbX + s * segW, sbY, segW, 8);
    ctx.strokeRect(sbX + s * segW, sbY, segW, 8);
  }
  ctx.fillStyle = subLabelColor;
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText('0', sbX - 4, sbY + 24);
  ctx.fillText('1m', sbX + segW - 10, sbY + 24);
  ctx.fillText('2m', sbX + segW * 2 - 10, sbY + 24);
  ctx.fillText('3m', sbX + segW * 3 - 10, sbY + 24);
  ctx.fillText('4m', sbX + segW * 4 - 10, sbY + 24);

  // 5. MAIN ARCHITECTURAL FLOOR PLAN
  // Base offset coordinate
  const pX = 640;
  const pY = 480;
  const pW = 1800;
  const pH = 1100;
  const wallThick = 22; // External structural wall thickness

  // External Building Envelope
  ctx.lineWidth = wallThick;
  ctx.strokeStyle = wallColor;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';

  // Draw main perimeter walls with architectural cutouts for doors & windows
  ctx.beginPath();
  // Top wall: pX to pX + pW
  ctx.moveTo(pX, pY);
  ctx.lineTo(pX + 400, pY); // window gap 400-800
  ctx.moveTo(pX + 800, pY);
  ctx.lineTo(pX + pW, pY);

  // Right wall
  ctx.lineTo(pX + pW, pY + 300); // window gap 300-600
  ctx.moveTo(pX + pW, pY + 600);
  ctx.lineTo(pX + pW, pY + pH);

  // Bottom wall
  ctx.lineTo(pX + 1100, pY + pH); // balcony slider gap 700-1100
  ctx.moveTo(pX + 700, pY + pH);
  ctx.lineTo(pX, pY + pH);

  // Left wall
  ctx.lineTo(pX, pY + 700); // entrance door gap 500-700
  ctx.moveTo(pX, pY + 500);
  ctx.lineTo(pX, pY);
  ctx.stroke();

  // Glass Window Openings (Double glazing thin lines)
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = glassColor;
  // Top ribbon window
  ctx.beginPath();
  ctx.moveTo(pX + 400, pY - 5);
  ctx.lineTo(pX + 800, pY - 5);
  ctx.moveTo(pX + 400, pY + 5);
  ctx.lineTo(pX + 800, pY + 5);
  // Right window
  ctx.moveTo(pX + pW - 5, pY + 300);
  ctx.lineTo(pX + pW - 5, pY + 600);
  ctx.moveTo(pX + pW + 5, pY + 300);
  ctx.lineTo(pX + pW + 5, pY + 600);
  // Bottom sliding patio door
  ctx.moveTo(pX + 700, pY + pH - 5);
  ctx.lineTo(pX + 1100, pY + pH - 5);
  ctx.moveTo(pX + 700, pY + pH + 5);
  ctx.lineTo(pX + 1100, pY + pH + 5);
  ctx.stroke();

  // 6. Interior Partitions (14px thickness)
  ctx.lineWidth = 14;
  ctx.strokeStyle = interiorWallColor;
  ctx.beginPath();
  // Vertical partition dividing Great Room and Bedrooms
  ctx.moveTo(pX + 1050, pY);
  ctx.lineTo(pX + 1050, pY + 450); // interior door gap 450-570
  ctx.moveTo(pX + 1050, pY + 570);
  ctx.lineTo(pX + 1050, pY + pH);

  // Horizontal partition between Master Bed and Bath/Office
  ctx.moveTo(pX + 1050, pY + 550);
  ctx.lineTo(pX + 1450, pY + 550);
  ctx.moveTo(pX + 1570, pY + 550);
  ctx.lineTo(pX + pW, pY + 550);

  // Kitchen partition island divider
  ctx.moveTo(pX + 500, pY);
  ctx.lineTo(pX + 500, pY + 320);
  ctx.stroke();

  // 7. Architectural Door Swings (Arc & Leaf)
  const drawDoor = (dx: number, dy: number, size: number, angle: number) => {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(angle);
    // Door leaf line
    ctx.strokeStyle = wallColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    // Radial swing arc
    ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.6)' : 'rgba(37, 99, 235, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI / 2);
    ctx.stroke();
    ctx.restore();
  };

  // Main Entrance Door (Left wall, 120px)
  drawDoor(pX, pY + 500, 110, 0);

  // Master Bedroom Door (Center partition)
  drawDoor(pX + 1050, pY + 450, 95, 0);

  // Bath Door
  drawDoor(pX + 1450, pY + 550, 85, -Math.PI / 2);

  // 8. Architectural Dimension Strings (Standard CAD Extension & Hash Marks)
  const drawDimension = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    offset: number,
    label: string,
    isHorizontal: boolean
  ) => {
    ctx.save();
    ctx.strokeStyle = dimColor;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = textColor;
    ctx.font = 'bold 14px "JetBrains Mono", monospace';

    const ext = 28;
    const tick = 12;

    if (isHorizontal) {
      const lineY = y1 + offset;
      // Extension lines
      ctx.beginPath();
      ctx.moveTo(x1, y1 + (offset > 0 ? 8 : -8));
      ctx.lineTo(x1, lineY + (offset > 0 ? ext : -ext));
      ctx.moveTo(x2, y2 + (offset > 0 ? 8 : -8));
      ctx.lineTo(x2, lineY + (offset > 0 ? ext : -ext));
      // Dimension line
      ctx.moveTo(x1, lineY);
      ctx.lineTo(x2, lineY);
      // 45 degree CAD tick marks
      ctx.moveTo(x1 - tick, lineY + tick);
      ctx.lineTo(x1 + tick, lineY - tick);
      ctx.moveTo(x2 - tick, lineY + tick);
      ctx.lineTo(x2 + tick, lineY - tick);
      ctx.stroke();

      // Measurement text centered
      ctx.textAlign = 'center';
      ctx.textBaseline = offset < 0 ? 'bottom' : 'top';
      ctx.fillText(label, (x1 + x2) / 2, lineY + (offset < 0 ? -6 : 6));
    } else {
      const lineX = x1 + offset;
      // Extension lines
      ctx.beginPath();
      ctx.moveTo(x1 + (offset > 0 ? 8 : -8), y1);
      ctx.lineTo(lineX + (offset > 0 ? ext : -ext), y1);
      ctx.moveTo(x2 + (offset > 0 ? 8 : -8), y2);
      ctx.lineTo(lineX + (offset > 0 ? ext : -ext), y2);
      // Dimension line
      ctx.moveTo(lineX, y1);
      ctx.lineTo(lineX, y2);
      // 45 degree CAD tick marks
      ctx.moveTo(lineX - tick, y1 + tick);
      ctx.lineTo(lineX + tick, y1 - tick);
      ctx.moveTo(lineX - tick, y2 + tick);
      ctx.lineTo(lineX + tick, y2 - tick);
      ctx.stroke();

      // Measurement text rotated
      ctx.save();
      ctx.translate(lineX + (offset < 0 ? -12 : 18), (y1 + y2) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  };

  // Top overall dimension
  drawDimension(pX, pY, pX + pW, pY, -140, '12000 mm (12.00 m)', true);
  // Top sub-dimensions
  drawDimension(pX, pY, pX + 1050, pY, -70, '7000 mm', true);
  drawDimension(pX + 1050, pY, pX + pW, pY, -70, '5000 mm', true);

  // Left overall dimension
  drawDimension(pX, pY, pX, pY + pH, -140, '7500 mm (7.50 m)', false);
  // Left sub-dimensions
  drawDimension(pX, pY, pX, pY + 500, -70, '3500 mm', false);
  drawDimension(pX, pY + 500, pX, pY + pH, -70, '4000 mm', false);

  // Bottom terrace dimension
  drawDimension(pX + 700, pY + pH, pX + 1100, pY + pH, 70, '2800 mm SLIDER', true);

  // 9. Architectural Room Labels with Area and Finishes
  const drawRoomStamp = (cx: number, cy: number, roomName: string, area: string, finish: string) => {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillStyle = labelColor;
    ctx.fillText(roomName, cx, cy);

    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillStyle = accentColor;
    ctx.fillText(area, cx, cy + 24);

    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillStyle = subLabelColor;
    ctx.fillText(`FINISH: ${finish}`, cx, cy + 44);
    ctx.restore();
  };

  // Great Room
  drawRoomStamp(pX + 520, pY + 680, 'GREAT ROOM & DINING', '38.4 m²', 'POLISHED TERRAZZO');

  // Kitchen
  drawRoomStamp(pX + 260, pY + 220, 'GOURMET KITCHEN', '14.8 m²', 'QUARTZ & PORCELAIN');

  // Master Bedroom
  drawRoomStamp(pX + 1420, pY + 260, 'MASTER SUITE', '24.2 m²', 'ENGINEERED OAK');

  // En-Suite Bathroom
  drawRoomStamp(pX + 1420, pY + 800, 'SPA BATH & CLOSET', '16.5 m²', 'SLATE TILE');

  // Entrance Foyer
  drawRoomStamp(pX + 220, pY + 580, 'FOYER', '6.2 m²', 'STONE PAVER');

  // 10. Architectural Grid Bubbles (A, B, C & 1, 2)
  const drawGridBubble = (gx: number, gy: number, text: string) => {
    ctx.save();
    ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
    ctx.beginPath();
    ctx.arc(gx, gy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, gx, gy);
    ctx.restore();
  };

  drawGridBubble(pX, pY - 210, 'A');
  drawGridBubble(pX + 1050, pY - 210, 'B');
  drawGridBubble(pX + pW, pY - 210, 'C');

  drawGridBubble(pX - 210, pY, '1');
  drawGridBubble(pX - 210, pY + 500, '2');
  drawGridBubble(pX - 210, pY + pH, '3');

  ctx.restore();
}

export function drawStructuralColumnGrid(ctx: CanvasRenderingContext2D, W: number, H: number, isDark: boolean = true) {
  const gridColor = isDark ? 'rgba(96, 165, 250, 0.4)' : 'rgba(37, 99, 235, 0.35)';
  const colColor = isDark ? '#ffffff' : '#0f172a';
  const beamColor = isDark ? '#e2e8f0' : '#334155';
  const labelColor = isDark ? '#93c5fd' : '#1d4ed8';

  ctx.save();

  // Border & Title Block
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(180, 140, W - 360, H - 280);

  // Title Block
  const tbX = W - 180 - 640;
  const tbY = H - 140 - 150;
  ctx.fillStyle = isDark ? '#0b1120' : '#f8fafc';
  ctx.fillRect(tbX, tbY, 640, 150);
  ctx.strokeRect(tbX, tbY, 640, 150);

  ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText('STRUCTURAL COLUMN LAYOUT & GRID', tbX + 20, tbY + 36);
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillStyle = labelColor;
  ctx.fillText('DISCIPLINE: STRUCTURAL ENGINEERING (S-101)', tbX + 20, tbY + 70);
  ctx.fillText('COLUMNS: 450x450mm REINFORCED CONCRETE (C35/45)', tbX + 20, tbY + 95);
  ctx.fillText('FOUNDATION: PAD FOOTINGS WITH TIE BEAMS', tbX + 20, tbY + 120);

  // Columns Layout (4 x 3 bay grid)
  const startX = 650;
  const startY = 550;
  const bayX = 550;
  const bayY = 450;
  const cols = 4;
  const rows = 3;

  // Centerlines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([12, 6, 2, 6]);

  // Vertical grid lines
  for (let c = 0; c < cols; c++) {
    const x = startX + c * bayX;
    ctx.beginPath();
    ctx.moveTo(x, startY - 120);
    ctx.lineTo(x, startY + (rows - 1) * bayY + 120);
    ctx.stroke();

    // Grid Bubble Top
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
    ctx.beginPath();
    ctx.arc(x, startY - 150, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = labelColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String.fromCharCode(65 + c), x, startY - 150);
    ctx.restore();
  }

  // Horizontal grid lines
  for (let r = 0; r < rows; r++) {
    const y = startY + r * bayY;
    ctx.beginPath();
    ctx.moveTo(startX - 120, y);
    ctx.lineTo(startX + (cols - 1) * bayX + 120, y);
    ctx.stroke();

    // Grid Bubble Left
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = isDark ? '#1e293b' : '#f1f5f9';
    ctx.beginPath();
    ctx.arc(startX - 150, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = labelColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((r + 1).toString(), startX - 150, y);
    ctx.restore();
  }

  ctx.setLineDash([]);

  // Tie Beams (300mm width)
  ctx.strokeStyle = beamColor;
  ctx.lineWidth = 8;
  for (let r = 0; r < rows; r++) {
    const y = startY + r * bayY;
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + (cols - 1) * bayX, y);
    ctx.stroke();
  }
  for (let c = 0; c < cols; c++) {
    const x = startX + c * bayX;
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + (rows - 1) * bayY);
    ctx.stroke();
  }

  // Reinforced Concrete Columns (450 x 450mm)
  const colSize = 44;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = startX + c * bayX;
      const cy = startY + r * bayY;

      // Pad Footing dashed outline
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(cx - 60, cy - 60, 120, 120);
      ctx.setLineDash([]);

      // Solid Column
      ctx.fillStyle = colColor;
      ctx.fillRect(cx - colSize / 2, cy - colSize / 2, colSize, colSize);
      ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - colSize / 2, cy - colSize / 2, colSize, colSize);

      // Column ID tag (e.g. C1, C2)
      ctx.fillStyle = labelColor;
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`C${r * cols + c + 1}`, cx + 28, cy - 20);
    }
  }

  ctx.restore();
}

export function drawModernElevation(ctx: CanvasRenderingContext2D, W: number, H: number, isDark: boolean = true) {
  const groundColor = isDark ? '#334155' : '#94a3b8';
  const wallOutline = isDark ? '#ffffff' : '#0f172a';
  const glassColor = isDark ? '#38bdf8' : '#0284c7';
  const timberColor = isDark ? '#d97706' : '#b45309';
  const datumColor = isDark ? '#60a5fa' : '#2563eb';

  ctx.save();

  // Border & Sheet Outline
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(180, 140, W - 360, H - 280);

  // Title Block
  const tbX = W - 180 - 640;
  const tbY = H - 140 - 150;
  ctx.fillStyle = isDark ? '#0b1120' : '#f8fafc';
  ctx.fillRect(tbX, tbY, 640, 150);
  ctx.strokeRect(tbX, tbY, 640, 150);

  ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText('CONTEMPORARY SOUTH FACADE ELEVATION', tbX + 20, tbY + 36);
  ctx.font = '13px "JetBrains Mono", monospace';
  ctx.fillStyle = datumColor;
  ctx.fillText('DISCIPLINE: ARCHITECTURAL ELEVATIONS (A-201)', tbX + 20, tbY + 70);
  ctx.fillText('MATERIALS: ARCHITECTURAL OFF-FORM CONCRETE & TIMBER', tbX + 20, tbY + 95);
  ctx.fillText('FINISH: HIGH PERFORMANCE LOW-E DOUBLE GLAZING', tbX + 20, tbY + 120);

  // Ground Line (Thick datum line)
  const gY = 1650;
  ctx.lineWidth = 5;
  ctx.strokeStyle = groundColor;
  ctx.beginPath();
  ctx.moveTo(350, gY);
  ctx.lineTo(W - 350, gY);
  ctx.stroke();

  // Ground earth hatch
  ctx.lineWidth = 1;
  ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
  for (let x = 360; x < W - 360; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, gY + 5);
    ctx.lineTo(x - 20, gY + 35);
    ctx.stroke();
  }

  // Building Facade Geometry
  const bX = 700;
  const bW = 1600;
  const h1 = 450; // Ground floor height
  const h2 = 450; // Upper floor height
  const roofY = gY - (h1 + h2);

  // Main Volume Block
  ctx.lineWidth = 4;
  ctx.strokeStyle = wallOutline;
  ctx.fillStyle = isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.8)';
  ctx.fillRect(bX, roofY, bW, h1 + h2);
  ctx.strokeRect(bX, roofY, bW, h1 + h2);

  // Cantilevered Upper Box
  const cX = bX + 200;
  const cW = 900;
  ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(226, 232, 240, 0.8)';
  ctx.fillRect(cX, roofY - 40, cW, h2 + 40);
  ctx.strokeRect(cX, roofY - 40, cW, h2 + 40);

  // Curtain Wall Glazing (Full height architectural glass)
  ctx.strokeStyle = glassColor;
  ctx.lineWidth = 2.5;
  const gW = 550;
  const gH = h1 - 60;
  const glassX = bX + 260;
  const glassY = gY - h1 + 30;
  ctx.strokeRect(glassX, glassY, gW, gH);

  // Window mullions
  for (let m = 1; m < 4; m++) {
    ctx.beginPath();
    ctx.moveTo(glassX + (gW / 4) * m, glassY);
    ctx.lineTo(glassX + (gW / 4) * m, glassY + gH);
    ctx.stroke();
  }

  // Timber Louvers Screen on Upper Floor
  ctx.strokeStyle = timberColor;
  ctx.lineWidth = 4;
  const louverX = cX + 60;
  const louverW = 780;
  for (let l = roofY; l < roofY + h2; l += 28) {
    ctx.beginPath();
    ctx.moveTo(louverX, l);
    ctx.lineTo(louverX + louverW, l);
    ctx.stroke();
  }

  // Level Datum Markers (ROOF, LEVEL 2, GROUND)
  const drawDatumLevel = (dy: number, label: string, elev: string) => {
    ctx.save();
    ctx.strokeStyle = datumColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(380, dy);
    ctx.lineTo(bX + bW + 240, dy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Triangle marker
    ctx.fillStyle = datumColor;
    ctx.beginPath();
    ctx.moveTo(bX + bW + 240, dy);
    ctx.lineTo(bX + bW + 265, dy - 12);
    ctx.lineTo(bX + bW + 265, dy + 12);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label, bX + bW + 275, dy - 4);
    ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.fillText(elev, bX + bW + 275, dy + 14);
    ctx.restore();
  };

  drawDatumLevel(roofY - 40, 'TOP OF PARAPET', '+7.90 m');
  drawDatumLevel(roofY + h2, 'LEVEL 02 FINISH FLOOR', '+3.80 m');
  drawDatumLevel(gY, 'GROUND FLOOR LEVEL', '±0.00 m');

  ctx.restore();
}

export function createSampleBlueprintDataUrl(
  type: 'villa' | 'structural' | 'elevation',
  width: number = 3200,
  height: number = 2400,
  isDark: boolean = true
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Transparent drawing layer for seamless infinite paper canvas
  ctx.clearRect(0, 0, width, height);

  if (type === 'villa') {
    drawVillaFloorPlan(ctx, width, height, isDark);
  } else if (type === 'structural') {
    drawStructuralColumnGrid(ctx, width, height, isDark);
  } else {
    drawModernElevation(ctx, width, height, isDark);
  }

  return canvas.toDataURL('image/png');
}
