import { getData } from '../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const data = await getData()
  res.status(200).json(data)
}
