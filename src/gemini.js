import { GoogleGenAI } from '@google/genai'; 

// --- KONFIGURASI PENTING GEMINI ---
// 🔑 API Key Gemini Anda
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_KEY;

const TARGET_DIGITS_REQUIRED = 18;
const IMAGE_MAX_WIDTH = 1200;
const IMAGE_QUALITY = 0.8;
const model = 'gemini-2.5-flash';

// --- INISIALISASI GEMINI API ---
// Pastikan package terinstal: npm install @google/genai
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Mengubah file gambar menjadi string Base64 dan mengoptimasi ukurannya.
 */
export const resizeImageAndConvertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let width = img.width;
                let height = img.height;

                // Optimasi ukuran gambar
                if (width > IMAGE_MAX_WIDTH) {
                    height = height * (IMAGE_MAX_WIDTH / width);
                    width = IMAGE_MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const dataURL = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
                const base64String = dataURL.split(',')[1];
                const mimeType = 'image/jpeg';

                resolve({ base64: base64String, dataURL: dataURL, name: file.name, mimeType });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Helper untuk format payload Gemini
 */
function fileToGenerativePart(base64Image, mimeType) {
    return {
        inlineData: {
            data: base64Image,
            mimeType,
        },
    };
}

/**
 * Memanggil Gemini API untuk mengekstrak kode dari gambar.
 */
export async function callGeminiApi(base64Image, prompt, fileName) {
    
    if (!GEMINI_API_KEY) { 
        throw new Error("Kunci API Gemini belum diatur.");
    }
    
    try {
        const imagePart = fileToGenerativePart(base64Image, 'image/jpeg'); 
        const response = await ai.models.generateContent({ 
            model: model,
            contents: [
                imagePart,
                { text: prompt },
            ],
        });
        
        if (!response.text) {
             throw new Error("Gemini tidak menghasilkan teks balasan.");
        }
        
        return response.text;

    } catch (error) {
        console.error(`Error memanggil Gemini untuk ${fileName}:`, error);
        throw new Error(`Gagal memanggil Gemini API untuk ${fileName}. Pesan: ${error.message || 'Error tidak diketahui'}.`);
    }
}

export { TARGET_DIGITS_REQUIRED };