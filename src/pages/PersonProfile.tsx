import { useParams } from 'react-router-dom'

export default function PersonProfile() {
  const { slug } = useParams()
  return <h1>Person: {slug}</h1>
}
