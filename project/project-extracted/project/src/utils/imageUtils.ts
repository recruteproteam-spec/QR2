import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<string> => {
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1024,
      useWebWorker: true
    };

    const compressedFile = await imageCompression(file, options);
    return await convertToBase64(compressedFile);
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image');
  }
};

export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Format de fichier non supporté. Utilisez JPG, PNG ou GIF.');
  }

  if (file.size > maxSize) {
    throw new Error('Fichier trop volumineux. Taille maximum: 5MB');
  }

  return true;
};