import { Link } from "react-router-dom";
import { HOME_ASSETS } from "../home_mock_data.js";

interface HomeHeroProps {
    playTarget: string;
}

export const HomeHero = ({ playTarget }: HomeHeroProps) => (
    <section className="home-hero">
        <div className="home-hero__bg" style={{ backgroundImage: `url(${HOME_ASSETS.heroBg})` }} />
        <div className="home-hero__overlay" />

        <div className="home-hero__content">
            <Link to={playTarget} className="home-hero__cta">
                Jouer maintenant
            </Link>
        </div>
    </section>
);
