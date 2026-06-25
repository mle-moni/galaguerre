import { Text } from "@mantine/core";
import { observer } from "mobx-react-lite";
import { Link, Navigate } from "react-router-dom";
import { AppLayout } from "~/components/layout/app_layout";
import { useUser } from "~/hooks/use_user";

const RULE_SECTIONS = [
    {
        title: "Objectif",
        body: "Réduisez les points de vie du héros adverse à 0 avant qu'il ne fasse de même.",
    },
    {
        title: "Tours et mana",
        body: "À chaque tour, votre mana maximum augmente de 1 (jusqu'à 10). Le mana non dépensé ne se reporte pas au tour suivant.",
    },
    {
        title: "Jouer des cartes",
        body: "Jouez des monstres sur votre plateau (7 maximum), des sorts à effet immédiat, ou des armes pour attaquer le héros adverse.",
    },
    {
        title: "Combat",
        body: "Vos monstres peuvent attaquer le tour suivant leur mise en jeu, sauf s'ils ont Charge. Un monstre avec Provocation doit être attaqué en priorité.",
    },
    {
        title: "Fin de tour",
        body: "Passez votre tour quand vous n'avez plus d'action utile. Vous disposez d'environ 105 secondes par tour.",
    },
    {
        title: "Mulligan",
        body: "Avant la partie, vous pouvez échanger des cartes de votre main de départ contre de nouvelles cartes piochées.",
    },
    {
        title: "Fatigue",
        body: "Si vous devez piocher sans carte restante dans votre deck, votre héros subit des dégâts croissants.",
    },
] as const;

export const RulesPage = observer(() => {
    const user = useUser();

    if (!user) return <Navigate to="/login" replace />;

    return (
        <AppLayout title="Comment jouer" backTo="/" backLabel="Accueil">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
                <div className="gg-panel">
                    <div className="gg-panel-header">Règles de Galaguerre</div>
                    <div className="gg-panel-body flex flex-col gap-5">
                        {RULE_SECTIONS.map((section) => (
                            <section key={section.title}>
                                <Text className="text-white font-semibold mb-1">
                                    {section.title}
                                </Text>
                                <Text className="text-white/80 m-0" size="sm">
                                    {section.body}
                                </Text>
                            </section>
                        ))}

                        <Link
                            to={user.onboardingCompletedAt ? "/" : "/onboarding"}
                            className="text-gg-gold text-sm font-medium no-underline hover:underline"
                        >
                            {user.onboardingCompletedAt
                                ? "Retour à l'accueil"
                                : "Continuer l'introduction →"}
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
});
