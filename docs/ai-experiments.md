# Journal des expériences sur l'IA

Ce fichier existe pour une seule raison : **empêcher qu'une hypothèse déjà réfutée soit re-tentée**.
Une mesure sérieuse coûte ici entre 20 et 60 minutes de calcul sur 16 cœurs. Une idée séduisante et
fausse en coûte le double, parce qu'on la retente en croyant que la première fois on s'y était mal
pris.

Chaque entrée dit ce qui a été essayé, ce que ça a donné, et surtout **ce que le résultat
disqualifie au-delà du réglage testé**. C'est cette dernière ligne qui a de la valeur : un verdict
isolé ne fait gagner du temps qu'une fois, un verdict qui ferme une famille d'idées en fait gagner
à chaque fois.

## À lire avant tout le reste : la recherche est déjà terminée

Une mesure faite après coup explique les six rejets ci-dessous, et rend inutile toute une catégorie
d'idées. Elle se relance en une commande :

```bash
node ace dev:bench-prefilter --games=12 --rounds=16
```

Sur 75 positions de milieu de partie :

```
coups à ordonner : médiane 6, maximum 24      (pour un topK de 18)
positions où le pré-filtre TRONQUE : 5,3 %
recherches arrêtées par le budget : 0 (0,0 %)  (plafond : 12 000 nœuds)
nœuds simulés, production : médiane 40, maximum 684
nœuds simulés, référence sans pré-filtre à 250 000 nœuds : médiane 40, maximum 712
```

**L'arbre d'un tour tient dans quelques dizaines de nœuds, et le faisceau le termine.** Pas une
seule fois sur 75 positions la recherche principale n'a atteint son budget ; une référence à
250 000 nœuds et sans aucun pré-filtre simule le même nombre de nœuds et trouve les mêmes coups.
Le facteur de branchement du jeu est simplement petit : six coups légaux en médiane, trois ou
quatre actions par tour.

Ce que ça implique, et ce qui aurait fait économiser six expériences :

1. **Aucune amélioration de la RECHERCHE ne peut rapporter de force.** Élargir, approfondir,
   ordonner mieux, mémoriser — il n'y a rien à trouver de plus, tout est déjà trouvé. Les six
   rejets ci-dessous ne sont pas six coïncidences, c'est une seule et même cause mesurée six fois.
2. **Le pré-filtre n'est pas un goulot.** Il ne tronque que 5,3 % des positions et n'y coûte aucun
   désaccord. Régler les constantes de `scoreTrade` ou de `evaluateMinion` *pour le pré-filtre*
   n'a aucun potentiel.
3. **Le débit ne se convertit PAS en profondeur.** Les fiches `to_try/01` et `to_try/03` affirmaient
   le contraire ; c'est faux ici. Une recherche qui finit avant son budget n'ira pas plus loin si on
   l'accélère. Ces pistes restent valables pour la LATENCE — qui est un vrai sujet, l'Expert étant à
   889 ms de p95 — mais leur effet sur la force est nul par construction.
4. **La fonction d'évaluation porte donc 100 % de la force.** Quand la recherche est exhaustive, ce
   qui reste est entièrement le choix du critère. C'est le seul axe qui subsiste.

Réserves honnêtes sur cette mesure : les positions viennent de parties jouées à 120 nœuds par
décision, donc d'un jeu plus faible que le vrai ; et `nodesExplored` ne compte que le faisceau
PRINCIPAL, pas la recherche de létal ni le pli de riposte, qui font l'essentiel des 191 ms par
décision. La complétude constatée porte donc sur le tour de l'IA, pas sur la simulation du tour
adverse — mais le rejet de `expert-strong-opponent-model`, qui doublait le budget de riposte pour
rien, va dans le même sens.

---

## Comment mesurer

```bash
node ace dev:bench-ai --left=<variante> --right=expert --games=800 --workers=8
```

Le protocole par défaut (apparié, budget en nœuds, decks miroir, SPRT) n'est pas décoratif : voir
le docblock de `commands/bench_ai.ts`, qui explique ce que chaque option achète. Les variantes
vivent dans `app/galaguerre/ai/advanced/ai_variants.ts`, une idée par entrée nommée.

**Règle** : une variante ne change QU'UNE chose par rapport à `expert`. Un changement groupé de
trois paramètres se mesure comme un seul verdict, et on ne saura jamais lequel des trois portait
le gain.

**Seuil de décision** : le SPRT teste H0 « aucun écart » contre H1 « +2 points de winrate ». Un
résultat INDÉCIS sur 800 parties appariées ne veut pas dire « à re-tester plus longtemps » : il
veut dire que l'effet, s'il existe, est trop petit pour valoir son coût en latence.

## Synthèse

| Idée | Variante | Verdict | Score (parties) |
|---|---|---|---|
| Table de transposition dans le faisceau | — | **Rejetée** | 4,5 % de collisions pour −17 % de débit |
| Élargir le létal adverse du pli de riposte | `expert-deep-reply-lethal` | **Rejetée** | 51,2 % (400) |
| Troisième pli : létal de l'IA au tour suivant | `expert-own-lethal` | **Rejetée** | 49,3 % (800) |
| Élargir le pli de riposte à 8 lignes | `expert-wide-reply` | **Rejetée** | 48,4 % (800) |
| Modèle d'adversaire plus fort | `expert-strong-opponent-model` | **Rejetée** | 49,3 % (800) |
| Départager les ripostes au létal non réfuté | `expert-rank-incomplete` | **Rejetée** | 49,5 % (800) |
| Court-circuiter la décision de fin de tour | — | **Gardée** | neutre au jeu, gain de latence |

---

## Rejetée — Table de transposition dans le faisceau

**Hypothèse.** Jouer A puis B et B puis A donnent souvent la même position, et le faisceau
développe les deux. Une table de transposition devrait donc supprimer une part importante du
travail.

**Résultat.** Seuls 4,5 % des coups simulés aboutissaient à un état déjà vu, pour une empreinte
d'état qui coûtait environ 17 % du débit. Solde nettement négatif.

**Ce que ça disqualifie.** Le pré-filtrage `topK` et l'élagage du faisceau écartent la plupart des
permutations bien AVANT qu'elles ne se rejoignent. Toute idée de déduplication d'états dans ce
faisceau se heurtera au même plafond : il n'y a pas de redondance à récupérer. Détail dans le
docblock de `search_best_turn.ts`.

---

## Rejetée — Élargir le létal adverse du pli de riposte

**Hypothèse.** Le létal adverse simulé dans chaque riposte ne dispose que de 450 nœuds. Une ligne
létale passant par le retrait d'une Provocation en demande facilement plus. Rater ce létal fait
créditer la ligne d'une riposte inoffensive, donc marcher droit dans la mort au tour suivant.

**Protocole.** `replyLethalMaxNodes` porté de 450 à 3000. 400 parties appariées, decks miroir,
budget en nœuds.

**Résultat.** 205 – 195, soit **51,2 %** (IC 95 % : 46,6 % – 55,9 %), LLR +0,09 → indécis.
Latence moyenne 517 ms contre 195 ms, p95 3635 ms contre 927 ms.

**Le point important.** La variante fait pourtant exactement ce pour quoi elle est écrite : les
ripostes tronquées tombent de 7457 à 4793, et le repli « aucune riposte complète » de 8,6 % à
4,9 %. Elle voit donc réellement plus de létaux adverses. **Ça ne se convertit pas en victoires.**

**Ce que ça disqualifie.** Faire baisser le taux de repli du pli de riposte, qu'on soupçonnait
d'être le verrou, ne rapporte rien. Et à budget de TEMPS de production (et non de nœuds), ces
nœuds seraient pris au faisceau principal : la variante y serait strictement perdante. Les
réglages `reply*` sont une impasse.

---

## Rejetée — Troisième pli : le létal de l'IA au tour suivant

**Hypothèse.** L'Expert s'arrête après la riposte adverse et note la position au jugé statique. Il
ne devrait donc pas distinguer une ligne qui cède deux points de plateau mais met l'adversaire à
portée de létal, d'une ligne qui les garde sans rien menacer — la seconde gagne au classement,
alors que la première gagne la partie. On pousse la simulation d'un pli de plus (mon tour → sa
riposte → **mon** létal) et on prime la ligne qui mène au létal, symétriquement à
`OPPONENT_LETHAL_PENALTY`.

**Protocole.** `replyOwnLethalMaxNodes = 600`. 800 parties appariées, decks miroir, budget en
nœuds.

**Résultat.** **49,3 %** (IC 95 % : 46,2 % – 52,3 %), LLR −1,42 → indécis, sans la moindre
tendance au gain. Latence moyenne 331 ms contre 197 ms, p95 1433 ms contre 931 ms.

**Le chiffre qui explique tout.** Le pli repère un létal sur 7,6 % des décisions, mais ne
**déplace le choix que sur 0,8 %** d'entre elles. Neuf fois sur dix, la ligne qui mène au létal
dominait déjà le classement statique : la prime renchérit sur un gagnant déjà désigné.

**Ce que ça disqualifie.** `evaluate_game_state` est déjà un bon indicateur de « je suis sur le
point de gagner » — plateau, dégâts au héros et tempo y suffisent. Chercher explicitement le létal
du tour suivant est **redondant avec l'évaluation, pas complémentaire**. Toute variante de la même
famille (létal à deux tours, prime de portée, bonus de menace) butera sur le même mur tant que la
fonction d'évaluation restera aussi corrélée à l'issue.

Le code reste en place, **désactivé** (`replyOwnLethalMaxNodes: 0`), avec ses tests : la mesure
vaut d'être reproductible si un jour la fonction d'évaluation change assez pour rouvrir la
question.

---

## Rejetée — Élargir le pli de riposte à 8 lignes candidates

**Hypothèse.** Le pli de riposte ne départage que les 5 premiers coups, choisis sur le score
STATIQUE de fin de tour. Une ligne médiocre statiquement mais excellente après riposte n'entre
jamais dans la liste. En élargir le nombre devrait donc récupérer ces lignes.

**Protocole.** `replyCandidates` porté de 5 à 8. 800 parties appariées, decks miroir, budget en
nœuds.

**Résultat.** **48,4 %** (IC 95 % : 45,3 % – 51,4 %), LLR −2,15 — à un cheveu de la borne de
rejet. Latence moyenne 261 ms contre 200 ms.

**Le mécanisme, lisible dans les compteurs.** Les ripostes TRONQUÉES passent de 13 802 à 21 152
(+53 %). La tranche de temps d'une décision est fixe et se divise entre les candidats : en ajouter
trois les affame tous. Les lignes ajoutées reviennent incomplètes, donc écartées du classement —
on a payé leur simulation pour ne rien pouvoir en faire. Le taux de départage ne bouge pas :
89,5 % contre 89,4 %.

**Ce que ça disqualifie.** Élargir `replyCandidates` **à budget constant** est structurellement
perdant, quel que soit le nombre — inutile d'essayer 6, 7 ou 12. La question n'a de sens
qu'accompagnée d'un budget par candidat garanti, ou d'un approfondissement itératif qui n'accorde
du temps supplémentaire qu'aux lignes encore en course.

---

## Rejetée — Modèle d'adversaire plus fort

**Hypothèse.** C'était le test décisif d'une idée tentante : si l'Expert gagne du winrate en
simulant un adversaire plus fort, c'est que son modèle d'adversaire est trop faible et qu'il se
croit en sécurité trop souvent.

**Protocole.** Faisceau de riposte porté de 3/8/900 à 6/14/2000. 800 parties appariées, decks
miroir, budget en nœuds.

**Résultat.** **49,3 %** (IC 95 % : 46,1 % – 52,4 %), LLR −1,35. Latence moyenne 244 ms contre
195 ms.

**Ce que ça disqualifie.** La faiblesse du modèle d'adversaire n'est pas ce qui limite l'Expert.

Et surtout, en le rapprochant des deux précédents : **trois façons différentes de donner plus de
moyens au pli de riposte** — plus de nœuds pour le létal adverse, plus de lignes candidates, un
faisceau de riposte plus large et plus profond — pour trois fois rien. Le pli de riposte est un
problème RÉSOLU : il départage déjà 89 % des décisions, et le faire mieux ne paie plus. Toute
nouvelle idée dans cette zone part avec une très forte présomption d'échec.

---

## Rejetée — Départager les ripostes au létal adverse non réfuté

**Hypothèse.** La première qui ne donne PAS plus de moyens au pli de riposte, les trois rejets
précédents ayant fermé cette famille. Elle change ce qu'on FAIT d'un résultat incertain.

Une décision sur neuf retombe sur le choix de l'IA Avancée faute d'une seule riposte « complète ».
Or « incomplète » ne veut pas dire « non simulée » — voir le piège de méthode plus bas : au banc, le
critère se réduit à « le létal adverse a épuisé ses 450 nœuds sans conclure ». Le faisceau de
riposte, lui, a bel et bien tourné, et son score est un vrai score de riposte auquel il ne manque
qu'une preuve. On jetait donc des évaluations utilisables pour rendre la main au faisceau, qui n'a
jamais regardé la riposte du tout.

**Protocole.** `replySearched` sépare les deux échecs. Quand aucune ligne n'est complète, les lignes
au létal non réfuté sont départagées entre elles, dans un classement STRICTEMENT séparé du
classement principal — sans quoi l'absence de preuve de létal jouerait en faveur de la ligne
incertaine. 800 parties appariées, decks miroir, budget en nœuds.

**Résultat.** **49,5 %** (IC 95 % : 46,4 % – 52,6 %), LLR −1,20. Latence 191 ms contre 185 ms.

**Ce que ça disqualifie.** C'est le rejet le plus large de la série, et il ne doit rien à une
conjecture : le classement de repli a réellement DÉPLACÉ la ligne jouée sur **3,0 %** des décisions
— près de quatre fois le taux du troisième pli, qui était déjà le mécanisme le plus actif jamais
mesuré ici. Six cents décisions changées par lot de 800 parties, pour un winrate immobile.

**Départager mieux les lignes que le faisceau propose ne paie plus.** Les cinq rejets précédents
suggéraient que le pli de riposte était saturé ; celui-ci le démontre autrement — on a changé le
choix, souvent, gratuitement. Les lignes candidates d'une même position se valent trop pour que leur
ordre compte.

Meurent avec elle, sans mesure supplémentaire, les deux variantes restantes de la même fiche : la
**pénalité d'incertitude** (garder la ligne incertaine avec un score diminué) et sa **graduation par
la borne optimiste de dégâts**. Elles ne diffèrent que par la force avec laquelle une riposte
incertaine pèse sur un classement dont on vient de mesurer qu'il n'a pas de valeur dans ces
positions — et elles ajoutent le risque de laisser une ligne non vérifiée écarter une ligne
vérifiée.

---

## Le fil conducteur des six rejets

Pris ensemble, ces verdicts dessinent une conclusion que chacun pris isolément ne donnait pas.

Les six portent tous sur la même chose sans qu'on l'ait vu tout de suite : **le CHOIX d'une ligne
parmi celles que le faisceau produit.** Plus de nœuds pour le létal adverse, plus de lignes à
départager, un adversaire simulé plus fort, un pli de plus, un classement de repli — cinq façons
d'améliorer l'arbitrage, plus une de le rendre moins coûteux. Aucune ne rapporte rien.

Les deux derniers vont plus loin que « ça ne marche pas » : ils déplacent effectivement le choix,
sur 0,8 % puis 3,0 % des décisions, sans effet mesurable. Ce n'est donc pas que les mécanismes
échouent à agir — **c'est que l'arbitrage lui-même ne porte pas d'enjeu.** Une fois le faisceau
passé, les lignes survivantes se valent.

La mesure du pré-filtre, en tête de ce fichier, donne la cause commune : **la recherche est
exhaustive.** L'arbre d'un tour tient dans quelques dizaines de nœuds pour un budget de douze
mille. Les lignes survivantes se valent parce qu'il n'y a rien à survivre — elles y sont toutes.

Ce qui reste, par élimination, tient donc en un point :

**La fonction d'évaluation** (`evaluate_game_state.ts`), dont les coefficients sont réglés à la
main. Quand la recherche est complète, elle porte 100 % de la force : le choix ne dépend plus que du
critère. C'est aussi elle qui rend les lignes candidates indiscernables — si elles se valent au
classement, c'est qu'elle ne voit pas ce qui les distingue.

Deux axes qu'on croyait ouverts et qui ne le sont pas :

- **Ce que le faisceau PRODUIT** (`prefilterMoves`, `topK`) — mesuré depuis : il ne tronque que
  5,3 % des positions, sans un seul désaccord avec une référence sans pré-filtre. Clos.
- **Le débit de simulation** — il ne se convertit pas en profondeur, puisque la recherche finit
  avant son budget. Il reste un sujet de LATENCE (889 ms de p95), pas de force.

Les pistes correspondantes sont détaillées dans [`to_try/`](to_try/).

---

## Pièges de méthode déjà payés

Ces quatre-là ont produit des chiffres faux qu'on a cru vrais. Ils ne concernent pas une hypothèse
de jeu mais la façon de mesurer, et ils se re-tendent tout seuls.

### Un banc « déterministe » qui ne l'était pas

Les UUID d'entités de jeu venaient de `randomUUID`, non seedé. Or `deriveSeed` les HACHE pour
fabriquer la graine de chaque branche du faisceau : des UUID différents donnaient des graines de
branche différentes, donc une résolution différente des effets aléatoires pendant la recherche,
donc des coups choisis différents. Deux exécutions d'une même graine jouaient des parties
DIFFÉRENTES, et le banc comparait le hasard des UUID autant que les variantes.

Corrigé par `gameEntityUuid()` (`app/utils/random.ts`), adossé au PRNG de simulation. **Toute
nouvelle source d'aléatoire non seedée dans l'état de jeu ramènera le problème.** Ce n'était pas
qu'un défaut de banc d'essai : la garantie de « nombres aléatoires communs » de `deriveSeed` était
déjà cassée en production.

Pour re-vérifier :

```bash
for i in a b; do node ace dev:bench-ai --games=8 --workers=4 --no-sprt > run$i.log 2>&1; done
diff <(grep -v latence runa.log) <(grep -v latence runb.log)
```

Comparer les COMPTEURS (tours moyens, décisions, ripostes), pas seulement le score : deux séries
de parties différentes peuvent rendre le même nombre de victoires par coïncidence. Et **vérifier
que les fichiers ne sont pas vides** avant de conclure — deux fichiers vides diffent parfaitement.

### Un taux de repli qui n'en était pas un

Le compteur `SINGLE_CANDIDATE` affichait 23 % des décisions et a été lu comme « le faisceau ne rend
qu'une ligne dans un quart des positions, c'est là qu'est le verrou ». Faux : `prefilterMoves`
exclut `pass_turn`, donc quand il ne reste plus rien à jouer, le faisceau ne produit aucun candidat
et l'unique nœud rendu est la racine. Ces 23 % étaient **la décision terminale de chaque tour**,
une par tour joué.

Une fois isolée sous `NOTHING_TO_PLAY` et sortie du dénominateur, `SINGLE_CANDIDATE` tombe à 0,0 %
et le pli de riposte départage 89 à 92 % des vraies décisions. Le « verrou » n'existait pas.

**Leçon générale** : avant de bâtir une hypothèse sur un compteur, vérifier ce qu'il compte
vraiment. Ici, un dénominateur mal choisi diluait toutes les parts d'environ un quart.

### Taux de déclenchement ≠ taux d'utilité

Le troisième pli se déclenchait sur 7,6 % des décisions, ce qui donnait l'illusion d'un mécanisme
très actif. Il ne changeait la ligne jouée que sur 0,8 %.

**Pour toute heuristique nouvelle, instrumenter le taux auquel elle DÉPLACE le choix, pas celui
auquel elle s'applique.** Le banc le fait désormais (`ownLethalChangedChoice`,
`incompleteRankingChangedChoice`) : mener un classement fantôme sans l'heuristique et comparer les
deux argmax ne coûte aucune recherche supplémentaire.

Attention à la lecture inverse, tout aussi trompeuse : le classement de repli déplaçait le choix
sur 3,0 % des décisions, un taux quatre fois supérieur, et n'a pas mieux marché. **Un taux de
déplacement élevé ne promet rien non plus** — il rend seulement le verdict négatif interprétable,
en excluant « le mécanisme ne s'est pas exprimé » parmi les explications.

### « Riposte incomplète » ne veut pas dire « riposte non simulée »

```ts
complete: !lethal.exhausted && (reply.nodesExplored > 0 || Date.now() <= deadline);
```

En mode déterministe, `deadline` vaut `Infinity` : le second facteur est toujours vrai et le critère
se réduit à `!lethal.exhausted`. Au banc, une riposte « tronquée » est donc une riposte dont la
recherche de létal ADVERSE s'est épuisée — le faisceau de riposte, lui, a tourné normalement.

Le nom du compteur laissait croire l'inverse, et deux expériences en ont pâti : `expert-deep-reply-lethal`
a fait tomber le compteur sans rien gagner, ce qui n'a été compris qu'après coup, et la fiche
`to_try/04` a été écrite en supposant qu'un budget manquant était en cause. `replySearched` sépare
désormais les deux échecs.

**Un compteur dont le nom décrit l'intention plutôt que la formule finit par être lu comme son
nom.** Vérifier la formule à chaque fois qu'on bâtit une hypothèse dessus.

---

## Pistes non encore mesurées

Détaillées dans [`to_try/`](to_try/) — une fiche par piste, avec sa mesure et ce qui la
réfuterait. Résumé :

| Piste | Axe | Espoir |
|---|---|---|
| [Alléger le clone par nœud](to_try/01-alleger-le-clone-par-noeud.md) | Débit | **Élevé** — 92 % des octets clonés sont immuables |
| [Régler automatiquement l'évaluation](to_try/02-regler-la-fonction-devaluation.md) | Évaluation | **Élevé** — c'est elle qui porte le signal |
| [Un budget par tour, pas par action](to_try/03-budget-par-tour.md) | Débit | Moyen |
| [Ne plus jeter les ripostes incomplètes](to_try/04-ripostes-incompletes.md) | Recherche | **CLOSE** — mesurée et rejetée |
| [Pistes mineures](to_try/05-pistes-mineures.md) | Divers | Faible à moyen |

Les deux premières sont les seules qui restent debout après les six rejets. Les pistes « débit »
sont **invisibles à budget de nœuds** : elles n'ont de sens que mesurées avec
`--no-deterministic --think-ms=...`.

La fiche 04 est conservée fermée plutôt que supprimée : elle contient le raisonnement qui rendait
l'idée séduisante, et c'est ce raisonnement qu'il faut lire pour ne pas le refaire.
