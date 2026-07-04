import { Link } from "react-router-dom";
import { getLatestNews } from "~/news/galaguerre_news";
import { formatNewsPublishedAt } from "~/news/format_news_published_at";
import { HomePanel } from "./home_panel.jsx";

export const HomeNewsPanel = () => {
    const news = getLatestNews(3);

    return (
        <HomePanel
            title="Actualités"
            headerRight={
                <Link to="/actualites" className="home-panel__link">
                    Voir toutes
                </Link>
            }
        >
            <div className="home-news-list">
                {news.map((entry) => (
                    <Link
                        key={entry.slug}
                        to={`/actualites/${entry.slug}`}
                        className="home-news-item home-news-item--link"
                    >
                        <img src={entry.imageUrl} alt="" className="home-news-item__thumb" />
                        <div>
                            <h3 className="home-news-item__title">{entry.title}</h3>
                            <p className="home-news-item__excerpt">{entry.shortDescription}</p>
                            <span className="home-news-item__time">
                                {formatNewsPublishedAt(entry.publishedAt)}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </HomePanel>
    );
};
