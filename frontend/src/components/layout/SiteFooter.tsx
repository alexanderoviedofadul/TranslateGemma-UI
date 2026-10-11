/**
 * Pie de página común a todas las vistas (portada, traductor, administración).
 * Incluye la alianza con Cédula 360, el contacto y la nota de marca: TranslateGemma y Gemma son marcas de
 * Google; este producto usa su modelo abierto y no está afiliado a Google (Manual de Marca v1.0, cap. 01).
 */
import Logo from '@/components/marca/Logo';

export default function SiteFooter() {
    return (
        <footer className="border-t border-tg-borde dark:border-tg-linea bg-white dark:bg-tg-noche">
            <div className="max-w-7xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                    <Logo tam={32} className="mb-3" />
                    <p className="text-tg-pizarra dark:text-tg-ceniza leading-relaxed">
                        Traducción entre 53 idiomas con el modelo abierto
                        TranslateGemma, ejecutado con Ollama en este servidor.
                    </p>
                </div>

                <div>
                    <h2 className="font-semibold text-tg-tinta dark:text-tg-humo mb-3">
                        Producto
                    </h2>
                    <ul className="space-y-2 text-tg-pizarra dark:text-tg-ceniza">
                        <li>
                            <a href="/traducir" className="hover:text-tg-jade-hondo dark:hover:text-tg-agua underline-offset-2 hover:underline">
                                Usar el traductor
                            </a>
                        </li>
                        <li>
                            <a href="/admin" className="hover:text-tg-jade-hondo dark:hover:text-tg-agua underline-offset-2 hover:underline">
                                Administración
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://github.com/alexanderoviedofadul/TranslateGemma-UI"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-tg-jade-hondo dark:hover:text-tg-agua underline-offset-2 hover:underline"
                            >
                                Código fuente
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h2 className="font-semibold text-tg-tinta dark:text-tg-humo mb-3">
                        Contacto
                    </h2>
                    <ul className="space-y-2 text-tg-pizarra dark:text-tg-ceniza">
                        <li>
                            <a
                                href="mailto:info@cedula360.tech"
                                className="hover:text-tg-jade-hondo dark:hover:text-tg-agua underline-offset-2 hover:underline"
                            >
                                info@cedula360.tech
                            </a>
                        </li>
                        <li>
                            <a
                                href="https://cedula360.tech"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-tg-jade-hondo dark:hover:text-tg-agua underline-offset-2 hover:underline"
                            >
                                cedula360.tech
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h2 className="font-semibold text-tg-tinta dark:text-tg-humo mb-3">
                        Alianza
                    </h2>
                    <p className="text-tg-pizarra dark:text-tg-ceniza">
                        En alianza con{' '}
                        <a
                            href="https://cedula360.tech"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-tg-jade-hondo dark:text-tg-agua underline underline-offset-2"
                        >
                            Cédula 360
                        </a>
                        : puede entrar con su cuenta y su segundo factor.
                    </p>
                </div>
            </div>

            <div className="border-t border-tg-borde dark:border-tg-linea">
                <p className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-tg-pizarra dark:text-tg-ceniza">
                    © {new Date().getFullYear()} TranslateGemma UI · Se traduce en este servidor con Ollama ·
                    TranslateGemma y Gemma son marcas de Google; este producto no está afiliado a Google.
                </p>
            </div>
        </footer>
    );
}
