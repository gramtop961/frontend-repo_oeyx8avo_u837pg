import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

export default function Viewer({ media, preset, deviceColor }) {
  const canvasRef = useRef(null)
  const cleanupRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
    camera.position.set(2.2, 1.2, 2.6)

    const controls = { t: 0 }

    const resize = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', resize)

    // Lighting via HDRI
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    new RGBELoader().load('/studio.hdr', (hdr) => {
      const envMap = pmremGenerator.fromEquirectangular(hdr).texture
      scene.environment = envMap
      scene.background = null
      hdr.dispose()
      pmremGenerator.dispose()
    })

    // Ground faint shadow
    const ground = new THREE.Mesh(new THREE.CircleGeometry(2.5, 64), new THREE.ShadowMaterial({ opacity: 0.2 }))
    ground.receiveShadow = true
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.5
    scene.add(ground)

    // Placeholder phone if GLB missing
    const phoneGroup = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.45, 0.06),
      new THREE.MeshStandardMaterial({ color: deviceColor || '#111827', metalness: 0.7, roughness: 0.35 })
    )
    phoneGroup.add(body)
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.63, 1.35),
      new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000 })
    )
    screen.position.z = 0.031
    phoneGroup.add(screen)

    // If media is image, map as texture
    let screenTexture = null
    if (media && media.type.startsWith('image/')) {
      const tex = new THREE.TextureLoader().load(media.url)
      tex.colorSpace = THREE.SRGBColorSpace
      screen.material.map = tex
      screen.material.emissiveMap = tex
      screen.material.emissive = new THREE.Color(0xffffff)
      screen.material.needsUpdate = true
      screenTexture = tex
    }

    scene.add(phoneGroup)

    // Animation presets
    const animatePreset = (time) => {
      const t = (time * 0.001) % 6
      if (preset === 'dolly') {
        camera.position.set(1.5 + Math.sin(t) * 0.8, 1.1, 2.2 + Math.cos(t) * 0.5)
        camera.lookAt(0, 0.2, 0)
      } else if (preset === 'rotate') {
        phoneGroup.rotation.y = t * 0.5
        camera.position.set(2.2, 1.2, 2.6)
        camera.lookAt(0, 0.2, 0)
      } else {
        // orbit
        camera.position.set(Math.cos(t) * 2.2, 1.2, Math.sin(t) * 2.2)
        camera.lookAt(0, 0.2, 0)
      }
    }

    const clock = new THREE.Clock()
    const renderLoop = () => {
      const elapsed = clock.getElapsedTime()
      animatePreset(elapsed)
      renderer.render(scene, camera)
      cleanupRef.current = requestAnimationFrame(renderLoop)
    }
    renderLoop()

    return () => {
      window.removeEventListener('resize', resize)
      if (cleanupRef.current) cancelAnimationFrame(cleanupRef.current)
      renderer.dispose()
      if (screenTexture) screenTexture.dispose()
    }
  }, [preset, deviceColor, media])

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
}
