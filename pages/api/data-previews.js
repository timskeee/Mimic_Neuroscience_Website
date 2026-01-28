import fs from 'fs'
import path from 'path'

export default function handler(req, res){
  try {
    const dataDir = path.join(process.cwd(), 'public', 'data')
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'))
    const previews = files.map(f => {
      const filePath = path.join(dataDir, f)
      try {
        const raw = fs.readFileSync(filePath, 'utf8')
        const parsed = JSON.parse(raw)
        const id = f.replace(/\.json$/,'')
        const meta = parsed.metadata || {}
        return {
          id,
          name: meta.name || meta.title || id,
          summary: meta.summary || parsed.summary || '',
          preview: `/data/${f}`,
          hasTrace: !!(parsed.times && parsed.voltages),
          hasSpikes: !!parsed.spikes,
          metadata: meta
        }
      } catch (e) {
        return null
      }
    }).filter(Boolean)
    res.status(200).json(previews)
  } catch (e){
    res.status(500).json({ error: e.message })
  }
}
