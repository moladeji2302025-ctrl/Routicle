import Hero from '../components/Hero'
import ProductShowcase from '../components/ProductShowcase'
import BrowseBySoftware from '../components/BrowseBySoftware'
import Capabilities from '../components/Capabilities'
import Stats from '../components/Stats'
import FeedFilters from '../components/FeedFilters'
import FeedGrid from '../components/FeedGrid'
import Comparison from '../components/Comparison'
import FooterCta from '../components/FooterCta'
import { useApp } from '../context/AppContext'

export default function HomePage() {
  const { contentItems } = useApp()
  const approved = contentItems.filter((item) => item.moderationStatus === 'approved')

  return (
    <>
      <Hero />
      <div className="projects-section">
        <FeedFilters />
        <FeedGrid items={approved} />
      </div>
      <ProductShowcase />
      <BrowseBySoftware />
      <Capabilities />
      <Stats />
      <Comparison />
      <FooterCta />
    </>
  )
}
