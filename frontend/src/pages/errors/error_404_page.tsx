import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";

export const Error404Page = observer(() => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
            <div className="gg-panel p-8 text-center w-full max-w-md">
                <h1 className="text-4xl font-bold text-gg-gold m-0 mb-2">404</h1>
                <p className="text-white/80 m-0 mb-6">Cette page n'existe pas.</p>
                <Link to="/" className="text-gg-gold font-semibold no-underline hover:underline">
                    Retour à l'accueil
                </Link>
            </div>
        </div>
    );
});
