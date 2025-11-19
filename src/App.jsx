import { useEffect, useMemo, useRef, useState } from 'react'
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
  const workerRef = useRef(null)

  useEffect(() => {
    // Lazy create worker
    const code = document.querySelector('script[data-worker]')?.textContent
    if (!workerRef.current && code) {
      const blob = new Blob([code], { type: 'text/javascript' })
      const url = URL.createObjectURL(blob)
      workerRef.current = new Worker(url)
      workerRef.current.onmessage = (e) => {
        if (e.data?.type === 'progress') setProgress(e.data.progress)
        if (e.data?.type === 'done') {
          setRendering(false)
          setVideoUrl(e.data.url)
        }
      }
    }
  }, [])

  const handleRender = ({ resolution, duration }) => {
    setRendering(true)
    setProgress(0)
    setVideoUrl(null)
    workerRef.current?.postMessage({ cmd: 'render', payload: { resolution, duration, preset } })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="h-14 border-b border-white/10 flex items-center px-4 gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <div className="font-semibold">PromoGen MVP</div>
        <div className="opacity-60 text-sm">Client-side 3D preview + mock render</div>
      </header>
      <div className="flex-1 grid grid-rows-[1fr_auto] md:grid-rows-1 md:grid-cols-[auto_1fr_auto]">
        <Sidebar selectedPreset={preset} onSelectPreset={setPreset} />

        <main className="relative bg-slate-900/30">
          <div className="absolute inset-0">
            <Viewer media={media} preset={preset} deviceColor={deviceColor} />
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

      {/* Inline worker source for simplicity in this environment */}
      <script type="text/worker" data-worker>
        {`
          ${inlineWorker()}
        `}
      </script>
    </div>
  )
}

function inlineWorker() {
  return `
  self.onmessage = async (e) => {
    const { cmd, payload } = e.data || {}
    if (cmd === 'render') {
      const total = (payload.duration || 3) * 30
      for (let i = 0; i <= total; i++) {
        await new Promise(r => setTimeout(r, 10))
        self.postMessage({ type: 'progress', progress: i / total })
      }
      const off = new OffscreenCanvas(320, 180)
      const ctx = off.getContext('2d')
      const stream = off.captureStream(30)
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
      let chunks = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      const done = new Promise(res => recorder.onstop = res)
      recorder.start()
      const frames = Math.max(60, total)
      for (let i=0;i<frames;i++) {
        ctx.fillStyle = 'hsl(' + ((i/frames)*360) + ',80%,50%)'
        ctx.fillRect(0,0,320,180)
        ctx.fillStyle = 'white'
        ctx.font = '16px sans-serif'
        ctx.fillText('Rendering preset: ' + payload.preset + ' | Frame ' + (i+1), 10, 30)
        await new Promise(r => setTimeout(r, 16))
      }
      recorder.stop()
      await done
      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      self.postMessage({ type: 'done', url })
    }
  }
  `
}

export default App
