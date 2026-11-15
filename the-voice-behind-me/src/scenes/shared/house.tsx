import { useMemo } from 'react';
import * as THREE from 'three';
import { LevelGeometry, room, type WallDef, type FloorDef, type BlockDef } from '../../components/Environment/LevelGeometry';
import { Stairs, Fence, Tree, B, Cyl } from '../../components/Environment/Props';
import type { MatKey } from '../../components/Environment/materials';

/**
 * The family house, ground floor (metres; x east, z south).
 *
 *   z=-8 ┌──────────────┬────┬───┬──────────┐
 *        │   KITCHEN    │    │CL │ (closed) │
 *   z=-3 ├────  ────────┤ HA ├───┴─┬────────┤ landing (y=2.9) above x5.5–8 z-6…-1.7
 *        │  LIVING ROOM │ LL │     │ STAIRS │
 *        │              │ WAY│STAIR HALL    │
 *   z=4  └──[win]───────┴[D]─┴─────┴────────┘
 *       x=-8           x=1  x=3.5 x=5.5     x=8
 */
export const FRONT_DOOR: [number, number, number] = [2.25, 0, 4];
export const UPSTAIRS_DOOR: [number, number, number] = [6.8, 2.9, -6];

export function groundWalls(mat: MatKey = 'wallpaper'): WallDef[] {
  return [
    // perimeter
    { a: [-8, 4], b: [8, 4], mat, gaps: [{ at: 10.25, w: 1.0 }, { at: 4, w: 1.4, sill: 0.9 }] },
    { a: [-8, -8], b: [8, -8], mat, gaps: [{ at: 4, w: 1.2, sill: 1.0 }] },
    { a: [-8, -8], b: [-8, 4], mat, gaps: [{ at: 2.5, w: 1.2, sill: 1.0 }, { at: 9, w: 1.2, sill: 0.9 }] },
    { a: [8, -8], b: [8, 4], mat, gaps: [{ at: 7, w: 1.0, sill: 1.0 }] },
    // hallway
    { a: [1, -8], b: [1, 4], mat, gaps: [{ at: 8.5, w: 1.6, h: 2.3 }, { at: 2.5, w: 1.0 }] },
    { a: [3.5, -8], b: [3.5, 4], mat, gaps: [{ at: 1, w: 0.9 }, { at: 8, w: 1.6, h: 2.3 }] },
    // living / kitchen
    { a: [-8, -3], b: [1, -3], mat, gaps: [{ at: 4, w: 1.4, h: 2.3 }] },
    // closet + dead space under landing
    { a: [3.5, -6], b: [8, -6], mat },
    { a: [5.5, -8], b: [5.5, -6], mat },
    // stair hall upper storey (double height)
    { a: [3.5, -6], b: [3.5, 4], y: 2.8, h: 3.0, mat },
    { a: [8, -6], b: [8, 4], y: 2.8, h: 3.0, mat },
    { a: [3.5, 4], b: [8, 4], y: 2.8, h: 3.0, mat },
    { a: [3.5, -6], b: [8, -6], y: 2.8, h: 3.0, mat, gaps: [{ at: 3.3, w: 1.0, h: 2.25 }] },
  ];
}

export function groundFloors(floorMat: MatKey = 'wood_floor', kitchenMat: MatKey = 'tile'): FloorDef[] {
  return [
    { x0: -8, z0: -3, x1: 1, z1: 4, mat: floorMat, ceil: 2.8 },
    { x0: -8, z0: -8, x1: 1, z1: -3, mat: kitchenMat, ceil: 2.8 },
    { x0: 1, z0: -8, x1: 3.5, z1: 4, mat: floorMat, ceil: 2.8 },
    { x0: 3.5, z0: -8, x1: 5.5, z1: -6, mat: floorMat, ceil: 2.8 },
    { x0: 3.5, z0: -6, x1: 8, z1: 4, mat: floorMat, ceil: 5.8 },
    // upstairs landing
    { x0: 5.5, z0: -6, x1: 8, z1: -1.7, y: 2.9, mat: floorMat },
  ];
}

export function stairBlocks(): BlockDef[] {
  return [
    // railings along the stairs + landing edge
    { p: [6.18, 1.9, 0.4], s: [0.06, 3.8, 4.4], mat: 'dark_wood', collide: true },
    { p: [7.42, 1.9, 0.4], s: [0.06, 3.8, 4.4], mat: 'dark_wood', collide: true },
    { p: [5.85, 3.4, -1.72], s: [0.7, 1.0, 0.06], mat: 'dark_wood', collide: true },
    { p: [7.71, 3.4, -1.72], s: [0.58, 1.0, 0.06], mat: 'dark_wood', collide: true },
    { p: [5.52, 3.4, -3.85], s: [0.06, 1.0, 4.3], mat: 'dark_wood', collide: true },
    // solid space under the top of the stairs
    { p: [6.8, 1.1, -1.5], s: [1.2, 2.2, 0.5], mat: 'dark_wood', collide: true },
  ];
}

export function HouseStairs({ mat = 'dark_wood' as MatKey }: { mat?: MatKey }) {
  return <Stairs from={[6.8, 0, 2.5]} dir="n" width={1.15} rise={2.9} run={4.2} steps={15} mat={mat} />;
}

/** Exterior shell, roof and porch. `litWindow` lights Noah's upstairs window. */
export function HouseShell({ litWindow = false, glassColor = '#0d1622', burnt = false }: { litWindow?: boolean; glassColor?: string; burnt?: boolean }) {
  const wallMat: MatKey = burnt ? 'burnt' : 'siding';
  const walls: WallDef[] = useMemo(
    () => [
      ...room(-8.14, -8.14, 8.14, 4.14, {
        mat: wallMat,
        h: 6.2,
        s: [
          { at: 10.39, w: 1.0 },
          { at: 4.14, w: 1.4, sill: 0.9 },
        ],
        n: [{ at: 4.14, w: 1.2, sill: 1.0 }],
        w: [
          { at: 2.64, w: 1.2, sill: 1.0 },
          { at: 9.14, w: 1.2, sill: 0.9 },
        ],
        e: [{ at: 7.14, w: 1.0, sill: 1.0 }],
      }).map((w) => ({ ...w, t: 0.12, noCollide: true })),
    ],
    [wallMat],
  );
  return (
    <group>
      <LevelGeometry walls={walls} windowColor={glassColor} />
      {/* upper floor windows (decorative) */}
      {[-4, 4.5].map((x) => (
        <group key={x} position={[x, 4.2, 4.22]}>
          <B p={[0, 0, 0]} s={[1.3, 1.3, 0.05]} m="dark_wood" />
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[1.1, 1.1]} />
            <meshStandardMaterial color={x === -4 && litWindow ? '#e8b060' : glassColor} emissive={x === -4 && litWindow ? '#c88a40' : '#000'} emissiveIntensity={x === -4 && litWindow ? 1.4 : 0} />
          </mesh>
          <B p={[0, 0, 0.05]} s={[0.05, 1.1, 0.02]} m="dark_wood" />
          <B p={[0, 0, 0.05]} s={[1.1, 0.05, 0.02]} m="dark_wood" />
        </group>
      ))}
      {/* roof */}
      <B p={[0, 7.1, 1.1]} s={[17.2, 0.16, 6.6]} r={[0.28, 0, 0]} m="roof" />
      <B p={[0, 7.1, -5.1]} s={[17.2, 0.16, 6.6]} r={[-0.28, 0, 0]} m="roof" />
      <mesh position={[8.14, 6.2, -2]} rotation={[0, Math.PI / 2, 0]}>
        <shapeGeometry args={[gable()]} />
        <meshStandardMaterial color="#3c3a36" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-8.14, 6.2, -2]} rotation={[0, Math.PI / 2, 0]}>
        <shapeGeometry args={[gable()]} />
        <meshStandardMaterial color="#3c3a36" side={THREE.DoubleSide} />
      </mesh>
      {/* porch */}
      <B p={[2.25, 0.08, 5.2]} s={[4, 0.16, 2.2]} m="dark_wood" />
      <B p={[2.25, 2.75, 5.3]} s={[4.4, 0.12, 2.6]} m="roof" />
      <Cyl p={[0.3, 1.35, 6.3]} rt={0.07} rb={0.07} h={2.7} m="dark_wood" />
      <Cyl p={[4.2, 1.35, 6.3]} rt={0.07} rb={0.07} h={2.7} m="dark_wood" />
    </group>
  );
}

function gable() {
  const s = new THREE.Shape();
  s.moveTo(-6.3, 0);
  s.lineTo(6.3, 0);
  s.lineTo(0, 1.9);
  s.lineTo(-6.3, 0);
  return s;
}

/** Front yard, fence, road, trees, Elias's car and a streetlight. */
export function Yard({ car = true, streetlight = true }: { car?: boolean; streetlight?: boolean }) {
  const floors: FloorDef[] = useMemo(
    () => [
      { x0: -40, z0: -30, x1: 40, z1: 14, y: -0.02, mat: 'grass' },
      { x0: -40, z0: 14, x1: 40, z1: 21, y: -0.01, mat: 'road' },
      { x0: 1.5, z0: 4, x1: 3, z1: 14, y: -0.005, mat: 'concrete' },
    ],
    [],
  );
  const bounds: BlockDef[] = useMemo(
    () => [
      // invisible limits of the playable exterior
      { p: [0, 1.5, 22], s: [80, 3, 0.2], mat: 'black', collide: true },
      { p: [-16, 1.5, 0], s: [0.2, 3, 60], mat: 'black', collide: true },
      { p: [16, 1.5, 0], s: [0.2, 3, 60], mat: 'black', collide: true },
      { p: [0, 1.5, -16], s: [40, 3, 0.2], mat: 'black', collide: true },
    ],
    [],
  );
  return (
    <group>
      <LevelGeometry floors={floors} />
      <group visible={false}>
        <LevelGeometry blocks={bounds} />
      </group>
      <Fence from={[-14, 13]} to={[1.6, 13]} />
      <Fence from={[2.9, 13]} to={[14, 13]} />
      <Fence from={[-14, 13]} to={[-14, -12]} />
      <Fence from={[14, 13]} to={[14, -12]} />
      <Tree pos={[-10, 0, 8]} s={1.1} />
      <Tree pos={[11, 0, 9]} s={0.9} />
      <Tree pos={[-12, 0, -4]} s={1.3} />
      <Tree pos={[12, 0, -6]} s={1.0} />
      <Tree pos={[-20, 0, 26]} s={1.4} />
      <Tree pos={[18, 0, 27]} s={1.2} />
      {car && (
        <group position={[-3.5, 0, 17.6]}>
          <B p={[0, 0.55, 0]} s={[4.2, 0.7, 1.75]} m="metal" color="#2a3036" />
          <B p={[-0.3, 1.1, 0]} s={[2.2, 0.55, 1.6]} m="metal" color="#22282c" />
          {[
            [1.35, 0.85],
            [-1.35, 0.85],
            [1.35, -0.85],
            [-1.35, -0.85],
          ].map(([x, z], i) => (
            <Cyl key={i} p={[x, 0.33, z]} rt={0.33} rb={0.33} h={0.2} m="black" r={[Math.PI / 2, 0, 0]} />
          ))}
          <mesh position={[2.11, 0.65, 0.55]}>
            <boxGeometry args={[0.02, 0.15, 0.3]} />
            <meshStandardMaterial color="#331" emissive="#ffd8a0" emissiveIntensity={0.3} />
          </mesh>
        </group>
      )}
      {streetlight && (
        <group position={[9, 0, 20.5]}>
          <Cyl p={[0, 3, 0]} rt={0.07} rb={0.1} h={6} m="metal" />
          <B p={[-0.6, 6, 0]} s={[1.3, 0.1, 0.12]} m="metal" />
          <mesh position={[-1.15, 5.9, 0]}>
            <boxGeometry args={[0.35, 0.08, 0.2]} />
            <meshStandardMaterial color="#311" emissive="#ffa040" emissiveIntensity={2} />
          </mesh>
          <pointLight position={[-1.15, 5.7, 0]} color="#ff9a40" intensity={30} distance={24} decay={1.6} />
        </group>
      )}
    </group>
  );
}

export function HouseGround({ floorMat = 'wood_floor' as MatKey, wallMat = 'wallpaper' as MatKey, kitchenMat = 'tile' as MatKey, glass = '#0d1622' }) {
  const walls = useMemo(() => groundWalls(wallMat), [wallMat]);
  const floors = useMemo(() => groundFloors(floorMat, kitchenMat), [floorMat, kitchenMat]);
  const blocks = useMemo(() => stairBlocks(), []);
  return (
    <>
      <LevelGeometry walls={walls} floors={floors} blocks={blocks} windowColor={glass} />
      <HouseStairs />
    </>
  );
}
