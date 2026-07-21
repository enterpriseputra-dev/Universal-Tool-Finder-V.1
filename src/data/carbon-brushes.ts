export interface CarbonBrush {
  partNumber: string;
  altPartNumber: string;
  thickness: number;
  width: number;
  length: number;
  springDiameter: number;
  plateSocketSize: string;
  toolCategory: string;
  compatibleModels: string;
  image: string;
  [key: string]: string | number;
}

// Increment this string whenever the carbonBrushes array below is changed so that
// browsers with stale localStorage data receive the updated defaults on next load.
export const CARBON_BRUSHES_VERSION = "2.0.0";

// Local, offline dataset. Replace or extend this array to swap in a real
// catalog later — the UI derives all columns and search behavior from this data.
export const carbonBrushes: CarbonBrush[] = [
  {
    partNumber: "CB304",
    altPartNumber: "CB-304-M",
    thickness: 5,
    width: 8,
    length: 12,
    springDiameter: 4,
    plateSocketSize: "5x8mm",
    toolCategory: "Angle Grinder",
    compatibleModels: "DeWalt D28110, Makita 9553NB",
    image: "",
  },
  {
    partNumber: "CB401",
    altPartNumber: "CB-401-D",
    thickness: 6,
    width: 12,
    length: 15,
    springDiameter: 5,
    plateSocketSize: "6x12mm",
    toolCategory: "Rotary Hammer",
    compatibleModels: "Bosch GBH2-26, Hitachi DH24PC",
    image: "",
  },
  {
    partNumber: "CB502",
    altPartNumber: "CB-502-B",
    thickness: 7,
    width: 11,
    length: 17,
    springDiameter: 6,
    plateSocketSize: "7x11mm",
    toolCategory: "Impact Drill",
    compatibleModels: "Makita HP2050, Bosch GSB13RE",
    image: "",
  },
  {
    partNumber: "CB210",
    altPartNumber: "CB-210-S",
    thickness: 5,
    width: 7,
    length: 10,
    springDiameter: 3.5,
    plateSocketSize: "5x7mm",
    toolCategory: "Circular Saw",
    compatibleModels: "Makita 4100NH",
    image: "",
  },
  {
    partNumber: "CB105",
    altPartNumber: "CB-105-U",
    thickness: 4,
    width: 6,
    length: 9,
    springDiameter: 3,
    plateSocketSize: "4x6mm",
    toolCategory: "Angle Grinder",
    compatibleModels: "Bosch GWS660, DeWalt DW802",
    image: "",
  },
  {
    partNumber: "CB620",
    altPartNumber: "CB-620-H",
    thickness: 8,
    width: 13,
    length: 19,
    springDiameter: 6.5,
    plateSocketSize: "8x13mm",
    toolCategory: "Rotary Hammer",
    compatibleModels: "Hitachi DH24PC3",
    image: "",
  },
  {
    partNumber: "CB701",
    altPartNumber: "CB-701-M",
    thickness: 6.5,
    width: 8,
    length: 13,
    springDiameter: 5,
    plateSocketSize: "6.5x8mm",
    toolCategory: "Angle Grinder",
    compatibleModels: "Makita GA4530, GA5030",
    image: "",
  },
];
