export interface Project {
  id: string;
  name: string;
  created: number;
  modified: number;
  scale: string;
  userId?: string;
  isSyncing?: boolean;
}

export interface Drawing {
  projectId: string;
  canvasData: string;
  modified: number;
  userId?: string;
}

export type ToolType = 'pen' | 'eraser' | 'text' | 'line' | 'rect' | 'circle' | 'arrow' | 'pan';

export type ThemeType = 'light' | 'dark';

export interface DragItem {
  x: number;
  y: number;
}

export const PEN_SIZES: [number, string, string][] = [
  [0.3, "0.00mm", "Hairline"],
  [0.5, "0.05mm", "Ultra Fine"],
  [0.9, "0.09mm", "Extra Fine"],
  [1.3, "0.13mm", "Very Fine"],
  [1.5, "0.15mm", "Fine"],
  [1.8, "0.18mm", "Fine+"],
  [2.0, "0.20mm", "Technical Fine"],
  [2.5, "0.25mm", "Technical"],
  [3.0, "0.30mm", "Standard"],
  [3.5, "0.35mm", "Standard+"],
  [4.0, "0.40mm", "Medium Fine"],
  [5.0, "0.50mm", "Medium"],
  [5.3, "0.53mm", "Medium+"],
  [6.0, "0.60mm", "Bold"],
  [7.0, "0.70mm", "Bold+"],
  [8.0, "0.80mm", "Heavy"],
  [9.0, "0.90mm", "Heavy+"],
  [10.0, "1.00mm", "Extra Heavy"],
  [10.6, "1.06mm", "Extra Heavy+"],
  [12.0, "1.20mm", "Line Weight A"],
  [14.0, "1.40mm", "Line Weight B"],
  [16.0, "1.58mm", "Line Weight C"],
  [20.0, "2.00mm", "Marker Fine"],
  [21.0, "2.11mm", "Marker"],
  [30.0, "3.0mm", "Marker Bold"],
  [35.0, "3.5mm", "Marker Heavy"],
  [40.0, "4.0mm", "Marker Extra"],
  [45.0, "4.5mm", "Marker Max"],
  [50.0, "5.0mm", "Brush"]
];
