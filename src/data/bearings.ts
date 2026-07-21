export interface Bearing {
  bearing: string;
  id: number;
  od: number;
  width: number;
  series: string;
  brand: string;
  type: string;
  image: string;
  [key: string]: string | number;
}

// Increment this string whenever the bearings array below is changed so that
// browsers with stale localStorage data receive the updated defaults on next load.
export const BEARINGS_VERSION = "2.0.0";

// Local, offline dataset mirroring the standalone Bearing Selector app.
// Replace or extend this array to swap in a real catalog later — the UI
// derives all columns and search behavior from this data.
export const bearings: Bearing[] = [
  { bearing: "6000", id: 10, od: 26, width: 8, series: "60", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6001", id: 12, od: 28, width: 8, series: "60", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6002", id: 15, od: 32, width: 9, series: "60", brand: "NSK", type: "Deep Groove", image: "" },
  { bearing: "6003", id: 17, od: 35, width: 10, series: "60", brand: "NSK", type: "Deep Groove", image: "" },
  { bearing: "6004", id: 20, od: 42, width: 12, series: "60", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6005", id: 25, od: 47, width: 12, series: "60", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "6006", id: 30, od: 55, width: 13, series: "60", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6007", id: 35, od: 62, width: 14, series: "60", brand: "KOYO", type: "Deep Groove", image: "" },
  { bearing: "6008", id: 40, od: 68, width: 15, series: "60", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "6201", id: 12, od: 32, width: 10, series: "62", brand: "NSK", type: "Deep Groove", image: "" },
  { bearing: "6203", id: 17, od: 40, width: 12, series: "62", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "6204", id: 20, od: 47, width: 14, series: "62", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6205", id: 25, od: 52, width: 15, series: "62", brand: "NSK", type: "Deep Groove", image: "" },
  { bearing: "6206", id: 30, od: 62, width: 16, series: "62", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6207", id: 35, od: 72, width: 17, series: "62", brand: "KOYO", type: "Deep Groove", image: "" },
  { bearing: "6208", id: 40, od: 80, width: 18, series: "62", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "6209", id: 45, od: 85, width: 19, series: "62", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6210", id: 50, od: 90, width: 20, series: "62", brand: "FAG", type: "Deep Groove", image: "" },
  { bearing: "6300", id: 10, od: 35, width: 11, series: "63", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6301", id: 12, od: 37, width: 12, series: "63", brand: "NACHI", type: "Deep Groove", image: "" },
  { bearing: "6302", id: 15, od: 42, width: 13, series: "63", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6303", id: 17, od: 47, width: 14, series: "63", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "6304", id: 20, od: 52, width: 15, series: "63", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6305", id: 25, od: 62, width: 17, series: "63", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6306", id: 30, od: 72, width: 19, series: "63", brand: "NSK", type: "Deep Groove", image: "" },
  { bearing: "6307", id: 35, od: 80, width: 21, series: "63", brand: "KOYO", type: "Deep Groove", image: "" },
  { bearing: "6308", id: 40, od: 90, width: 23, series: "63", brand: "FAG", type: "Deep Groove", image: "" },
  { bearing: "6309", id: 45, od: 100, width: 25, series: "63", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6310", id: 50, od: 110, width: 27, series: "63", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "6805", id: 25, od: 37, width: 7, series: "68", brand: "NSK", type: "Deep Groove", image: "" },
  { bearing: "6900", id: 10, od: 22, width: 6, series: "69", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "6902", id: 15, od: 28, width: 7, series: "69", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "7200", id: 10, od: 30, width: 9, series: "72", brand: "SKF", type: "Angular Contact", image: "" },
  { bearing: "7202", id: 15, od: 35, width: 11, series: "72", brand: "NSK", type: "Angular Contact", image: "" },
  { bearing: "7204", id: 20, od: 47, width: 14, series: "72", brand: "SKF", type: "Angular Contact", image: "" },
  { bearing: "7205", id: 25, od: 52, width: 15, series: "72", brand: "FAG", type: "Angular Contact", image: "" },
  { bearing: "7206", id: 30, od: 62, width: 16, series: "72", brand: "SKF", type: "Angular Contact", image: "" },
  { bearing: "7208", id: 40, od: 80, width: 18, series: "72", brand: "NTN", type: "Angular Contact", image: "" },
  { bearing: "30204", id: 20, od: 47, width: 15.25, series: "302", brand: "SKF", type: "Tapered Roller", image: "" },
  { bearing: "30205", id: 25, od: 52, width: 16.25, series: "302", brand: "NSK", type: "Tapered Roller", image: "" },
  { bearing: "30206", id: 30, od: 62, width: 17.25, series: "302", brand: "KOYO", type: "Tapered Roller", image: "" },
  { bearing: "30207", id: 35, od: 72, width: 18.25, series: "302", brand: "NTN", type: "Tapered Roller", image: "" },
  { bearing: "30208", id: 40, od: 80, width: 19.75, series: "302", brand: "SKF", type: "Tapered Roller", image: "" },
  { bearing: "32005", id: 25, od: 47, width: 15, series: "320", brand: "NACHI", type: "Tapered Roller", image: "" },
  { bearing: "1200", id: 10, od: 30, width: 9, series: "120", brand: "SKF", type: "Self-Aligning", image: "" },
  { bearing: "1202", id: 15, od: 35, width: 11, series: "120", brand: "NSK", type: "Self-Aligning", image: "" },
  { bearing: "1204", id: 20, od: 47, width: 14, series: "120", brand: "SKF", type: "Self-Aligning", image: "" },
  { bearing: "1205", id: 25, od: 52, width: 15, series: "120", brand: "NTN", type: "Self-Aligning", image: "" },
  { bearing: "NA4900", id: 10, od: 22, width: 13, series: "NA49", brand: "KOYO", type: "Needle", image: "" },
  { bearing: "NA4902", id: 15, od: 28, width: 13, series: "NA49", brand: "NSK", type: "Needle", image: "" },
  { bearing: "NA4904", id: 20, od: 37, width: 17, series: "NA49", brand: "SKF", type: "Needle", image: "" },
  { bearing: "NA6900", id: 10, od: 24, width: 22, series: "NA69", brand: "KOYO", type: "Needle", image: "" },
  { bearing: "NA6903", id: 17, od: 30, width: 20, series: "NA69", brand: "NTN", type: "Needle", image: "" },
  { bearing: "N204", id: 20, od: 47, width: 14, series: "N20", brand: "FAG", type: "Cylindrical Roller", image: "" },
  { bearing: "N205", id: 25, od: 52, width: 15, series: "N20", brand: "SKF", type: "Cylindrical Roller", image: "" },
  { bearing: "N206", id: 30, od: 62, width: 16, series: "N20", brand: "NSK", type: "Cylindrical Roller", image: "" },
  { bearing: "N208", id: 40, od: 80, width: 18, series: "N20", brand: "KOYO", type: "Cylindrical Roller", image: "" },
  { bearing: "51200", id: 10, od: 26, width: 11, series: "512", brand: "SKF", type: "Thrust", image: "" },
  { bearing: "51204", id: 20, od: 40, width: 14, series: "512", brand: "NSK", type: "Thrust", image: "" },
  { bearing: "51205", id: 25, od: 47, width: 15, series: "512", brand: "NTN", type: "Thrust", image: "" },
  { bearing: "608", id: 8, od: 22, width: 7, series: "608", brand: "NSK", type: "Deep Groove", image: "" },
  { bearing: "609", id: 9, od: 24, width: 7, series: "609", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "623", id: 3, od: 10, width: 4, series: "623", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "624", id: 4, od: 13, width: 5, series: "624", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "625", id: 5, od: 16, width: 5, series: "625", brand: "NSK", type: "Deep Groove", image: "" },
  { bearing: "626", id: 6, od: 19, width: 6, series: "626", brand: "SKF", type: "Deep Groove", image: "" },
  { bearing: "628", id: 8, od: 24, width: 8, series: "628", brand: "NTN", type: "Deep Groove", image: "" },
  { bearing: "629", id: 9, od: 26, width: 8, series: "629", brand: "SKF", type: "Deep Groove", image: "" },
];
