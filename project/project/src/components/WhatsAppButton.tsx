import React from 'react';
import { Phone } from 'lucide-react';
import { validateWhatsAppNumber, openWhatsAppChat } from '../utils/whatsapp';

interface WhatsAppButtonProps {
  phoneNumber: string;
  message?: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({
  phoneNumber,
  message,
  className = '',
  variant = 'primary'
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!validateWhatsAppNumber(phoneNumber)) {
      console.error('Invalid WhatsApp number format');
      return;
    }
    
    openWhatsAppChat(phoneNumber, message);
  };

  const baseStyles = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200";
  const variantStyles = {
    primary: "bg-green-600 hover:bg-green-700 text-white",
    secondary: "bg-white hover:bg-gray-50 text-green-600 border border-green-600"
  };

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      type="button"
    >
      <Phone className="h-5 w-5" />
      <span>Contacter sur WhatsApp</span>
    </button>
  );
};

export default WhatsAppButton;