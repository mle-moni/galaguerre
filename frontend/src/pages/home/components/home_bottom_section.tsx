import {
    HOME_ASSETS,
    HOME_MOCK_PROFILE,
    HOME_MOCK_SEASON_PASS_REWARDS,
} from "../home_mock_data.js";
import { HomeNewsPanel } from "./home_news_panel.jsx";
import { HomePanel } from "./home_panel.jsx";

export const HomeBottomSection = () => {
    const xpPct = (HOME_MOCK_PROFILE.xp / HOME_MOCK_PROFILE.xpMax) * 100;

    return (
        <section className="home-bottom">
            <HomeNewsPanel />

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
