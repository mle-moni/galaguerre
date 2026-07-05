import { Link } from "react-router-dom";

export const BetaOpeningContent = () => (
    <>
        <p>
            La beta de <strong>Galaguerre</strong> est officiellement ouverte. Vous pouvez dès
            maintenant créer un compte, construire vos decks et affronter d&apos;autres joueurs en
            ligne.
        </p>

        <h2>Qu&apos;est-ce que Galaguerre ?</h2>
        <p>
            Galaguerre est un jeu de cartes en duel au tour par tour. Chaque joueur incarne un héros
            et dispose d&apos;un deck de 30 cartes. L&apos;objectif est simple : réduire les points
            de vie de l&apos;adversaire à 0 avant qu&apos;il ne fasse de même.
        </p>
        <p>
            À chaque tour, votre mana maximum augmente (jusqu&apos;à 10). Vous jouez des monstres
            sur votre plateau, lancez des sorts à effet immédiat ou équipez des armes pour attaquer.
            Vos créatures peuvent ensuite frapper le héros adverse ou les monstres ennemis. Quand
            vous avez fini, passez votre tour — l&apos;adversaire enchaîne.
        </p>

        <h2>Fonctionnalités principales</h2>
        <ul>
            <li>
                <strong>Parties classées</strong> — Lancez une recherche de partie depuis le menu
                Jouer et affrontez des adversaires de niveau similaire. Chaque victoire ou défaite
                influence votre classement ELO.
            </li>
            <li>
                <strong>Mode entraînement</strong> — Affrontez l&apos;IA pour vous familiariser avec
                les règles et tester un deck sans pression.
            </li>
            <li>
                <strong>Construction de decks</strong> — Composez vos decks de 30 cartes, ajustez la
                courbe de mana et partagez vos créations avec un code.
            </li>
            <li>
                <strong>Collection et paquets</strong> — Débloquez de nouvelles cartes en ouvrant
                des paquets et suivez votre progression dans la collection.
            </li>
            <li>
                <strong>Boutique</strong> — Dépensez vos story points gagnés en jeu pour acheter de
                nouveaux paquets.
            </li>
            <li>
                <strong>Quêtes quotidiennes</strong> — Relevez des défis chaque jour (gagner des
                parties, poser des monstres, ouvrir des paquets…) pour gagner des récompenses.
            </li>
            <li>
                <strong>Progression</strong> — Gagnez de l&apos;XP à chaque partie, montez en niveau
                et réclamez des récompenses sur la voie de la progression.
            </li>
            <li>
                <strong>Amis et invitations</strong> — Ajoutez des amis, voyez qui est en ligne et
                lancez des duels privés en un clic.
            </li>
            <li>
                <strong>Classement</strong> — Consultez le tableau ELO et le défi speedrun contre
                l&apos;IA pour mesurer votre niveau.
            </li>
            <li>
                <strong>Événements</strong> — Participez aux rendez-vous communautaires annoncés sur
                l&apos;accueil.
            </li>
        </ul>

        <h2>Par où commencer ?</h2>
        <p>
            Si c&apos;est votre première partie, suivez l&apos;introduction au lancement : elle vous
            guide à travers les bases du jeu. Ensuite, rendez-vous sur{" "}
            <Link to="/matchmaking">Jouer</Link> pour lancer une partie classée ou un entraînement.
        </p>
        <p>
            Pour le détail des règles (mulligan, provocation, charge, fatigue…), consultez la page{" "}
            <Link to="/rules">Règles de Galaguerre</Link>.
        </p>
        <p>Bonne chance dans l&apos;arène — et merci de participer à cette beta !</p>
    </>
);
