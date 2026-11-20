// Cars in the jump short: only the jam at the end (everyone trying to get home at once).
import { LANE_E, LANE_W } from "./story";
import type { CarPose, TrafficState } from "./fleet";

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
/** a stopped street: both lanes nose to tail (brake lights on); optional gap left in the eastbound lane */
const jam = (opts: { gapAt?: number; gap?: number } = {}): CarPose[] => {
  const cars: CarPose[] = [];
  for (let i = 0; i < 16; i++) {
    let x = -46 + i * 6.4 + 0.5 * hh(i, 1);
    if (opts.gapAt !== undefined && x > opts.gapAt) x += opts.gap ?? 0;
    cars.push({ x, z: LANE_E, yaw: 0, brake: 1 });
  }
  for (let i = 0; i < 14; i++) cars.push({ x: 44 - i * 6.6 - 0.6 * hh(i, 2), z: LANE_W, yaw: Math.PI, brake: 1 });
  return cars;
};
export const trafficAt = (id: number, _f: number): TrafficState & { wheel: number } => {
  if (id === 12) return { cars: jam(), wheel: 0, light: "red" };
  if (id === 13) return { cars: jam({ gapAt: 1.5, gap: 3.6 }), wheel: 0, light: "red" };
  return { cars: [], wheel: 0 };
};
