import { observer } from "mobx-react-lite";
import { Link, useParams } from "react-router-dom";
import { getNewsBySlug } from "~/news/galaguerre_news";
import { formatNewsPublishedAt, formatNewsPublishedAtLong } from "~/news/format_news_published_at";
import "./news_page.css";

export const NewsDetailPage = observer(() => {
    const { slug } = useParams();
    const entry = slug ? getNewsBySlug(slug) : undefined;

    if (!entry) {
        return (
            <div className="gg-panel p-8 text-center max-w-2xl mx-auto">
                <p className="text-white/80 m-0">Actualité introuvable.</p>
                <Link to="/actualites" className="news-back-link">
                    Voir toutes les actualités
                </Link>
            </div>
        );
    }

    const Content = entry.Content;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="gg-panel">
                <div className="gg-panel-header">{entry.title}</div>
                <div className="gg-panel-body">
                    <img src={entry.imageUrl} alt={entry.title} className="news-detail__banner" />
                    <p className="news-detail__meta">
                        <time dateTime={entry.publishedAt}>
                            {formatNewsPublishedAtLong(entry.publishedAt)}
                        </time>
                        {" · "}
                        {formatNewsPublishedAt(entry.publishedAt)}
                    </p>
                    <div className="news-detail__prose">
                        <Content />
                    </div>
                    <Link to="/actualites" className="news-back-link">
                        Toutes les actualités
                    </Link>
                </div>
            </div>
        </div>
    );
});
