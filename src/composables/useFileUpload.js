import { ref } from 'vue';
import { useQuasar } from 'quasar';
import api from '../services/api.js';

/**
 * Subida generica a Cloudflare R2 via presigned URL. Soporta imagenes (kind='image')
 * y archivos 3D STL/3MF (kind='model'). Misma mecanica que useImageUpload (presign +
 * PUT directo a R2), pero parametrizable por tipo y tamano maximo.
 */
const IMAGE_MAX = 5 * 1024 * 1024;   // 5MB
const MODEL_MAX = 50 * 1024 * 1024;  // 50MB
const MODEL_EXT = ['stl', '3mf'];

export function useFileUpload() {
  const $q = useQuasar();
  const uploading = ref(false);
  const progress = ref(0);

  async function uploadFile(file, { folder = 'general', kind = 'image' } = {}) {
    const maxSize = kind === 'model' ? MODEL_MAX : IMAGE_MAX;
    if (file.size > maxSize) {
      $q.notify({ type: 'negative', message: `El archivo supera el tamaño máximo (${Math.round(maxSize / 1024 / 1024)}MB)` });
      return null;
    }
    if (kind === 'model') {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!MODEL_EXT.includes(ext)) {
        $q.notify({ type: 'negative', message: 'Solo se permiten archivos STL o 3MF' });
        return null;
      }
    }

    uploading.value = true;
    progress.value = 0;
    try {
      const { data } = await api.post('/uploads/presign', {
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size, // se firma en la URL: R2 rechaza cualquier otro tamaño
        kind,
        folder
      });
      if (!data.success) throw new Error(data.error?.message || 'No se pudo iniciar la subida');
      const { uploadUrl, publicUrl } = data.data;

      const xhr = new XMLHttpRequest();
      await new Promise((resolve, reject) => {
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) progress.value = Math.round((e.loaded / e.total) * 100);
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Falló la subida')));
        xhr.onerror = () => reject(new Error('Falló la subida'));
        xhr.send(file);
      });

      return publicUrl;
    } catch (e) {
      $q.notify({ type: 'negative', message: e.message || 'No se pudo subir el archivo' });
      return null;
    } finally {
      uploading.value = false;
    }
  }

  return { uploading, progress, uploadFile };
}
