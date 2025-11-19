/*
  Simplified rendering worker placeholder.
  In a full implementation, use OffscreenCanvas + three.js + ffmpeg.wasm to encode frames.
  Here we simulate progress and return a small demo blob to showcase UX.
*/
self.onmessage = async (e) => {
  const { cmd, payload } = e.data || {}
  if (cmd === 'render') {
    const total = (payload.duration || 3) * 30
    for (let i = 0; i <= total; i++) {
      await new Promise(r => setTimeout(r, 10))
      self.postMessage({ type: 'progress', progress: i / total })
    }
    // Create a dummy WebM from a canvas
    const off = new OffscreenCanvas(320, 180)
    const ctx = off.getContext('2d')
    ctx.fillStyle = '#0ea5e9'
    ctx.fillRect(0,0,320,180)
    ctx.fillStyle = 'white'
    ctx.font = '16px sans-serif'
    ctx.fillText('PromoGen Mock Render', 10, 30)

    const stream = off.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    let chunks = []
    recorder.ondataavailable = (e) => chunks.push(e.data)
    const done = new Promise(res => recorder.onstop = res)
    recorder.start()

    const frames = 60
    for (let i=0;i<frames;i++) {
      ctx.fillStyle = `hsl(${(i/frames)*360},80%,50%)`
      ctx.fillRect(0,0,320,180)
      ctx.fillStyle = 'white'
      ctx.fillText(`Frame ${i+1}`, 10, 30)
      await new Promise(r => setTimeout(r, 16))
    }

    recorder.stop()
    await done

    const blob = new Blob(chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    self.postMessage({ type: 'done', url })
  }
}
