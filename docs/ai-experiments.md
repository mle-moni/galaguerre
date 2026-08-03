# Journal des expériences sur l'IA

Ce fichier existe pour une seule raison : **empêcher qu'une hypothèse déjà réfutée soit re-tentée**.
Une mesure sérieuse coûte ici entre 20 et 60 minutes de calcul sur 16 cœurs. Une idée séduisante et
fausse en coûte le double, parce qu'on la retente en croyant que la première fois on s'y était mal
pris.

Chaque entrée dit ce qui a été essayé, ce que ça a donné, et surtout **ce que le résultat
disqualifie au-delà du réglage testé**. C'est cette dernière ligne qui a de la valeur : un verdict
isolé ne fait gagner du temps qu'une fois, un verdict qui ferme une famille d'idées en fait gagner
à chaque fois.

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

## Pièges de méthode déjà payés

Ces trois-là ont produit des chiffres faux qu'on a cru vrais. Ils ne concernent pas une hypothèse
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
auquel elle s'applique.** Le banc le fait désormais (`ownLethalChangedChoice`) : mener un
classement fantôme sans l'heuristique et comparer les deux argmax ne coûte aucune recherche
supplémentaire.

---

## Pistes non encore mesurées

À traiter comme des hypothèses, pas comme des améliorations acquises.

- **Ne pas relancer toute la recherche à chaque action.** `run_advanced_ai_turn.ts` refait létal +
  faisceau + ripostes avant chaque action alors qu'il ne joue que `moves[0]`. Mémoriser le plan
  avec détection de divergence, un budget par TOUR et non par action, et un ordonnancement des
  coups amorcé par la ligne précédente. Attention : re-chercher à chaque action donne aussi une
  profondeur effective PLUS GRANDE — le gain est en latence, la force peut baisser. À mesurer à
  budget-temps, pas à budget-nœuds, sinon la question n'a pas de sens.
- **Élargir ce que le pli de riposte peut départager** : `expert-wide-reply` (8 lignes re-notées au
  lieu de 5), puis approfondissement itératif autour de la gagnante, puis regroupement sur les DEUX
  premiers coups dans `bestLinePerFirstMove`.
- **Modèle d'adversaire plus fort** : `expert-strong-opponent-model` (faisceau de riposte 6/14/2000).
  Un gain ici dirait que l'Expert se croit en sécurité trop souvent.
- **Réglage automatique des coefficients de `evaluate_game_state`** (SPSA / CEM). Vu le verdict du
  troisième pli — l'évaluation est déjà fortement corrélée à l'issue — c'est probablement là que se
  trouve la marge restante, et non dans des plis supplémentaires.
- **Mode gauntlet + Elo** pour classer plus de deux variantes à la fois. Non implémenté.
