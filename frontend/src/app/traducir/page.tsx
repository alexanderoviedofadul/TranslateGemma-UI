/**
 * Herramienta de traducción (ruta `/traducir`).
 * Antes vivía en `/`; ahora `/` es la landing pública.
 */
import Header from '@/components/Header';
import TranslationPanel from '@/components/TranslationPanel';
import ModelSelector from '@/components/ModelSelector';
import ImageTranslation from '@/components/ImageTranslation';
import TranslationHistory from '@/components/TranslationHistory';
import SiteFooter from '@/components/layout/SiteFooter';
import { LANGUAGES } from '@/lib/languages';

export const metadata = {
    title: 'Traductor — TranslateGemma',
    description: `Traduzca texto e imágenes entre ${LANGUAGES.length} idiomas con un modelo abierto que corre en este servidor.`,
    alternates: { canonical: '/traducir' },
};

export default function TraducirPage() {
    return (
        <div className="min-h-screen flex flex-col bg-tg-niebla dark:bg-tg-noche">
            <Header />
            <TranslationHistory />

            <main className="flex-1 py-8">
                <div className="text-center mb-8 px-4">
                    <nav aria-label="Ruta" className="text-xs text-tg-pizarra dark:text-tg-ceniza mb-4">
                        <a href="/" className="hover:text-tg-jade-hondo dark:hover:text-tg-agua">
                            Inicio
                        </a>{' '}
                        / <span aria-current="page" className="text-tg-tinta dark:text-tg-humo">Traductor</span>
                    </nav>
                    <h1 className="text-3xl md:text-4xl font-bold text-tg-tinta dark:text-tg-humo mb-3">
                        De una orilla a otra
                    </h1>
                    <p className="text-tg-pizarra dark:text-tg-ceniza max-w-2xl mx-auto">
                        {LANGUAGES.length} idiomas. Traduce translategemma, un modelo abierto que corre con Ollama en
                        este servidor: el texto no se envía a ningún proveedor de IA.
                    </p>
                </div>

                <TranslationPanel />

                <div className="max-w-7xl mx-auto px-4 mt-8 grid gap-4 lg:grid-cols-2">
                    <details
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4"
                        open
                    >
                        <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                            ⚙️ Configuración de Modelo
                        </summary>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <ModelSelector />
                        </div>
                    </details>

                    <ImageTranslation />
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
