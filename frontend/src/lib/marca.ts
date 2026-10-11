/**
 * Contenido de la portada, con la misma fuente que el Manual de Marca v1.0
 * (docs/Manual_Marca_TranslateGemma/v1.0/contenido/producto.json). Nada se escribe aquí que el código no haga:
 * idiomas de languages.ts, modelo por defecto de services/ollama.ts y límites del proxy /ollama.
 */
import { LANGUAGES, type Language } from '@/lib/languages';

export const MODELO = 'translategemma:latest';

export const PARADAS = [
    {
        id: 'escriba',
        titulo: 'Escriba o pegue',
        texto: 'El texto de origen va en un panel y el resultado aparece en el de al lado. Sin cuenta: la cuenta solo sirve para guardar el historial.',
    },
    {
        id: 'pareja',
        titulo: 'Elija la pareja',
        texto: `${LANGUAGES.length} idiomas en el selector, con búsqueda por nombre o por código, y un botón para intercambiar origen y destino.`,
    },
    {
        id: 'directo',
        titulo: 'Traduzca en directo',
        texto: 'La traducción se escribe a medida que el modelo la genera. Con Ctrl o Cmd + Enter se lanza sin soltar el teclado.',
    },
    {
        id: 'imagen',
        titulo: 'Traduzca una imagen',
        texto: 'El modelo instalado lee imágenes: el texto de una foto o de una captura se traduce sin pasar por otro programa.',
    },
    {
        id: 'servidor',
        titulo: 'En este servidor',
        texto: 'El texto viaja cifrado hasta este servidor y lo traduce un modelo local. El servicio solo admite modelos locales: no se envía a ningún proveedor de IA.',
    },
] as const;

const GRUPOS_CODIGOS: { nombre: string; codigos: string[] }[] = [
    { nombre: 'Lenguas de mayor alcance', codigos: ['en', 'es', 'fr', 'de', 'pt', 'it', 'nl', 'ru', 'pl', 'uk'] },
    { nombre: 'Asia', codigos: ['zh-Hans', 'zh-Hant', 'ja', 'ko', 'vi', 'th', 'id', 'ms', 'fil', 'hi', 'bn', 'ta', 'te', 'ur'] },
    { nombre: 'Oriente Medio', codigos: ['ar', 'he', 'tr', 'fa'] },
    { nombre: 'Europa', codigos: ['el', 'cs', 'ro', 'hu', 'sv', 'da', 'fi', 'no'] },
    { nombre: 'África', codigos: ['sw', 'am'] },
    { nombre: 'Otras lenguas de Europa', codigos: ['bg', 'hr', 'sr', 'sk', 'sl', 'et', 'lv', 'lt', 'ca', 'gl', 'eu', 'cy', 'ga', 'is', 'mt'] },
];

/** Los grupos con sus idiomas leídos de LANGUAGES (un código que no exista allí no se pinta). */
export const GRUPOS: { nombre: string; idiomas: Language[] }[] = GRUPOS_CODIGOS.map((g) => ({
    nombre: g.nombre,
    idiomas: g.codigos
        .map((c) => LANGUAGES.find((l) => l.code === c))
        .filter((l): l is Language => Boolean(l)),
}));

export const LIMITES = [
    { id: 'Local', texto: 'Solo modelos locales de traducción. Un modelo de la nube recibe un rechazo.' },
    { id: '8 MB', texto: 'Tamaño máximo de una traducción: el texto y, si la hay, una imagen.' },
    { id: '30/min', texto: 'Traducciones por minuto desde una misma conexión. La siguiente espera un minuto.' },
] as const;

export const PREGUNTAS = [
    {
        p: '¿El texto sale del servidor?',
        r: 'No hacia ningún proveedor de IA. Viaja cifrado desde su navegador hasta este servidor, donde lo traduce un modelo local con Ollama; el servicio rechaza cualquier modelo que no sea local.',
    },
    {
        p: '¿Qué modelo traduce?',
        r: `${MODELO}: el modelo abierto TranslateGemma, de Google DeepMind, construido sobre Gemma 3. Es el único modelo de traducción instalado.`,
    },
    {
        p: '¿Cuántos idiomas?',
        r: `${LANGUAGES.length} en el selector. La documentación del modelo declara 55; aquí se ofrecen los que el selector puede elegir.`,
    },
    {
        p: '¿Se guarda lo que traduzco?',
        r: 'Solo si inicia sesión: entonces cada traducción queda en su historial, en la base de datos de este servidor. Sin sesión no se guarda.',
    },
    {
        p: '¿Es un producto de Google?',
        r: 'No. Usa el modelo abierto TranslateGemma bajo los términos de uso de Gemma. TranslateGemma y Gemma son marcas de Google; este producto no está afiliado a Google.',
    },
    {
        p: '¿Sirve para un documento oficial?',
        r: 'Una traducción automática es un borrador. Revísela antes de firmar o presentar nada; para un documento oficial hace falta un traductor oficial.',
    },
] as const;
