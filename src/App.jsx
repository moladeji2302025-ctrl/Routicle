import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProductShowcase from './components/ProductShowcase'
import Capabilities from './components/Capabilities'
import Stats from './components/Stats'
import FeedFilters from './components/FeedFilters'
import FeedGrid from './components/FeedGrid'
import Comparison from './components/Comparison'
import FooterCta from './components/FooterCta'
import Footer from './components/Footer'
import IntroReveal from './components/IntroReveal'
import ScrollLines from './components/ScrollLines'
import { FEED_ITEMS } from './data/feedItems'

export default function App() {
  return (
    <>
      <IntroReveal />
      <div className="page">
        <ScrollLines />
        <Navbar />
        <Hero />
        <ProductShowcase />
        <div className="projects-section">
          <FeedFilters />
          <FeedGrid items={FEED_ITEMS} />
        </div>
        <Capabilities />
        <Stats />
        <Comparison />
        <FooterCta />
        <Footer />
      </div>
    </>
  )
}
