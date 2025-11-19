import { useRef, useState } from 'react'
import Sidebar from './components/Sidebar'
import Viewer from './components/Viewer'
import Controls from './components/Controls'

function App() {
  const [preset, setPreset] = useState('orbit')
  const [deviceColor, setDeviceColor] = useState('#111827')
  const [media, setMedia] = useState(null)
  const [progress, setProgress] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)
  const viewerRef = useRef(null)

  const handleRender = async ({ resolution, duration }) => {
    // Map resolution height to 16:9 width/height
    const h = parseInt(resolution, 10) || 1080
    const w = Math.round(h * (16 / 9))
    const fps = 30
    const totalMs = (parseFloat(duration) || 3) * 1000

    const viewerApi = viewerRef.current
    if (!viewerApi) return

    // Prepare canvas and recorder
    viewerApi.setRenderResolution(w, h)
    const canvas = viewerApi.getCanvas()
    if (!canvas) return

    const stream = canvas.captureStream(fps)
    let mimeType = 'video/webm;codecs=vp9'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8'
    }
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
    const chunks = []
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }

    setRendering(true)
    setProgress(0)
    setVideoUrl(null)

    const done = new Promise((resolve) => {
      recorder.onstop = resolve
    })

    recorder.start(Math.round(1000 / fps))

    // Drive progress for the requested duration while Viewer renders normally
    const start = performance.now()
    const tick = () => {
      const now = performance.now()
      const elapsed = now - start
      const p = Math.min(1, elapsed / totalMs)
      setProgress(p)
      if (p < 1) {
        requestAnimationFrame(tick)
      } else {
        recorder.stop()
      }
    }
    requestAnimationFrame(tick)

    await done

    const blob = new Blob(chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)

    setRendering(false)
    setVideoUrl(url)

    // Restore canvas resolution to UI size
    viewerApi.clearRenderResolution()
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="h-14 border-b border-white/10 flex items-center px-4 gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <div className="font-semibold">PromoGen MVP</div>
        <div className="opacity-60 text-sm">Client-side 3D preview + real capture</div>
      </header>
      <div className="flex-1 grid grid-rows-[1fr_auto] md:grid-rows-1 md:grid-cols-[auto_1fr_auto]">
        <Sidebar selectedPreset={preset} onSelectPreset={setPreset} />

        <main className="relative bg-slate-900/30">
          <div className="absolute inset-0">
            <Viewer ref={viewerRef} media={media} preset={preset} deviceColor={deviceColor} />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-4 w-[min(640px,90%)]">
            <div className="bg-slate-900/70 backdrop-blur border border-white/10 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${rendering ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                  {rendering ? 'Rendering…' : videoUrl ? 'Render complete' : 'Idle'}
                </div>
                <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.round(progress*100)}%` }} />
                </div>
                {videoUrl && (
                  <a className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500" href={videoUrl} download>
                    Download
                  </a>
                )}
              </div>
            </div>
          </div>
        </main>

        <Controls
          onMediaSelected={setMedia}
          onRender={handleRender}
          deviceColor={deviceColor}
          setDeviceColor={setDeviceColor}
          preset={preset}
          setPreset={setPreset}
        />
      </div>
    </div>
  )
}

export default App
