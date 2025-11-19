import { useRef, useState } from 'react'

export default function Controls({ onMediaSelected, onRender, deviceColor, setDeviceColor, preset, setPreset }) {
  const fileInputRef = useRef(null)
  const [resolution, setResolution] = useState('1080')
  const [duration, setDuration] = useState(3)

  const pickFile = () => fileInputRef.current?.click()

  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    onMediaSelected({ file: f, url, type: f.type })
  }

  return (
    <div className="w-full md:w-80 lg:w-96 p-4 border-l border-white/10 bg-slate-900/40 backdrop-blur-sm">
      <h2 className="text-white font-semibold mb-3">Controls</h2>

      <div className="space-y-4 text-sm">
        <div>
          <label className="block text-slate-300 mb-1">Device Color</label>
          <input type="color" value={deviceColor} onChange={(e)=>setDeviceColor(e.target.value)} className="w-full h-10 bg-slate-800/60 border border-white/10 rounded" />
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Preset</label>
          <select value={preset} onChange={(e)=>setPreset(e.target.value)} className="w-full bg-slate-800/60 border border-white/10 rounded px-2 py-2 text-white">
            <option value="orbit">Orbit</option>
            <option value="dolly">Dolly</option>
            <option value="rotate">Rotate</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-slate-300 mb-1">Resolution</label>
            <select value={resolution} onChange={(e)=>setResolution(e.target.value)} className="w-full bg-slate-800/60 border border-white/10 rounded px-2 py-2 text-white">
              <option value="720">1280x720</option>
              <option value="1080">1920x1080</option>
              <option value="2160">3840x2160</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-300 mb-1">Duration (s)</label>
            <input type="number" min="1" max="10" value={duration} onChange={(e)=>setDuration(parseInt(e.target.value)||3)} className="w-full bg-slate-800/60 border border-white/10 rounded px-2 py-2 text-white" />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 mb-1">Upload Image/Video</label>
          <div className="flex items-center gap-2">
            <button onClick={pickFile} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded">Choose File</button>
            <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm" onChange={onFileChange} className="hidden" />
          </div>
        </div>

        <button onClick={()=>onRender({ resolution, duration })} className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium">Render Video</button>
      </div>
    </div>
  )
}
