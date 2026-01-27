import { getAllMutations, getMutationById } from '../../lib/mutations'

export default function handler(req, res){
  const { id } = req.query
  if(id){
    const m = getMutationById(id)
    if(!m) return res.status(404).json({ error: 'Not found' })
    return res.status(200).json(m)
  }
  const list = getAllMutations()
  res.status(200).json(list)
}
