'use client';

import { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/appStore';

export default function ImageTranslation() {
    const { sourceLang, targetLang, selectedModel, setTranslatedText, setIsTranslating } = useAppStore();
    const [image, setImage] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Proxy same-origin (Next.js → Ollama). Evita mixed-content.
    const OLLAMA_HOST = '/ollama';

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }

        // Max 10MB
        if (file.size > 10 * 1024 * 1024) {
            alert('La imagen es demasiado grande (máx 10MB)');
            return;
        }

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = (event.target?.result as string).split(',')[1];
            setImage(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleTranslateImage = async () => {
        if (!image) return;

        setIsProcessing(true);
        setIsTranslating(true);
        setTranslatedText('');

        try {
            const prompt = `You are a professional translator. Extract any text visible in this image and translate it from ${sourceLang.name} (${sourceLang.code}) to ${targetLang.name} (${targetLang.code}). If there's no text in the image, describe what you see instead. Provide only the translated text or description, no explanations.`;

            const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: selectedModel,
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                            images: [image],
                        },
                    ],
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to process image');
            }

            const data = await response.json();
            setTranslatedText(data.message?.content || 'No se pudo procesar la imagen');
        } catch (error) {
            console.error('Image translation error:', error);
            setTranslatedText('Error al procesar la imagen. Asegúrate de que el modelo soporta visión.');
        } finally {
            setIsProcessing(false);
            setIsTranslating(false);
        }
    };

    const clearImage = () => {
        setImage(null);
        setFileName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <PhotoIcon className="h-5 w-5" />
                Traducción de Imágenes
            </h2>

            {!image ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-tg-jade hover:bg-tg-bruma dark:hover:bg-tg-ribera transition-colors"
                >
                    <PhotoIcon className="h-12 w-12 mx-auto text-tg-pizarra mb-4 dark:text-tg-ceniza" />
                    <p className="text-gray-600 dark:text-tg-ceniza">
                        Haz clic o arrastra una imagen aquí
                    </p>
                    <p className="text-xs text-tg-pizarra mt-2 dark:text-tg-ceniza">JPEG, PNG, WebP (máx 10MB)</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative">
                        <img
                            src={`data:image/jpeg;base64,${image}`}
                            alt="Preview"
                            className="w-full max-h-64 object-contain rounded-lg bg-gray-100 dark:bg-gray-900"
                        />
                        <button
                            onClick={clearImage}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white"
                        >
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 truncate dark:text-tg-ceniza">{fileName}</p>
                    <button
                        onClick={handleTranslateImage}
                        disabled={isProcessing}
                        className="w-full py-3 px-4 bg-tg-jade-hondo text-white font-semibold rounded-xl hover:bg-tg-jade-oscuro disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <ArrowPathIcon className="h-5 w-5 animate-spin" />
                                Procesando imagen...
                            </>
                        ) : (
                            <>
                                <PhotoIcon className="h-5 w-5" />
                                Traducir Imagen
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
