import { useEffect, useState } from 'react'

export default function Sidebar({ selectedPreset, onSelectPreset }) {
  const [presets, setPresets] = useState([
    { id: 'orbit', name: 'Orbit', description: '360° orbit' },
    { id: 'dolly', name: 'Dolly', description: 'Push in/out' },
    { id: 'rotate', name: 'Rotate', description: 'Rotate device' },
  ])

  useEffect(() => {
    const load = async () => {
      try {
        const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
        const res = await fetch(`${baseUrl}/presets`)
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.presets)) setPresets(data.presets)
        }
      } catch (e) {
        // ignore, keep defaults
      }
    }
    load()
  }, [])

  return (
    <div className="w-full md:w-60 lg:w-72 xl:w-80 p-4 border-r border-white/10 bg-slate-900/40 backdrop-blur-sm">
      <h2 className="text-white font-semibold mb-3">Shots</h2>
      <div className="space-y-2">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectPreset(p.id)}
            className={`w-full text-left px-3 py-2 rounded-md border transition ${
              selectedPreset === p.id
                ? 'bg-blue-500/20 border-blue-400/40 text-blue-100'
                : 'bg-slate-800/60 border-white/10 text-slate-200 hover:bg-slate-700/50'
            }`}
          >
            <div className="text-sm font-medium">{p.name}</div>
            <div className="text-xs opacity-70">{p.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
