
import React, { useState, useEffect } from 'react';
import Footer from '../components/Footer';

const AboutUs: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const teamImages = [
    'https://scontent.fntr12-1.fna.fbcdn.net/v/t39.30808-6/520142371_747738357634817_6449569351903308783_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=102&ccb=1-7&_nc_sid=833d8c&_nc_ohc=U7vdGMGGtfkQ7kNvwFBIhLr&_nc_oc=Adl_H26epm7M5VSvm5cgpULeGhLxI8KHJLpv_-ojTdXSgldiiyQT-f0PHYj5DX2c913B47HTOkoKGgrJkY9TDqmH&_nc_zt=23&_nc_ht=scontent.fntr12-1.fna&_nc_gid=lzFMwbeNRXNsoTmGfTxkMA&oh=00_Afrup5N7bW-DHRG-YyvSZZbUf17075D8zWGpCKIC1EioQA&oe=6981DC1A',
    'https://scontent.fntr12-1.fna.fbcdn.net/v/t39.30808-6/520435903_747738457634807_1406220995861554003_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=104&ccb=1-7&_nc_sid=833d8c&_nc_ohc=Llr7Vy6C0XMQ7kNvwGC5lLU&_nc_oc=Adnw14M7O_Q79me6HyanscEE6EACWtKV-oKnKDg_Zf6IM2rCFgyEwqYXk1gvxuwddvrudT-sRpkp56edTlYzeI8p&_nc_zt=23&_nc_ht=scontent.fntr12-1.fna&_nc_gid=bJ1kafyV2yL2At_YVcfs5g&oh=00_Afq2dPWwt9tKnKYnf83cRgou-WosVvVywdrFrHydi2cZ9w&oe=6981C08D',
    'https://scontent.fntr12-1.fna.fbcdn.net/v/t39.30808-6/518381081_748009747607678_430735431791261680_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=101&ccb=1-7&_nc_sid=833d8c&_nc_ohc=n_FiuZu--w0Q7kNvwEE3AKC&_nc_oc=Adle7QdWP5TT5nRPMtIfrQJCNyEp542m7j_rfdpWkwObWsuid_7ATMrs9tmg-sll17bdNy1euW5pQhRcB4FAn-Iq&_nc_zt=23&_nc_ht=scontent.fntr12-1.fna&_nc_gid=x4H5rUyDUmctuwyBgDXnlg&oh=00_AfonLaedzVfOgSY77csEGkkMwXQQ3RwtFQtT--sbMenNVw&oe=6981DD23',
    'https://scontent.fntr12-1.fna.fbcdn.net/v/t39.30808-6/519417068_748009827607670_9134690841492495146_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=108&ccb=1-7&_nc_sid=833d8c&_nc_ohc=himDXdytDZ4Q7kNvwEXnVTx&_nc_oc=AdmeY-xE5dQW34dIx46nJBRDPhZHAG0znJgkouj4XmAGYTgGbcNjnJcnz0312dIEQ_lH07MECfxKYoDwcYT5qj4L&_nc_zt=23&_nc_ht=scontent.fntr12-1.fna&_nc_gid=3zaPCirIq2sadu_0BiDJeg&oh=00_Afo6Df0uwVP2S5UIVSvKkVdfxd7ovZ1s2AkERsGayDZ2mw&oe=6981D8F4',
    'https://scontent.fntr12-1.fna.fbcdn.net/v/t39.30808-6/518889920_747738387634814_8458555120026248066_n.jpg?stp=cp6_dst-jpg_tt6&_nc_cat=100&ccb=1-7&_nc_sid=833d8c&_nc_ohc=y8Uun8AM_ngQ7kNvwGm8y4y&_nc_oc=AdmroQIuyXPokw9s04ChmG4vf90du8sIoTFOok46qPuzSp7_dPYVEMVTtxUudK3AgYgivSvTl7c-XwDhKfZ4svz8&_nc_zt=23&_nc_ht=scontent.fntr12-1.fna&_nc_gid=-rueVL3bw4Gop8j0rR_6bg&oh=00_AfrhWzFkOp3utaW8M2bqa-TutK5m9Syib1lffVX-Ud3Olg&oe=6981E39B'
  ];

  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % teamImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % teamImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + teamImages.length) % teamImages.length);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tighter mb-6">¿Quiénes Somos?</h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Dhimma Automotriz es tu aliado de confianza en refacciones y servicios automotrices de calidad.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-grow">
        {/* Team Carousel */}
        <div className="mb-20">
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden">
            <div className="relative w-full bg-slate-900 group flex items-center justify-center" style={{ height: 'auto', aspectRatio: '16/10', maxHeight: '400px' }}>
              {/* Carousel Images */}
              <img
                src={teamImages[currentImageIndex]}
                alt="Equipo Dhimma"
                className="w-full h-full object-contain transition-opacity duration-1000"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 to-transparent"></div>

              {/* Navigation Buttons */}
              <button
                onClick={prevImage}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <i className="fas fa-chevron-left text-slate-900 text-lg"></i>
              </button>
              <button
                onClick={nextImage}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-110 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <i className="fas fa-chevron-right text-slate-900 text-lg"></i>
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {teamImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentImageIndex
                        ? 'bg-white w-8'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Counter */}
          <div className="text-center mt-6 text-slate-600">
            <p className="text-sm font-bold">
              {currentImageIndex + 1} / {teamImages.length}
            </p>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          {/* Mission */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-10 hover:shadow-2xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
              <i className="fas fa-bullseye text-blue-600 text-2xl"></i>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Nuestra Misión</h2>
            <p className="text-slate-600 leading-relaxed">
              Proporcionar refacciones automotrices de la más alta calidad, con un servicio excepcional y precios competitivos. Nos comprometemos a ser el socio confiable para todas tus necesidades automotrices, ofreciendo productos originales y genuinos que garanticen la seguridad y rendimiento de tu vehículo.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-10 hover:shadow-2xl transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
              <i className="fas fa-binoculars text-green-600 text-2xl"></i>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4">Nuestra Visión</h2>
            <p className="text-slate-600 leading-relaxed">
              Ser la empresa líder en la distribución de refacciones automotrices en la región, reconocida por nuestra calidad, confiabilidad y atención al cliente. Aspiramos a expandir nuestros servicios y ser el destino preferido para profesionales del automóvil y clientes que valoran la excelencia.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-[3rem] p-12 text-white mb-16">
          <h2 className="text-3xl font-black mb-12 text-center">Nuestros Valores</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-shield-alt text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold">Confiabilidad</h3>
              <p className="text-blue-100">Productos genuinos y garantizados que puedas confiar en cualquier situación.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-handshake text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold">Compromiso</h3>
              <p className="text-blue-100">Dedicados a superar expectativas y brindar el mejor servicio en cada interacción.</p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-star text-2xl"></i>
              </div>
              <h3 className="text-xl font-bold">Excelencia</h3>
              <p className="text-blue-100">Continuamente mejorando para ofrecerte la mejor calidad y experiencia posible.</p>
            </div>
          </div>
        </div>

        {/* Customer Message */}
        <div className="bg-white rounded-[2rem] border-2 border-blue-200 p-12 text-center shadow-xl">
          <div className="inline-block mb-6">
            <i className="fas fa-quote-left text-5xl text-blue-600/20"></i>
          </div>
          <h3 className="text-3xl font-black text-slate-900 mb-4">Mensaje para Nuestros Clientes</h3>
          <p className="text-lg text-slate-700 leading-relaxed max-w-3xl mx-auto mb-6">
            En Dhimma Automotriz, no solo vendemos refacciones, sino que construimos relaciones duraderas basadas en confianza, calidad e integridad. Cada cliente es importante para nosotros, y nos esforzamos por brindar soluciones que superen tus expectativas. 
          </p>
          <p className="text-lg text-slate-700 leading-relaxed max-w-3xl mx-auto">
            Tu satisfacción es nuestro mayor logro. Gracias por elegirnos como tu aliado automotriz y confiar en nosotros para mantener tu vehículo en las mejores condiciones.
          </p>
          <div className="mt-8 pt-8 border-t border-slate-200">
            <p className="text-sm font-bold text-blue-600 uppercase tracking-widest">Equipo Dhimma Automotriz</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default AboutUs;
