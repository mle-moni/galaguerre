import { observer } from "mobx-react-lite";
import { Link } from "react-router-dom";
import { useUser } from "~/hooks/use_user";
import { GALAGUERRE_NEWS } from "~/news/galaguerre_news";
import { formatNewsPublishedAt } from "~/news/format_news_published_at";
import "./news_page.css";

export const NewsListPage = observer(() => {
    const user = useUser();

    return (
        <div className="max-w-2xl mx-auto">
            <div className="gg-panel">
                <div className="gg-panel-header">Actualités</div>
                <div className="gg-panel-body">
                    {GALAGUERRE_NEWS.length === 0 ? (
                        <p className="text-white/80 m-0">Aucune actualité pour le moment.</p>
                    ) : (
                        <div className="news-list">
                            {GALAGUERRE_NEWS.map((entry) => (
                                <Link
                                    key={entry.slug}
                                    to={`/actualites/${entry.slug}`}
                                    className="news-list__item"
                                >
                                    <img src={entry.imageUrl} alt="" className="news-list__thumb" />
                                    <div>
                                        <h2 className="news-list__title">{entry.title}</h2>
                                        <p className="news-list__excerpt">
                                            {entry.shortDescription}
                                        </p>
                                        <span className="news-list__time">
                                            {formatNewsPublishedAt(entry.publishedAt)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    <Link to={user ? "/" : "/login"} className="news-back-link news-back-link--standalone">
                        {user ? "Retour à l'accueil" : "Se connecter"}
                    </Link>
                </div>
            </div>
        </div>
    );
});
