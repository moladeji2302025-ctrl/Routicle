import FeedCard from './FeedCard'
import Reveal from './Reveal'

export default function FeedGrid({ items }) {
  return (
    <div className="feed-grid">
      {items.map((item, i) => (
        <Reveal key={item.id} delay={(i % 5) * 70}>
          <FeedCard item={item} />
        </Reveal>
      ))}
    </div>
  )
}
