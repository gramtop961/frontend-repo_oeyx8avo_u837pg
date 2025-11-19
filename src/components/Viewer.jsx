import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'

const Viewer = forwardRef(function Viewer({ media, preset, deviceColor }, ref) {
  const canvasRef = useRef(null)
  const cleanupRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const sceneRef = useRef(null)
  const phoneGroupRef = useRef(null)
  const screenRef = useRef(null)
  const screenTextureRef = useRef(null)
  const overrideSizeRef = useRef(null) // {w,h} when recording

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // Initial size based on client box
    const initialW = canvas.clientWidth || 800
    const initialH = canvas.clientHeight || 600
    renderer.setSize(initialW, initialH, false)
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping

    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(35, initialW / initialH, 0.1, 100)
    camera.position.set(2.2, 1.2, 2.6)
    cameraRef.current = camera

    const resize = () => {
      const w = overrideSizeRef.current?.w ?? canvas.clientWidth
      const h = overrideSizeRef.current?.h ?? canvas.clientHeight
      if (!w || !h) return
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
    phoneGroupRef.current = phoneGroup
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
    screenRef.current = screen

    // If media is image, map as texture
    if (media && media.type?.startsWith('image/')) {
      const tex = new THREE.TextureLoader().load(media.url)
      tex.colorSpace = THREE.SRGBColorSpace
      screen.material.map = tex
      screen.material.emissiveMap = tex
      screen.material.emissive = new THREE.Color(0xffffff)
      screen.material.needsUpdate = true
      screenTextureRef.current = tex
    }

    scene.add(phoneGroup)

    const clock = new THREE.Clock()
    const animatePreset = (t) => {
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
      if (screenTextureRef.current) screenTextureRef.current.dispose()
    }
  }, [])

  // Respond to prop changes:
  useEffect(() => {
    // Update body color
    if (phoneGroupRef.current) {
      const body = phoneGroupRef.current.children[0]
      if (body && body.material) body.material.color = new THREE.Color(deviceColor || '#111827')
    }
  }, [deviceColor])

  useEffect(() => {
    // Update media texture
    const screen = screenRef.current
    if (!screen) return
    if (screenTextureRef.current) {
      screenTextureRef.current.dispose()
      screenTextureRef.current = null
    }
    if (media && media.type?.startsWith('image/')) {
      const tex = new THREE.TextureLoader().load(media.url)
      tex.colorSpace = THREE.SRGBColorSpace
      screen.material.map = tex
      screen.material.emissiveMap = tex
      screen.material.emissive = new THREE.Color(0xffffff)
      screen.material.needsUpdate = true
      screenTextureRef.current = tex
    } else {
      screen.material.map = null
      screen.material.emissiveMap = null
      screen.material.emissive = new THREE.Color(0x000000)
      screen.material.needsUpdate = true
    }
  }, [media])

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    setRenderResolution: (w, h) => {
      overrideSizeRef.current = { w, h }
      const r = rendererRef.current
      const c = cameraRef.current
      if (!r || !c) return
      r.setSize(w, h, false)
      c.aspect = w / h
      c.updateProjectionMatrix()
    },
    clearRenderResolution: () => {
      overrideSizeRef.current = null
      // Trigger a resize to client size
      const canvas = canvasRef.current
      if (!canvas) return
      const r = rendererRef.current
      const c = cameraRef.current
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!r || !c || !w || !h) return
      r.setSize(w, h, false)
      c.aspect = w / h
      c.updateProjectionMatrix()
    },
  }), [])

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  )
})

export default Viewer
