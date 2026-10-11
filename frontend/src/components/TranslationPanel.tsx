'use client';

import { useState, useRef, useCallback } from 'react';
import { ArrowsRightLeftIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/appStore';
import { translateStream } from '@/services/ollama';
import { saveTranslation, isAuthenticated } from '@/services/pocketbase';
import LanguageSelector from './LanguageSelector';

export default function TranslationPanel() {
    const {
        sourceText,
        translatedText,
        sourceLang,
        targetLang,
        isTranslating,
        selectedModel,
        setSourceText,
        setTranslatedText,
        swapLanguages,
        setIsTranslating,
    } = useAppStore();

    const [copied, setCopied] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleTranslate = useCallback(async () => {
        if (!sourceText.trim() || isTranslating) return;

        setIsTranslating(true);
        setTranslatedText('');
        abortControllerRef.current = new AbortController();

        let accumulatedText = '';

        try {
            await translateStream(
                {
                    text: sourceText,
                    sourceLang: sourceLang.name,
                    sourceCode: sourceLang.code,
                    targetLang: targetLang.name,
                    targetCode: targetLang.code,
                    model: selectedModel,
                },
                (token) => {
                    accumulatedText += token;
                    setTranslatedText(accumulatedText);
                },
                async () => {
                    setIsTranslating(false);
                    // Save to history if authenticated
                    if (isAuthenticated() && accumulatedText.trim()) {
                        try {
                            await saveTranslation(
                                sourceText,
                                accumulatedText,
                                sourceLang.name,
                                targetLang.name,
                                selectedModel
                            );
                        } catch (err) {
                            console.error('Failed to save translation to history:', err);
                        }
                    }
                },
                (error) => {
                    console.error('Translation error:', error);
                    setIsTranslating(false);
                }
            );
        } catch (error) {
            console.error('Translation failed:', error);
            setIsTranslating(false);
        }
    }, [sourceText, sourceLang, targetLang, selectedModel, isTranslating, setIsTranslating, setTranslatedText]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [translatedText]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleTranslate();
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 w-full max-w-7xl mx-auto p-4">
            {/* Source Panel */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <LanguageSelector type="source" />
                    <span className="text-xs text-tg-pizarra dark:text-tg-ceniza">{sourceText.length} caracteres</span>
                </div>
                <textarea
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe o pega el texto a traducir..."
                    className="w-full h-64 p-4 text-lg resize-none focus:outline-none bg-transparent dark:text-white placeholder-gray-400"
                />
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={handleTranslate}
                        disabled={isTranslating || !sourceText.trim()}
                        className="px-6 py-3 bg-tg-jade-hondo text-white font-semibold rounded-xl hover:bg-tg-jade-oscuro disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        {isTranslating ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Traduciendo...
                            </span>
                        ) : (
                            'Traducir'
                        )}
                    </button>
                </div>
            </div>

            {/* Swap Button */}
            <div className="flex items-center justify-center lg:self-center">
                <button
                    onClick={swapLanguages}
                    className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    title="Intercambiar idiomas"
                >
                    <ArrowsRightLeftIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </button>
            </div>

            {/* Target Panel */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <LanguageSelector type="target" />
                    <button
                        onClick={handleCopy}
                        disabled={!translatedText}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 transition-colors dark:text-tg-ceniza"
                    >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                        {copied ? '¡Copiado!' : 'Copiar'}
                    </button>
                </div>
                <div className="w-full h-64 p-4 text-lg overflow-auto bg-gray-50 dark:bg-gray-900/50 dark:text-white">
                    {translatedText || (
                        <span className="text-tg-pizarra dark:text-tg-ceniza">La traducción aparecerá aquí...</span>
                    )}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-tg-pizarra dark:text-tg-ceniza">
                    <span>Modelo: {selectedModel}</span>
                    <span>{translatedText.length} caracteres</span>
                </div>
            </div>
        </div>
    );
}
