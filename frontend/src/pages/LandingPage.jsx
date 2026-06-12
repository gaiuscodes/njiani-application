import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import InteractiveMap from '../components/InteractiveMap';
import AnimatedSection from '../components/AnimatedSection';

// NavLink component with smooth underline animation
const NavLink = ({ to, children }) => {
  return (
    <Link
      to={to}
      className="relative text-gray-300 hover:text-primary-500 transition-colors duration-300 group cursor-pointer"
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary-500 transition-all duration-300 group-hover:w-full"></span>
    </Link>
  );
};

const LandingPage = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "How does Njiani work?",
      answer: "Njiani connects shops with delivery riders. Shops create delivery orders, riders place bids with their prices and estimated delivery times, and shops choose the best bid. Riders then pick up and deliver the goods with real-time tracking."
    },
    {
      question: "How do I become a rider?",
      answer: "Simply click 'Become a Rider' and complete the registration form. You'll need to provide your personal details, vehicle information, and upload required documents (ID, license, selfie). Once approved, you can start accepting delivery orders and earning money."
    },
    {
      question: "How do I register my shop?",
      answer: "Click 'Register Your Shop' and fill out the registration form with your shop details, address, and contact information. After email verification, you can start creating delivery orders and connecting with riders."
    },
    {
      question: "How are delivery prices determined?",
      answer: "Riders set their own delivery prices based on distance, urgency, and other factors. As a shop, you'll receive multiple bids and can choose the one that best fits your budget and timeline."
    },
    {
      question: "How do I track my delivery?",
      answer: "Once a rider accepts your order, you can track the delivery in real-time through the dashboard. You'll see the rider's current location, estimated arrival time, and delivery status updates."
    },
    {
      question: "What payment methods are accepted?",
      answer: "Shops can top up their wallet using M-Pesa, and payments to riders are processed automatically upon successful delivery. Riders receive payments directly to their wallet, which they can withdraw anytime."
    },
    {
      question: "What areas does Njiani cover?",
      answer: "Currently, Njiani operates primarily in Nairobi and surrounding areas, including Westlands, Kileleshwa, Parklands, Kilimani, and the CBD. We're expanding to more areas across Kenya."
    },
    {
      question: "Is there a fee for using Njiani?",
      answer: "Shops pay only for the delivery service chosen from rider bids. Riders pay a small platform fee (13%) on completed deliveries. There are no registration fees or monthly subscriptions."
    },
    {
      question: "How quickly can I get a delivery?",
      answer: "Delivery times depend on rider availability and your location. Most deliveries in Nairobi are completed within 1-3 hours. You can mark orders as urgent to get faster service, though this may cost more."
    },
    {
      question: "What if my delivery is delayed or damaged?",
      answer: "If you experience any issues with your delivery, you can contact the rider directly through the in-app messaging system. For serious issues, contact our support team. We have a rating system to ensure quality service."
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Amazing Backdrop with Pattern Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          background: `
            linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(31, 41, 55, 0.9) 50%, rgba(17, 24, 39, 0.95) 100%),
            radial-gradient(circle at 20% 50%, rgba(249, 115, 22, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(234, 88, 12, 0.1) 0%, transparent 50%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `,
          backgroundSize: 'cover, cover, cover, 60px 60px',
          backgroundPosition: 'center, center, center, 0 0',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 opacity-30">
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse at top left, rgba(249, 115, 22, 0.2) 0%, transparent 50%),
                radial-gradient(ellipse at bottom right, rgba(234, 88, 12, 0.15) 0%, transparent 50%)
              `,
              animation: 'pulse 8s ease-in-out infinite alternate'
            }}
          />
        </div>
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(249, 115, 22, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249, 115, 22, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Content with backdrop blur effect */}
      <div className="relative z-10">
        {/* Navigation - Glassmorphism */}
        <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-dark-900/30 border-b border-white/10 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="text-2xl font-bold text-primary-500 hover:text-primary-400 transition-colors">
                Njiani
              </Link>
              <div className="flex gap-6">
                <NavLink to="/rider/login">Rider Login</NavLink>
                <NavLink to="/shop/login">Shop Login</NavLink>
                <NavLink to="/admin/login">Admin</NavLink>
              </div>
            </div>
          </div>
        </nav>
        
        {/* Spacer for fixed nav */}
        <div className="h-20"></div>

        {/* Hero Section with enhanced styling */}
        <AnimatedSection animation="fadeIn" triggerOnce={true}>
          <section className="container mx-auto px-4 py-20 text-center mt-8 relative">
            <div className="relative z-10">
            <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent drop-shadow-2xl">
              Njiani
            </h1>
            <p className="text-3xl md:text-4xl text-white mb-8 font-light drop-shadow-lg">
              Mizigo njiani
            </p>
            <p className="text-xl text-gray-200 mb-12 max-w-2xl mx-auto drop-shadow-md">
              Real-time delivery marketplace connecting online shops with delivery riders across Kenya
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/rider/signup" className="btn-primary text-lg px-8 py-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                Become a Rider
              </Link>
              <Link to="/shop/signup" className="btn-secondary text-lg px-8 py-4 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                Register Your Shop
              </Link>
            </div>
            </div>
          </section>
        </AnimatedSection>

        {/* How It Works */}
        <AnimatedSection animation="fadeUp" rootMargin="-50px">
          <section className="container mx-auto px-4 py-20 relative z-10">
            <h2 className="text-4xl font-bold text-center mb-12 text-white drop-shadow-lg">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <AnimatedSection animation="fadeUp" delay={100}>
                <div className="card text-center backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
                  <div className="text-5xl mb-4">📦</div>
                  <h3 className="text-xl font-semibold mb-3 text-primary-400">Shop Creates Order</h3>
                  <p className="text-gray-300">
                    Shops create delivery orders with pickup and destination details
                  </p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fadeUp" delay={200}>
                <div className="card text-center backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
                  <div className="text-5xl mb-4">🏍️</div>
                  <h3 className="text-xl font-semibold mb-3 text-primary-400">Riders Bid</h3>
                  <p className="text-gray-300">
                    Available riders place bids with their price and estimated delivery time
                  </p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="fadeUp" delay={300}>
                <div className="card text-center backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
                  <div className="text-5xl mb-4">✅</div>
                  <h3 className="text-xl font-semibold mb-3 text-primary-400">Track & Deliver</h3>
                  <p className="text-gray-300">
                    Real-time tracking from pickup to delivery with live location updates
                  </p>
                </div>
              </AnimatedSection>
            </div>
          </section>
        </AnimatedSection>

        {/* Features */}
        <AnimatedSection animation="fadeUp" rootMargin="-50px">
          <section className="container mx-auto px-4 py-20 relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <AnimatedSection animation="slideLeft" delay={100}>
                <div className="backdrop-blur-sm bg-dark-800/60 p-8 rounded-xl border border-primary-500/20">
                  <h2 className="text-4xl font-bold mb-6 text-white">For Riders</h2>
                  <ul className="space-y-4 text-gray-200">
                    <li className="flex items-start">
                      <span className="text-primary-500 mr-3 text-xl">✓</span>
                      <span>Set your own delivery prices</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-500 mr-3 text-xl">✓</span>
                      <span>Real-time order notifications</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-500 mr-3 text-xl">✓</span>
                      <span>Instant wallet payments</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-500 mr-3 text-xl">✓</span>
                      <span>Flexible working hours</span>
                    </li>
                  </ul>
                  <Link to="/rider/signup" className="btn-primary mt-6 inline-block">
                    Join as Rider
                  </Link>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="slideRight" delay={200}>
                <div className="backdrop-blur-sm bg-dark-800/60 p-8 rounded-xl border border-primary-500/20">
                  <h2 className="text-4xl font-bold mb-6 text-white">For Shops</h2>
                  <ul className="space-y-4 text-gray-200">
                    <li className="flex items-start">
                      <span className="text-primary-500 mr-3 text-xl">✓</span>
                      <span>Compare rider bids and choose the best</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-500 mr-3 text-xl">✓</span>
                      <span>Live tracking of deliveries</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-500 mr-3 text-xl">✓</span>
                      <span>Secure M-Pesa payments</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-primary-500 mr-3 text-xl">✓</span>
                      <span>Fast and reliable delivery service</span>
                    </li>
                  </ul>
                  <Link to="/shop/signup" className="btn-primary mt-6 inline-block">
                    Register Shop
                  </Link>
                </div>
              </AnimatedSection>
            </div>
          </section>
        </AnimatedSection>

        {/* Live Map Demo */}
        <AnimatedSection animation="scale" rootMargin="-50px">
          <section className="container mx-auto px-4 py-20 relative z-10">
            <h2 className="text-4xl font-bold text-center mb-4 text-white drop-shadow-lg">Live Delivery Map</h2>
            <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
              Explore our active delivery zones across Kenya. Click on markers to see delivery statistics for each area.
            </p>
            <div className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/20 p-4">
              <div className="relative">
                <InteractiveMap />
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                🗺️ Interactive map showing active delivery zones • Zoom and pan to explore • Click markers for details
              </p>
            </div>
          </section>
        </AnimatedSection>

        {/* Testimonials Section */}
        <AnimatedSection animation="fadeUp" rootMargin="-50px">
          <section className="container mx-auto px-4 py-20 relative z-10">
            <h2 className="text-4xl font-bold text-center mb-4 text-white drop-shadow-lg">What Our Clients Say</h2>
            <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
              Don't just take our word for it. See what shops and riders are saying about Njiani.
            </p>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 - Shop Owner */}
            <AnimatedSection animation="fadeUp" delay={100}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                  SM
                </div>
                <div>
                  <h3 className="text-white font-semibold">Sarah Mwangi</h3>
                  <p className="text-gray-400 text-sm">Shop Owner, Nairobi</p>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 italic">
                "Njiani has transformed how we handle deliveries. The bidding system lets us choose the best price, and real-time tracking gives us peace of mind. Our customers love the fast, reliable service!"
              </p>
              </div>
            </AnimatedSection>

            {/* Testimonial 2 - Rider */}
            <AnimatedSection animation="fadeUp" delay={200}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                  JK
                </div>
                <div>
                  <h3 className="text-white font-semibold">James Kariuki</h3>
                  <p className="text-gray-400 text-sm">Delivery Rider, Westlands</p>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 italic">
                "As a rider, I love the flexibility Njiani offers. I can set my own prices and work when I want. The app is easy to use, and payments are instant. It's been a game-changer for my income!"
              </p>
              </div>
            </AnimatedSection>

            {/* Testimonial 3 - Shop Owner */}
            <AnimatedSection animation="fadeUp" delay={300}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                  AN
                </div>
                <div>
                  <h3 className="text-white font-semibold">Amina Njoroge</h3>
                  <p className="text-gray-400 text-sm">E-commerce Store, Kilimani</p>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 italic">
                "The real-time tracking feature is amazing! I can see exactly where my deliveries are at any moment. The chat feature with riders makes communication seamless. Highly recommend Njiani!"
              </p>
              </div>
            </AnimatedSection>

            {/* Testimonial 4 - Rider */}
            <AnimatedSection animation="fadeUp" delay={400}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                  PO
                </div>
                <div>
                  <h3 className="text-white font-semibold">Peter Ochieng</h3>
                  <p className="text-gray-400 text-sm">Delivery Rider, Parklands</p>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 italic">
                "I've tried other delivery apps, but Njiani is the best. The interface is clean, orders come in fast, and I love being able to negotiate prices with shops. My earnings have doubled since joining!"
              </p>
              </div>
            </AnimatedSection>

            {/* Testimonial 5 - Shop Owner */}
            <AnimatedSection animation="fadeUp" delay={500}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                  DW
                </div>
                <div>
                  <h3 className="text-white font-semibold">David Wanjala</h3>
                  <p className="text-gray-400 text-sm">Retail Shop, Kileleshwa</p>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 italic">
                "The product catalog feature is brilliant! I can manage all my products in one place. The reporting tools help me track my delivery costs and optimize my operations. Great platform!"
              </p>
              </div>
            </AnimatedSection>

            {/* Testimonial 6 - Rider */}
            <AnimatedSection animation="fadeUp" delay={600}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg mr-4">
                  MW
                </div>
                <div>
                  <h3 className="text-white font-semibold">Mary Wanjiru</h3>
                  <p className="text-gray-400 text-sm">Delivery Rider, CBD</p>
                </div>
              </div>
              <div className="flex mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300 italic">
                "Njiani has made my work so much easier. The app is intuitive, and I get notifications for new orders instantly. The wallet system is convenient - I can withdraw my earnings anytime. Love it!"
              </p>
              </div>
            </AnimatedSection>
          </div>

          {/* Stats Section */}
          <AnimatedSection animation="scale" delay={200}>
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">500+</div>
              <div className="text-gray-300 text-sm">Active Riders</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">200+</div>
              <div className="text-gray-300 text-sm">Registered Shops</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">5K+</div>
              <div className="text-gray-300 text-sm">Deliveries Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-500 mb-2">4.8★</div>
              <div className="text-gray-300 text-sm">Average Rating</div>
            </div>
            </div>
          </AnimatedSection>
          </section>
        </AnimatedSection>

        {/* Pricing Section */}
        <AnimatedSection animation="fadeUp" rootMargin="-50px">
          <section className="container mx-auto px-4 py-20 relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4 text-white drop-shadow-lg">Choose Your Plan</h2>
          <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
            Flexible pricing plans to suit your business needs. Start free and upgrade anytime.
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <AnimatedSection animation="fadeUp" delay={100}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-gray-700 hover:border-primary-500/40 transition-all duration-300">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Free</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-primary-500">KES 0</span>
                  <span className="text-gray-400 text-sm ml-2">/month</span>
                </div>
                <p className="text-gray-400 text-sm">Perfect for small shops getting started</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>10 orders/month</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>5 products</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Real-time tracking</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Basic reports</span>
                </li>
              </ul>
              <Link
                to="/shop/signup"
                className="block w-full text-center py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Get Started Free
              </Link>
              </div>
            </AnimatedSection>

            {/* Standard Plan */}
            <AnimatedSection animation="fadeUp" delay={200}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/50 hover:border-primary-500 transition-all duration-300 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                Popular
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Standard</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-primary-500">KES 2,999</span>
                  <span className="text-gray-400 text-sm ml-2">/month</span>
                </div>
                <p className="text-gray-400 text-sm">Ideal for growing businesses</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>100 orders/month</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>50 products</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Real-time tracking</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Advanced analytics</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Bulk operations</span>
                </li>
              </ul>
              <Link
                to="/shop/signup"
                className="block w-full text-center py-3 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-colors"
              >
                Start Standard
              </Link>
              </div>
            </AnimatedSection>

            {/* Premium Plan */}
            <AnimatedSection animation="fadeUp" delay={300}>
              <div className="card backdrop-blur-sm bg-dark-800/80 border-yellow-500/50 hover:border-yellow-500 transition-all duration-300">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-yellow-500">KES 7,999</span>
                  <span className="text-gray-400 text-sm ml-2">/month</span>
                </div>
                <p className="text-gray-400 text-sm">For large enterprises</p>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Unlimited orders</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Unlimited products</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>All Standard features</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>API access</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>Custom branding</span>
                </li>
                <li className="flex items-center text-gray-300 text-sm">
                  <span className="text-green-400 mr-2">✓</span>
                  <span>White label</span>
                </li>
              </ul>
              <Link
                to="/shop/signup"
                className="block w-full text-center py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition-colors"
              >
                Go Premium
              </Link>
              </div>
            </AnimatedSection>
          </div>
          </section>
        </AnimatedSection>

        {/* Frequently Asked Questions */}
        <AnimatedSection animation="fadeUp" rootMargin="-50px">
          <section className="container mx-auto px-4 py-20 relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4 text-white drop-shadow-lg">Frequently Asked Questions</h2>
          <p className="text-center text-gray-300 mb-12 max-w-2xl mx-auto">
            Got questions? We've got answers. Find everything you need to know about using Njiani.
          </p>
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <AnimatedSection key={index} animation="fadeUp" delay={index * 50}>
                <div
                  className="card backdrop-blur-sm bg-dark-800/80 border-primary-500/20 hover:border-primary-500/40 transition-all duration-300 overflow-hidden"
                >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full text-left p-6 flex items-center justify-between focus:outline-none group"
                >
                  <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors pr-4">
                    {faq.question}
                  </h3>
                  <svg
                    className={`w-6 h-6 text-primary-500 flex-shrink-0 transition-transform duration-300 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
          
          {/* Contact Support */}
          <AnimatedSection animation="fadeUp" delay={300}>
            <div className="mt-12 text-center">
            <div className="card backdrop-blur-sm bg-dark-800/60 border-primary-500/20 inline-block p-6">
              <p className="text-gray-300 mb-4">
                Still have questions? We're here to help!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/shop/login"
                  className="btn-primary text-sm px-6 py-2"
                >
                  Contact Support
                </Link>
                <Link
                  to="/rider/signup"
                  className="btn-secondary text-sm px-6 py-2"
                >
                  Get Started
                </Link>
              </div>
            </div>
            </div>
          </AnimatedSection>
          </section>
        </AnimatedSection>

        {/* Footer */}
        <AnimatedSection animation="fadeIn">
          <footer className="container mx-auto px-4 py-12 border-t border-dark-700/50 relative z-10 backdrop-blur-sm bg-dark-900/30">
          <div className="text-center text-gray-300">
            <p className="text-2xl font-bold text-primary-500 mb-2">Njiani</p>
            <p>Mizigo njiani - Connecting Kenya, one delivery at a time</p>
            <p className="mt-4 text-sm text-gray-400">Built by Gaius</p>
          </div>
          </footer>
        </AnimatedSection>
      </div>

      {/* Add CSS animation for pulse effect */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
