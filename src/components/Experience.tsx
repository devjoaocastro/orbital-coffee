import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import {
  Environment,
  Float,
  Html,
  Lightformer,
  Sparkles,
  useCursor,
  useScroll,
} from '@react-three/drei'
import { EffectComposer, Bloom, Noise, Vignette } from '@react-three/postprocessing'
import { easing, inSphere } from '../lib/easing'
import { PAGES, roastHover, setScrollEl } from '../scrollBus'

/* Palette ----------------------------------------------------------- */
const CREMA = '#e8d5b5'
const COPPER = '#c47e3d'
const BEAN = '#5e3c24'
const ROAST_LIGHT = '#b08968'
const ROAST_MEDIUM = '#7f5539'
const ROAST_DARK = '#33200f'

/* ------------------------------------------------------------------ */
/* Section wrapper — fades/scales/rotates its content as it enters     */
/* and leaves the viewport while we scroll through the 3D world.       */
/* ------------------------------------------------------------------ */

function Section({ index, z = 0, children }: { index: number; z?: number; children: ReactNode }) {
  const inner = useRef<THREE.Group>(null!)
  const scroll = useScroll()
  const vh = useThree((s) => s.viewport.height)

  useFrame((_, delta) => {
    const progress = scroll.offset * (PAGES - 1) - index // 0 when section centered
    const visibility = Math.max(0, 1 - Math.abs(progress)) // 1 visible → 0 offscreen
    easing.damp3(inner.current.scale, 0.75 + visibility * 0.25, 0.2, delta)
    inner.current.rotation.y = progress * 0.3
    inner.current.position.z = z - (1 - visibility) * 1.8
  })

  return (
    <group position={[0, -index * vh, 0]}>
      <group ref={inner}>{children}</group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Starfield — crema-tinted points scattered through the whole world,  */
/* the cosmic backdrop the beans orbit in.                             */
/* ------------------------------------------------------------------ */

function Starfield() {
  const points = useRef<THREE.Points>(null!)
  const vh = useThree((s) => s.viewport.height)
  const positions = useMemo(() => inSphere(new Float32Array(1100 * 3), 55), [])

  useFrame((_, delta) => {
    points.current.rotation.y += delta * 0.008
  })

  return (
    <points ref={points} position={[0, (-vh * (PAGES - 1)) / 2, -22]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color={CREMA} sizeAttenuation transparent opacity={0.45} depthWrite={false} />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/* Hero — coffee beans as asteroids orbiting a glowing copper sun.     */
/* Hovering the sun flares it and accelerates the whole bean belt.     */
/* ------------------------------------------------------------------ */

const BEAN_COUNT = 140

type BeanOrbit = {
  r: number
  speed: number
  phase: number
  tilt: number
  s: number
  spin: number
  wob: number
}

function BeanSystem() {
  const beans = useRef<THREE.InstancedMesh>(null!)
  const sunMat = useRef<THREE.MeshStandardMaterial>(null!)
  const ringA = useRef<THREE.Mesh>(null!)
  const ringB = useRef<THREE.Mesh>(null!)
  const speed = useRef({ v: 1 })
  const angle = useRef(0)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const data = useMemo<BeanOrbit[]>(
    () =>
      Array.from({ length: BEAN_COUNT }, () => ({
        r: 2.2 + Math.random() * 2.8,
        speed: 0.1 + Math.random() * 0.32,
        phase: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 1.1,
        s: 0.55 + Math.random() * 0.9,
        spin: 0.4 + Math.random() * 1.6,
        wob: Math.random() * Math.PI * 2,
      })),
    [],
  )

  useFrame((state, delta) => {
    easing.damp(speed.current, 'v', hovered ? 2.8 : 1, 0.25, delta)
    if (sunMat.current) easing.damp(sunMat.current, 'emissiveIntensity', hovered ? 3.4 : 1.8, 0.2, delta)
    angle.current += delta * speed.current.v
    const A = angle.current

    data.forEach((b, i) => {
      const a = b.phase + A * b.speed
      const ox = Math.cos(a) * b.r
      const oz = Math.sin(a) * b.r
      dummy.position.set(ox, oz * Math.sin(b.tilt) * 0.65 + Math.sin(A * 0.7 + b.wob) * 0.1, oz * Math.cos(b.tilt))
      dummy.rotation.set(b.wob + A * b.spin * 0.35, a, b.tilt)
      // squashed sphere ≈ coffee bean silhouette
      dummy.scale.set(b.s * 0.24, b.s * 0.17, b.s * 0.13)
      dummy.updateMatrix()
      beans.current.setMatrixAt(i, dummy.matrix)
    })
    beans.current.instanceMatrix.needsUpdate = true

    const t = state.clock.elapsedTime
    ringA.current.rotation.x = t * 0.16 + 0.5
    ringA.current.rotation.y = t * 0.1
    ringB.current.rotation.x = -t * 0.12 - 0.3
    ringB.current.rotation.z = t * 0.09
  })

  return (
    <group>
      {/* the copper sun */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.85, 48, 48]} />
        <meshStandardMaterial
          ref={sunMat}
          color={CREMA}
          emissive={COPPER}
          emissiveIntensity={1.8}
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>
      <pointLight intensity={50} distance={16} color={COPPER} />

      {/* bean asteroid belt */}
      <instancedMesh ref={beans} args={[undefined, undefined, BEAN_COUNT]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color={BEAN} roughness={0.55} metalness={0.15} />
      </instancedMesh>

      {/* faint orbit rings */}
      <mesh ref={ringA} scale={3.1}>
        <torusGeometry args={[1.1, 0.008, 8, 96]} />
        <meshBasicMaterial color={COPPER} wireframe transparent opacity={0.4} />
      </mesh>
      <mesh ref={ringB} scale={3.9}>
        <torusGeometry args={[1.1, 0.006, 8, 96]} />
        <meshBasicMaterial color={CREMA} wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Origin — two farm "planets" with survey pins and HTML labels that   */
/* fade with the scroll (labels ignore fog, so we fade them manually). */
/* ------------------------------------------------------------------ */

function FarmPlanet({
  position,
  name,
  region,
  altitude,
  color,
  sectionIndex,
}: {
  position: [number, number, number]
  name: string
  region: string
  altitude: string
  color: string
  sectionIndex: number
}) {
  const group = useRef<THREE.Group>(null!)
  const planet = useRef<THREE.Mesh>(null!)
  const label = useRef<HTMLDivElement>(null)
  const scroll = useScroll()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame((_, delta) => {
    planet.current.rotation.y += delta * 0.25
    easing.damp3(group.current.scale, hovered ? 1.2 : 1, 0.18, delta)

    // HTML labels ignore fog/depth — only show them while the Origin
    // section is on screen, fading in/out with the scroll.
    if (label.current) {
      const sec = scroll.offset * (PAGES - 1)
      const visibility = Math.max(0, 1 - Math.abs(sec - sectionIndex) * 1.6)
      label.current.style.opacity = visibility.toFixed(3)
      label.current.style.display = visibility < 0.04 ? 'none' : ''
    }
  })

  return (
    <group
      ref={group}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh ref={planet}>
        <sphereGeometry args={[0.95, 48, 48]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* equatorial ring */}
      <mesh rotation={[Math.PI / 2.4, 0.3, 0]}>
        <torusGeometry args={[1.35, 0.012, 8, 80]} />
        <meshBasicMaterial color={COPPER} transparent opacity={0.55} />
      </mesh>
      {/* survey pin */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.6, 8]} />
        <meshStandardMaterial color={COPPER} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color={hovered ? '#ffd9a0' : CREMA} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.6, 0]} intensity={hovered ? 8 : 3} distance={6} color={COPPER} />

      <Html center position={[0, 2.15, 0]} className="pin-html" zIndexRange={[20, 0]}>
        <div ref={label} className={`pin-label ${hovered ? 'pin-label--hot' : ''}`} style={{ opacity: 0, display: 'none' }}>
          <strong>{name}</strong>
          <span>{region}</span>
          <span>{altitude}</span>
        </div>
      </Html>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Roasts — three bean clusters (light / medium / dark). Hovering a    */
/* cluster in 3D — or its roast in the HTML list — pulls the beans     */
/* into a tight ball, like gravity winning.                            */
/* ------------------------------------------------------------------ */

function RoastCluster({
  index,
  position,
  color,
  count = 56,
}: {
  index: number
  position: [number, number, number]
  color: string
  count?: number
}) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const group = useRef<THREE.Group>(null!)
  const tight = useRef({ v: 1 })
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const base = useMemo(() => inSphere(new Float32Array(count * 3), 1.15), [count])
  const extras = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        s: 0.55 + Math.random() * 0.6,
      })),
    [count],
  )

  useFrame((state, delta) => {
    const active = hovered || roastHover.index === index
    easing.damp(tight.current, 'v', active ? 0.42 : 1, 0.2, delta)
    const k = tight.current.v
    group.current.rotation.y += delta * (active ? 0.85 : 0.25)

    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const e = extras[i]
      dummy.position.set(base[i * 3] * k, base[i * 3 + 1] * k, base[i * 3 + 2] * k)
      dummy.rotation.set(e.rx + t * 0.15, e.ry, e.rz)
      dummy.scale.set(e.s * 0.3, e.s * 0.21, e.s * 0.16)
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={group} position={position}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.18} />
      </instancedMesh>
      {/* invisible hit volume so hover works between beans */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[1.45, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Brew — a French press whose plunger descends as you scroll through  */
/* the section. Glass beaker, copper hardware, dark coffee inside.     */
/* ------------------------------------------------------------------ */

function FrenchPress() {
  const plunger = useRef<THREE.Group>(null!)
  const knobMat = useRef<THREE.MeshStandardMaterial>(null!)
  const scroll = useScroll()
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame((_, delta) => {
    // plunge happens across the Brew section (page 3)
    const r = scroll.range(2.55 / (PAGES - 1), 0.9 / (PAGES - 1))
    easing.damp(plunger.current.position, 'y', 1.55 - r * 1.35, 0.12, delta)
    easing.damp(knobMat.current, 'emissiveIntensity', hovered ? 1.4 : 0.35, 0.2, delta)
  })

  return (
    <group
      scale={1.05}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* glass beaker */}
      <mesh>
        <cylinderGeometry args={[0.95, 0.95, 2.3, 40, 1, true]} />
        <meshStandardMaterial
          color={CREMA}
          transparent
          opacity={0.14}
          roughness={0.1}
          metalness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* coffee inside */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.88, 0.88, 1.0, 32]} />
        <meshStandardMaterial color="#21130a" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* base + collar */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[1.04, 1.08, 0.12, 40]} />
        <meshStandardMaterial color={COPPER} metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.18, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.09, 40]} />
        <meshStandardMaterial color={COPPER} metalness={0.85} roughness={0.3} />
      </mesh>
      {/* handle */}
      <mesh position={[1.18, 0, 0]}>
        <boxGeometry args={[0.09, 1.5, 0.14]} />
        <meshStandardMaterial color={COPPER} metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[1.06, 0.78, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.32, 0.09, 0.14]} />
        <meshStandardMaterial color={COPPER} metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[1.06, -0.78, 0]} rotation={[0, 0, 0.5]}>
        <boxGeometry args={[0.32, 0.09, 0.14]} />
        <meshStandardMaterial color={COPPER} metalness={0.8} roughness={0.35} />
      </mesh>

      {/* plunger: knob + rod + filter disc, descends with the scroll */}
      <group ref={plunger} position={[0, 1.55, 0]}>
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.17, 24, 24]} />
          <meshStandardMaterial
            ref={knobMat}
            color={COPPER}
            emissive={COPPER}
            emissiveIntensity={0.35}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.045, 0.045, 2.4, 12]} />
          <meshStandardMaterial color={COPPER} metalness={0.9} roughness={0.25} />
        </mesh>
        <mesh position={[0, -1.2, 0]}>
          <cylinderGeometry args={[0.86, 0.86, 0.07, 32]} />
          <meshStandardMaterial color="#8a6a4a" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>

      {/* steam wisps */}
      <Sparkles count={26} position={[0, 1.9, 0]} scale={[1.2, 1.4, 1.2]} size={2.2} speed={0.18} color={CREMA} opacity={0.5} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Pour — a V60 dripper feeding a carafe with a particle stream of     */
/* droplets. Scroll velocity drives the stream: scroll fast, pour      */
/* fast. The carafe fills as you move through the section.             */
/* ------------------------------------------------------------------ */

const DROP_COUNT = 90

function V60Pour() {
  const geom = useRef<THREE.BufferGeometry>(null!)
  const liquid = useRef<THREE.Mesh>(null!)
  const scroll = useScroll()

  const positions = useMemo(() => new Float32Array(DROP_COUNT * 3), [])
  const drops = useMemo(
    () =>
      Array.from({ length: DROP_COUNT }, () => ({
        phase: Math.random(),
        speed: 0.55 + Math.random() * 0.7,
        x: (Math.random() - 0.5) * 0.09,
        z: (Math.random() - 0.5) * 0.09,
      })),
    [],
  )

  useFrame((_, delta) => {
    // scroll velocity → pour intensity
    const vel = THREE.MathUtils.clamp(Math.abs(scroll.delta) * 80, 0, 4)
    const k = 0.35 + vel
    const TOP = 0.2
    const BOTTOM = -1.15

    drops.forEach((d, i) => {
      d.phase = (d.phase + delta * d.speed * k) % 1
      positions[i * 3] = d.x
      positions[i * 3 + 1] = TOP + (BOTTOM - TOP) * d.phase
      positions[i * 3 + 2] = d.z
    })
    const attr = geom.current.attributes.position as THREE.BufferAttribute
    attr.needsUpdate = true

    // carafe fills across the Pour section (page 4)
    const fill = scroll.range(3.6 / (PAGES - 1), 0.9 / (PAGES - 1))
    const h = Math.max(0.001, fill * 0.62)
    liquid.current.scale.set(1, h, 1)
    liquid.current.position.y = -1.55 + (h * 0.62) / 2
  })

  return (
    <group scale={1.1} position={[0, 0.15, 0]}>
      {/* ceramic V60 cone (open) */}
      <mesh position={[0, 0.85, 0]}>
        <cylinderGeometry args={[1.0, 0.13, 1.05, 48, 1, true]} />
        <meshStandardMaterial color={CREMA} roughness={0.4} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>
      {/* copper collar on the cone rim */}
      <mesh position={[0, 1.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.0, 0.035, 12, 64]} />
        <meshStandardMaterial color={COPPER} metalness={0.9} roughness={0.25} />
      </mesh>
      {/* stand ring + legs */}
      <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.03, 10, 48]} />
        <meshStandardMaterial color={COPPER} metalness={0.85} roughness={0.3} />
      </mesh>

      {/* droplet stream */}
      <points>
        <bufferGeometry ref={geom}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.055} color="#d9a96a" sizeAttenuation transparent opacity={0.95} depthWrite={false} />
      </points>

      {/* glass carafe */}
      <mesh position={[0, -1.25, 0]}>
        <cylinderGeometry args={[0.72, 0.56, 0.95, 40, 1, true]} />
        <meshStandardMaterial
          color={CREMA}
          transparent
          opacity={0.14}
          roughness={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* rising coffee level */}
      <mesh ref={liquid} position={[0, -1.55, 0]}>
        <cylinderGeometry args={[0.6, 0.56, 0.62, 32]} />
        <meshStandardMaterial color="#241408" roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, -1.76, 0]}>
        <cylinderGeometry args={[0.62, 0.66, 0.08, 40]} />
        <meshStandardMaterial color={COPPER} metalness={0.85} roughness={0.3} />
      </mesh>

      {/* steam over the carafe */}
      <Sparkles count={30} position={[0, -0.45, 0]} scale={[1.1, 1.3, 1.1]} size={2} speed={0.16} color={CREMA} opacity={0.45} />
      <pointLight position={[0, -0.4, 1.4]} intensity={6} distance={6} color={COPPER} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Club — a copper particle galaxy with a glowing core: the orbit you  */
/* are invited to join.                                                */
/* ------------------------------------------------------------------ */

function ClubGalaxy({ count = 2200 }: { count?: number }) {
  const points = useRef<THREE.Points>(null!)
  const positions = useMemo(() => inSphere(new Float32Array(count * 3), 3.4), [count])

  useFrame((_, delta) => {
    points.current.rotation.y += delta * 0.06
    points.current.rotation.x += delta * 0.02
  })

  return (
    <group>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.024} color="#d9a96a" sizeAttenuation transparent opacity={0.85} depthWrite={false} />
      </points>
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={CREMA} emissive={COPPER} emissiveIntensity={2.4} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Contact — one giant bean with copper orbit rings. Click it to give  */
/* it a spin impulse.                                                  */
/* ------------------------------------------------------------------ */

function ContactBean() {
  const bean = useRef<THREE.Group>(null!)
  const mat = useRef<THREE.MeshStandardMaterial>(null!)
  const ring = useRef<THREE.Mesh>(null!)
  const impulse = useRef(0)
  const [hovered, setHovered] = useState(false)
  useCursor(hovered)

  useFrame((state, delta) => {
    impulse.current = THREE.MathUtils.damp(impulse.current, 0, 1.5, delta)
    bean.current.rotation.y += delta * (0.35 + impulse.current)
    bean.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.15
    ring.current.rotation.x = state.clock.elapsedTime * 0.2 + 0.6
    ring.current.rotation.y = state.clock.elapsedTime * 0.14
    easing.damp(mat.current, 'emissiveIntensity', hovered ? 0.7 : 0.18, 0.2, delta)
  })

  return (
    <group position={[0, -0.2, -1]}>
      <group
        ref={bean}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={() => setHovered(false)}
        onClick={() => (impulse.current += 6)}
      >
        <mesh scale={[1.7, 1.2, 0.9]}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshStandardMaterial
            ref={mat}
            color={BEAN}
            emissive={COPPER}
            emissiveIntensity={0.18}
            roughness={0.45}
            metalness={0.25}
          />
        </mesh>
        {/* center crease */}
        <mesh scale={[1.55, 1.08, 1]} position={[0, 0, 0.62]} rotation={[0.25, 0, 0]}>
          <torusGeometry args={[0.6, 0.03, 8, 64]} />
          <meshStandardMaterial color="#1d1108" roughness={0.6} />
        </mesh>
      </group>
      <mesh ref={ring} scale={2.6}>
        <torusGeometry args={[1.1, 0.01, 8, 96]} />
        <meshBasicMaterial color={COPPER} wireframe transparent opacity={0.45} />
      </mesh>
      <Sparkles count={90} scale={[8, 5, 5]} size={2} speed={0.25} color={CREMA} opacity={0.55} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Experience root — orbiting/descending camera rig, lights, post FX.  */
/* The camera sweeps around the bean field on the first stretch, then  */
/* settles in front and descends toward the cups.                      */
/* ------------------------------------------------------------------ */

export default function Experience() {
  const scroll = useScroll()
  const vh = useThree((s) => s.viewport.height)
  const vw = useThree((s) => s.viewport.width)
  const lightRig = useRef<THREE.Group>(null!)

  useEffect(() => {
    setScrollEl(scroll.el)
  }, [scroll.el])

  useFrame((state, delta) => {
    const o = scroll.offset
    const y = -o * vh * (PAGES - 1)

    // orbital sweep: camera circles the bean field over the first ~1.6
    // pages, then locks ahead and descends toward the brew gear.
    const sec = o * (PAGES - 1)
    const sweep = 1 - THREE.MathUtils.smoothstep(sec, 0, 1.6)
    const theta = sweep * 0.9
    const tx = Math.sin(theta) * 10 + state.pointer.x * 0.7
    const tz = Math.cos(theta) * 10

    easing.damp3(state.camera.position, [tx, y - state.pointer.y * 0.35, tz], 0.28, delta)
    state.camera.lookAt(0, y, 0)
    if (lightRig.current) lightRig.current.position.y = y

    // feed the DOM progress bar
    document.documentElement.style.setProperty('--scroll', o.toFixed(4))
  })

  const x = (f: number) => vw * f

  return (
    <>
      <ambientLight intensity={0.35} />
      <group ref={lightRig}>
        <pointLight position={[6, 2, 6]} intensity={55} color={COPPER} />
        <pointLight position={[-6, -2, 4]} intensity={38} color="#f0e0c0" />
      </group>

      {/* warm studio reflections without any network fetch */}
      <Environment resolution={64}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer intensity={3.5} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
          <Lightformer color={COPPER} intensity={2} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
          <Lightformer color={CREMA} intensity={1.6} position={[10, 1, 0]} rotation-y={-Math.PI / 2} scale={[20, 1, 1]} />
        </group>
      </Environment>

      <Starfield />

      {/* ambient roast dust across the whole scroll length */}
      <Sparkles
        count={240}
        scale={[vw * 1.6, vh * PAGES, 10]}
        position={[0, (-vh * (PAGES - 1)) / 2, -2]}
        size={1.6}
        speed={0.22}
        color={COPPER}
        opacity={0.45}
      />

      {/* 0 — Hero: bean asteroids around the copper sun */}
      <Section index={0}>
        <BeanSystem />
      </Section>

      {/* 1 — Origin: two farm planets */}
      <Section index={1}>
        <group position={[x(0.2), 0, 0]}>
          <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.5}>
            <FarmPlanet
              position={[-1.7, 0.55, 0]}
              name="Fazenda Vértice"
              region="Caparaó · Brazil"
              altitude="1,250 m"
              color="#6b4226"
              sectionIndex={1}
            />
          </Float>
          <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.5}>
            <FarmPlanet
              position={[1.8, -0.75, 0.4]}
              name="Adola Highlands"
              region="Yirgacheffe · Ethiopia"
              altitude="2,050 m"
              color="#8a5a33"
              sectionIndex={1}
            />
          </Float>
        </group>
      </Section>

      {/* 2 — Roasts: three clusters, light → dark */}
      <Section index={2}>
        <group position={[x(0.24), 0, 0]} scale={0.85}>
          <Float speed={1.3} rotationIntensity={0.2} floatIntensity={0.4}>
            <RoastCluster index={0} position={[-2.5, 1.1, 0]} color={ROAST_LIGHT} />
          </Float>
          <Float speed={1.1} rotationIntensity={0.2} floatIntensity={0.4}>
            <RoastCluster index={1} position={[0.1, -0.9, 0.3]} color={ROAST_MEDIUM} />
          </Float>
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
            <RoastCluster index={2} position={[2.6, 1.0, -0.2]} color={ROAST_DARK} />
          </Float>
        </group>
      </Section>

      {/* 3 — Brew: French press, plunger rides the scroll */}
      <Section index={3}>
        <group position={[x(0.2), 0, 0]}>
          <FrenchPress />
        </group>
      </Section>

      {/* 4 — Pour: V60 + droplet stream driven by scroll velocity */}
      <Section index={4}>
        <group position={[x(0.2), 0, 0]}>
          <V60Pour />
        </group>
      </Section>

      {/* 5 — Club: copper galaxy */}
      <Section index={5}>
        <ClubGalaxy />
      </Section>

      {/* 6 — Contact: the giant bean */}
      <Section index={6}>
        <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.6}>
          <ContactBean />
        </Float>
      </Section>

      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={0.25} luminanceSmoothing={0.7} mipmapBlur />
        <Noise opacity={0.05} />
        <Vignette offset={0.15} darkness={0.85} />
      </EffectComposer>
    </>
  )
}
