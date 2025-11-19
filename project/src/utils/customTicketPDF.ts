import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TicketData {
  id: string;
  eventName: string;
  eventDate: Date;
  location: string;
  ticketType: string;
  price: number;
  userId: string;
  eventId: string;
  logo?: string;
  startTime?: string;
  endTime?: string;
  generatedAt?: Date;
  customPrice?: number;
}

export const generateCustomTicketPDF = async (ticket: TicketData): Promise<jsPDF> => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [255.12, 538.6]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Background - White base
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Deep purple curved section on the right
    doc.setFillColor(47, 41, 99);
    const curveWidth = pageWidth * 0.4;
    
    // Create the curve effect using multiple shapes
    const points = [];
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const x = pageWidth - curveWidth + (Math.sin(i / steps * Math.PI) * 40);
      const y = (i / steps) * pageHeight;
      points.push([x, y]);
    }
    
    // Fill the curved area
    doc.setFillColor(47, 41, 99);
    doc.moveTo(pageWidth, 0);
    points.forEach(point => doc.lineTo(point[0], point[1]));
    doc.lineTo(pageWidth, pageHeight);
    doc.fill();

    // Add event logo if provided
    if (ticket.logo) {
      try {
        const logoSize = 40;
        const logoX = margin + 10;
        const logoY = margin;
        doc.addImage(ticket.logo, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'FAST');
      } catch (error) {
        console.warn('Unable to load event logo:', error);
      }
    }

    // ✅ Generate QR code with DIRECT URL for validation using user_id and event_id
    const validationUrl = `https://www.qrticketpro.com/validate.php?user_id=${ticket.userId}&event_id=${ticket.eventId}`;

    const qrCodeDataUrl = await QRCode.toDataURL(validationUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });

    const qrCodeSize = 120;
    const qrCodeX = pageWidth - margin - qrCodeSize - 40;
    const qrCodeY = margin + 40;

    // QR Code with white background
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(qrCodeX - 5, qrCodeY - 5, qrCodeSize + 10, qrCodeSize + 10, 3, 3, 'F');
    doc.addImage(qrCodeDataUrl, 'PNG', qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);

    // Event information
    const infoX = margin + 10;
    let currentY = margin + 70;

    // Event name
    doc.setFontSize(22);
    doc.setTextColor(47, 41, 99);
    doc.setFont('helvetica', 'bold');
    doc.text(ticket.eventName, infoX, currentY);
    currentY += 20;

    // Reset font and color for details
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    // Date
    doc.setFont('helvetica', 'bold');
    doc.text('Date :', infoX, currentY);
    const dateLabel = doc.getTextWidth('Date : ');
    doc.setFont('helvetica', 'normal');
    doc.text(format(ticket.eventDate, 'dd MMMM yyyy', { locale: fr }), infoX + dateLabel, currentY);
    currentY += 15;

    // Time (if available)
    if (ticket.startTime && ticket.endTime) {
      doc.setFont('helvetica', 'bold');
      doc.text('Horaires :', infoX, currentY);
      const timeLabel = doc.getTextWidth('Horaires : ');
      doc.setFont('helvetica', 'normal');
      doc.text(`${ticket.startTime} - ${ticket.endTime}`, infoX + timeLabel, currentY);
      currentY += 15;
    }

    // Location
    doc.setFont('helvetica', 'bold');
    doc.text('Lieu :', infoX, currentY);
    const locationLabel = doc.getTextWidth('Lieu : ');
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.location, infoX + locationLabel, currentY);
    currentY += 15;

    // Ticket type
    doc.setFont('helvetica', 'bold');
    doc.text('Type de billet :', infoX, currentY);
    const typeLabel = doc.getTextWidth('Type de billet : ');
    doc.setFont('helvetica', 'normal');
    doc.text(ticket.ticketType, infoX + typeLabel, currentY);
    currentY += 15;

    // PRIX - OBLIGATOIRE
    const displayPrice = ticket.customPrice || ticket.price;
    doc.setFont('helvetica', 'bold');
    doc.text('Prix :', infoX, currentY);
    const priceLabel = doc.getTextWidth('Prix : ');
    doc.setFont('helvetica', 'bold');
    
    if (ticket.customPrice && ticket.customPrice !== ticket.price) {
      // Prix personnalisé en rose
      doc.setTextColor(220, 38, 127);
      doc.text(`${displayPrice} MAD (personnalisé)`, infoX + priceLabel, currentY);
    } else {
      // Prix normal en noir
      doc.setTextColor(0, 0, 0);
      doc.text(`${displayPrice} MAD`, infoX + priceLabel, currentY);
    }
    currentY += 15;

    // HEURE DE GÉNÉRATION - OBLIGATOIRE
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Généré le :', infoX, currentY);
    const genLabel = doc.getTextWidth('Généré le : ');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94); // Vert pour l'heure de génération
    const generationDateTime = format(ticket.generatedAt || new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr });
    doc.text(generationDateTime, infoX + genLabel, currentY);
    currentY += 20;

    // Reset color
    doc.setTextColor(0, 0, 0);

    // Ticket ID - EXACTLY as stored in database
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ticket ID: ${ticket.id}`, infoX, currentY);
    currentY += 15;

    // ✅ Add QR Code validation URL info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Scanner le QR code pour validation: ${validationUrl}`, infoX, currentY);
    currentY += 10;

    // Legal notes
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text("Ce billet est personnel et non cessible. Une pièce d'identité pourra être demandée.", infoX, currentY);
    currentY += 7;
    doc.text("Le code QR doit être présenté à l'entrée de l'événement pour validation.", infoX, currentY);
    currentY += 7;
    doc.text("Ticket personnalisé généré avec informations spécifiques.", infoX, currentY);

    // Add decorative elements - Price highlight box
    if (ticket.customPrice && ticket.customPrice !== ticket.price) {
      doc.setFillColor(254, 240, 138); // Light yellow background
      doc.roundedRect(pageWidth - 180, margin + 10, 150, 30, 5, 5, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14); // Dark yellow text
      doc.text('PRIX PERSONNALISÉ', pageWidth - 175, margin + 20);
      doc.setFontSize(14);
      doc.text(`${ticket.customPrice} MAD`, pageWidth - 175, margin + 32);
      doc.setTextColor(0, 0, 0); // Reset to black
    }

    // Note: Le ticket est déjà dans la base de données, pas besoin de l'insérer à nouveau
    console.log('✅ Ticket personnalisé PDF généré pour:', ticket.id);

    return doc;
  } catch (error) {
    console.error('Erreur génération PDF personnalisé :', error);
    throw new Error(`Erreur génération PDF personnalisé: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
  }
}