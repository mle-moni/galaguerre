import {
    HOME_ASSETS,
    HOME_MOCK_NEWS,
    HOME_MOCK_PROFILE,
    HOME_MOCK_SEASON_PASS_REWARDS,
} from "../home_mock_data";
import { HomePanel } from "./home_panel";

export const HomeBottomSection = () => {
    const xpPct = (HOME_MOCK_PROFILE.xp / HOME_MOCK_PROFILE.xpMax) * 100;

    return (
        <section className="home-bottom">
            <HomePanel
                title="Actualités"
                headerRight={<span className="home-panel__link">Voir toutes</span>}
            >
                <div className="home-news-list">
                    {HOME_MOCK_NEWS.map((item) => (
                        <article key={item.id} className="home-news-item">
                            <img src={item.imageUrl} alt="" className="home-news-item__thumb" />
                            <div>
                                <h3 className="home-news-item__title">{item.title}</h3>
                                <p className="home-news-item__excerpt">{item.excerpt}</p>
                                <span className="home-news-item__time">Il y a {item.timeAgo}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </HomePanel>

            <HomePanel title="Passe de Saison" className="home-season-pass">
                <img src={HOME_ASSETS.seasonPassChar} alt="" className="home-season-pass__char" />
                <div className="home-season-pass__top">
                    <div className="home-progression__badge">{HOME_MOCK_PROFILE.level}</div>
                    <div
                        className="home-progression__xp"
                        style={{ flex: 1, paddingRight: "100px" }}
                    >
                        <p className="home-progression__xp-label">
                            {HOME_MOCK_PROFILE.xp.toLocaleString("fr-FR")} /{" "}
                            {HOME_MOCK_PROFILE.xpMax.toLocaleString("fr-FR")} XP
                        </p>
                        <div className="home-progression__bar-track">
                            <div
                                className="home-progression__bar-fill"
                                style={{ width: `${xpPct}%` }}
                            />
                        </div>
                    </div>
                </div>
                <div className="home-season-pass__track">
                    {HOME_MOCK_SEASON_PASS_REWARDS.map((reward) => (
                        <div
                            key={reward.level}
                            className={`home-season-pass__reward${reward.current ? " home-season-pass__reward--current" : ""}${reward.claimed ? " home-season-pass__reward--claimed" : ""}`}
                        >
                            <div className="home-season-pass__reward-icon">🎁</div>
                            <span className="home-season-pass__reward-level">
                                Niv. {reward.level}
                            </span>
                        </div>
                    ))}
                </div>
            </HomePanel>
        </section>
    );
};
