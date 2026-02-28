import { API_BASE_URL } from '../api/config';

/**
 * Ensures a media URL returned from the backend is fully qualified if it's a relative path.
 * Typically URLs start with /static/
 */
export const getImageUrl = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;

    // Eğer zaten tam bir URL ise (http:// veya https://) direk döndür
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // API_BASE_URL genelde "http://localhost:8000/api/v1" şeklindedir
    // Sadece "http://localhost:8000" kısmını almak için bir ayıklama (replace) yapalım:
    const backendBase = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

    // URL '/' ile başlamıyorsa ekleyelim
    const prefix = url.startsWith('/') ? '' : '/';

    return `${backendBase}${prefix}${url}`;
};
