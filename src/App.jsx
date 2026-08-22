import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProductShowcase from './components/ProductShowcase'
import Capabilities from './components/Capabilities'
import FeedFilters from './components/FeedFilters'
import FeedGrid from './components/FeedGrid'
import Comparison from './components/Comparison'
import Footer from './components/Footer'
import IntroReveal from './components/IntroReveal'
import { FEED_ITEMS } from './data/feedItems'

export default function App() {
  return (
    <>
      <IntroReveal />
      <div className="page">
        <Navbar />
        <Hero />
        <ProductShowcase />
        <Capabilities />
        <FeedFilters />
        <FeedGrid items={FEED_ITEMS} />
        <Comparison />
        <Footer />
      </div>
    </>
  )
}
