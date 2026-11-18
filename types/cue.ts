export interface CueShaft {
  id: string;
  name: string;
  asset: string;
  tip?: string;
  price?: number;
  default?: boolean;
  prices?: any[];
  [key: string]: any;
}

export interface CueLength {
  id: string;
  name: string;
  price?: number;
  noButtTimber?: boolean;
  default?: boolean;
  prices?: any[];
  [key: string]: any;
}

export interface CueJoint {
  id: string;
  name: string;
  default?: boolean;
  [key: string]: any;
}

export interface ButtTimberAsset {
  id: string;
  allowedJoint_Id: string;
  allowedShafts: string[];
  images: string[];
  price?: number;
  prices?: any[];
  [key: string]: any;
}

export interface CueButtTimber {
  id: string;
  name: string;
  default?: boolean;
  assets: ButtTimberAsset[];
  [key: string]: any;
}

export interface CueSplice {
  id: string;
  name: string;
  oneImage?: string;
  fourImage?: string;
  previewImage?: string;
  onePrice?: number;
  fourPrice?: number;
  for?: number;
  prices?: any[];
  [key: string]: any;
}

export interface VeneerAsset {
  id: string;
  layer: number;
  asset: string;
  price?: number;
  fourPrice?: number;
  prices?: any[];
  [key: string]: any;
}

export interface CueVeneer {
  id: string;
  name: string;
  type?: number;
  isWood?: boolean;
  previewImage?: string;
  default?: boolean;
  assets?: VeneerAsset[];
  [key: string]: any;
}

export interface SelectedVeneer {
  layer: number;
  veneer_Id: string;
  name: string;
  asset: CueVeneer;
}

export interface CueFerrule {
  id: string;
  name: string;
  asset: string;
  price?: number;
  default?: boolean;
  [key: string]: any;
}

export interface CueTipSize {
  id: string;
  name: string;
  price?: number;
  default?: boolean;
  allowedFerrules?: string[];
  [key: string]: any;
}

export interface CueTip {
  id: string;
  name: string;
  default?: boolean;
  tips: CueTipSize[];
  shaftImagePair?: {
    name: string;
    images: string[];
    [key: string]: any;
  }[];
  [key: string]: any;
}

export interface CueDome {
  id: string;
  timbers?: string[];
  shafts?: string[];
  image?: string;
  [key: string]: any;
}

export interface CuePlate {
  id: string;
  name: string;
  asset: string;
  previewImage?: string;
  price?: number;
  allowEngraving?: boolean;
  engravingPrice?: number;
  textBounds?: string;
  default?: boolean;
  prices?: any[];
  [key: string]: any;
}

export interface CueExtension {
  id: string;
  name: string;
  asset: string;
  price?: number;
  default?: boolean;
  prices?: any[];
  [key: string]: any;
}

export interface CueMiniButt {
  id: string;
  name: string;
  asset: string;
  price?: number;
  default?: boolean;
  prices?: any[];
  [key: string]: any;
}

export interface CueCase {
  id: string;
  name: string;
  tagline: string;
  retailPrice: number;
  bundlePrice: number;
  savings: number;
  badge?: string;
  compartments: string;
  material: string;
  security: string;
  colorScheme: string;
  featured?: boolean;
  enabled?: boolean;
}

export interface CueConfiguration {
  shaft: CueShaft;
  length: CueLength;
  buttJoint: CueJoint;
  buttTimber: CueButtTimber;
  dome: boolean;
  endButtJoin: boolean;
  domeLayer: CueDome | null;
  weight: number;
  
  // Large Splices
  largeSplices: number; // 0, 1, or 4
  largeSpliceMaterial: CueSplice | null;
  largeVeneers: SelectedVeneer[];
  
  // Small Splices
  smallSplices: number; // 0, 1, or 4
  smallSpliceMaterial: CueSplice | null;
  smallVeneers: SelectedVeneer[];
  
  // Tip & Ferrule
  ferruleType: CueFerrule;
  tip: CueTip;
  tipSize: CueTipSize;
  
  // Accessories & Personalization
  extensions: CueExtension[];
  miniButt: CueMiniButt | null;
  namePlate: CuePlate | null;
  engraving: string;
  font: string; // 'Roboto' | 'Alex Brush' | 'Lora'

  // Service Level & Turnaround
  priorityService?: boolean; // Priority service: cue within 6 weeks (+£40)

  // Cue & Case Bundle
  case?: CueCase | null;
}
