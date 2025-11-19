import { toast } from 'react-hot-toast';

export const validateWhatsAppNumber = (number: string): boolean => {
  // Remove all spaces and check if it starts with + followed by country code and numbers
  const cleanNumber = number.replace(/\s+/g, '');
  const whatsappRegex = /^\+(?:212|33|1|44|49|39|34|351|31|32|41|43|46|47|48|380|420|421|7|86|81|82|91|971|974|973|966|965|968|962|961|963|964|972|90|20|27|234|225|221|216|213|212)[0-9]{8,}$/;
  return whatsappRegex.test(cleanNumber);
};

export const formatWhatsAppNumber = (number: string): string => {
  // Remove all non-digit characters except +
  const cleaned = number.replace(/[^\d+]/g, '');
  
  // Format the number with spaces after country code and in groups of 3
  let formatted = cleaned;
  if (cleaned.startsWith('+')) {
    // Add space after country code (assuming 2-3 digits)
    const countryCodeMatch = cleaned.match(/^\+(\d{2,3})/);
    if (countryCodeMatch) {
      const countryCode = countryCodeMatch[1];
      const rest = cleaned.slice(countryCode.length + 1);
      formatted = `+${countryCode} ${rest.replace(/(\d{3})/g, '$1 ').trim()}`;
    }
  }
  
  return formatted;
};

export const generateWhatsAppLink = (number: string, message?: string): string => {
  try {
    // Clean the number by removing spaces and any other non-digit characters except +
    const cleanNumber = number.replace(/\s+/g, '');
    
    if (!validateWhatsAppNumber(cleanNumber)) {
      throw new Error('Invalid WhatsApp number format');
    }
    
    const baseUrl = 'https://wa.me';
    const url = new URL(cleanNumber, baseUrl);
    
    if (message) {
      url.searchParams.append('text', message);
    }
    
    return url.toString();
  } catch (error) {
    console.error('Error generating WhatsApp link:', error);
    toast.error('Erreur lors de la génération du lien WhatsApp');
    return '';
  }
};

export const openWhatsAppChat = (number: string, message?: string): void => {
  const link = generateWhatsAppLink(number, message);
  if (link) {
    window.open(link, '_blank', 'noopener,noreferrer');
  }
};