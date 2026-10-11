'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { getModels, type OllamaModel } from '@/services/ollama';

export default function ModelSelector() {
    const { selectedModel, setSelectedModel, ollamaConnected } = useAppStore();
    const [models, setModels] = useState<OllamaModel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchModels() {
            if (!ollamaConnected) {
                setModels([]);
                setLoading(false);
                return;
            }

            try {
                const availableModels = await getModels();
                // Filter to only show translategemma models
                const translationModels = availableModels.filter(
                    (m) => m.name.includes('translategemma') || m.name.includes('gemma')
                );
                setModels(translationModels);
            } catch (error) {
                console.error('Failed to fetch models:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchModels();
    }, [ollamaConnected]);

    const formatSize = (bytes: number) => {
        const gb = bytes / (1024 * 1024 * 1024);
        return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    };

    if (!ollamaConnected) {
        return (
            <div className="text-center text-sm text-gray-500 dark:text-tg-ceniza py-2">
                Conecta Ollama para ver modelos disponibles
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-2">
                <div className="animate-spin h-5 w-5 border-2 border-tg-jade border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Modelo de Traducción
            </label>
            <div className="grid grid-cols-1 gap-2">
                {models.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-tg-ceniza">No se encontraron modelos de traducción</p>
                ) : (
                    models.map((model) => (
                        <button
                            key={model.name}
                            onClick={() => setSelectedModel(model.name)}
                            className={`text-left p-3 rounded-lg border transition-all ${selectedModel === model.name
                                    ? 'border-tg-jade bg-tg-bruma dark:bg-tg-ribera'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 dark:text-white">{model.name}</span>
                                <span className="text-xs text-gray-500 dark:text-tg-ceniza">{formatSize(model.size)}</span>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
