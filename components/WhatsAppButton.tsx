
import React from 'react';
import { COMPANY_INFO } from '../constants';

const WhatsAppButton: React.FC = () => {
  return (
    <a
      href={COMPANY_INFO.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-50 bg-green-500 text-white w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl hover:bg-green-600 transition-all transform hover:scale-110 flex items-center justify-center animate-bounce"
      aria-label="Chat on WhatsApp"
    >
      <i className="fab fa-whatsapp text-3xl"></i>
    </a>
  );
};

export default WhatsAppButton;
