import Hero from '../components/Hero'
import SiteOverview from '../components/SiteOverview'
import Intro from '../components/Intro'
import LiveShowcase from '../components/LiveShowcase'
import HowItWorks from '../components/HowItWorks'
import PlatformStats from '../components/PlatformStats'
import FooterCta from '../components/FooterCta'

export default function HomePage() {
  return (
    <>
      <Hero />
      <SiteOverview />
      <Intro />
      <LiveShowcase />
      <HowItWorks />
      <PlatformStats />
      <FooterCta />
    </>
  )
}
