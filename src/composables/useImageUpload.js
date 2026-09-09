import { ref } from 'vue';
import { useQuasar } from 'quasar';
import api from '../services/api.js';

/**
 * Sube una imagen a Cloudflare R2 usando presigned URLs.
 * El frontend nunca conoce credenciales de R2: le pide al backend una URL firmada
 * y sube el archivo directo a ese destino. Devuelve la URL publica final.
 */
export function useImageUpload() {
  const $q = useQuasar();
  const uploading = ref(false);
  const progress = ref(0);

  const MAX_SIZE_BYTES = 5 * 1024 * 1024; // debe coincidir con el limite del backend

  async function uploadImage(file, folder = 'general') {
    if (file.size > MAX_SIZE_BYTES) {
      $q.notify({ type: 'negative', message: 'La imagen supera el tamaño máximo permitido (5MB)' });
      return null;
    }

    uploading.value = true;
    progress.value = 0;
    try {
      // 1. Pedir URL firmada al backend (nunca se sube el archivo aca)
      const { data } = await api.post('/uploads/presign', {
        fileName: file.name,
        contentType: file.type,
        size: file.size, // se firma en la URL: R2 rechaza cualquier otro tamaño
        folder
      });
      if (!data.success) throw new Error(data.error?.message || 'No se pudo iniciar la subida');
      const { uploadUrl, publicUrl } = data.data;

      // 2. Subir el archivo directo a R2, sin pasar por el backend
      const xhr = new XMLHttpRequest();
      await new Promise((resolve, reject) => {
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) progress.value = Math.round((e.loaded / e.total) * 100);
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Falló la subida')));
        xhr.onerror = () => reject(new Error('Falló la subida'));
        xhr.send(file);
      });

      return publicUrl; // se guarda directamente en el formulario/entidad
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message || 'No se pudo subir la imagen' });
      return null;
    } finally {
      uploading.value = false;
    }
  }

  return { uploading, progress, uploadImage };
}
