# Pistes mineures

Chacune tient en peu de code. Espoir modeste, mais coût d'essai faible.

---

## L'adversaire simulé est toujours modélisé en mid-range

*La plus intéressante des cinq : c'est la seule qui touche au CRITÈRE d'évaluation plutôt qu'à la
recherche, donc au seul axe que la mesure du pré-filtre laisse ouvert.*

`search_opponent_reply.ts` :

```ts
const OPPONENT_WEIGHTS: EvaluationWeights = getWeightsForProfile(undefined); // = MIDRANGE
```

Le commentaire l'assume : « poids prêtés à l'adversaire humain, qui n'a pas d'archétype déclaré ».
C'est défendable face à un humain. Ça l'est beaucoup moins face à une liste manifestement aggro,
que **l'Expert omniscient a sous les yeux** : il modélise alors un adversaire qui valorise ses
propres PV à 0,35 et les dégâts au visage à 0,4, alors que le vrai joue à 0,15 / 0,85. Il
sous-estime donc systématiquement la vitesse d'en face.

Le code pour l'inférer existe déjà, dans `advanced_mulligan.ts` : `averageCardCost` sur la main plus
le deck adverse, avec `FAST_DECK_AVERAGE_COST = 2.8` et `SLOW_DECK_AVERAGE_COST = 3.8`. Il suffit
de réutiliser ce classement pour choisir les poids de l'adversaire simulé.

**Réserve** : au banc, `--mirror` donne le même deck aux deux camps, donc l'écart aggro/mid-range
n'y est visible que sur la moitié des paires (celles jouées avec le deck Aggro pets). Mesurer aussi
avec `--profile=AGGRO` pour concentrer le signal.

**Ce qui la réfuterait** : aucun écart avec `--profile=AGGRO`, où l'effet devrait être maximal.

---

## Regrouper sur les deux premiers coups

`bestLinePerFirstMove` ne garde qu'une ligne par PREMIER coup distinct, pour éviter que le palmarès
ne se remplisse de préfixes d'une même idée. Le regroupement pourrait porter sur les deux premiers
coups : le pli de riposte départagerait alors des plans réellement distincts plutôt que des
variantes d'un même début.

**Réserve sérieuse** : l'appelant ne joue que `moves[0]` avant de re-décider. Deux lignes partageant
leur premier coup mènent donc à la même action immédiate, et les départager ne change rien à ce qui
est joué. Le gain ne peut venir que de l'effet du regroupement sur le CLASSEMENT du premier coup —
c'est indirect, et c'est pourquoi cette piste est ici et non dans les majeures.

---

## Approfondissement itératif du pli de riposte

> **Très probablement close.** `dev:bench-prefilter` montre que la recherche du tour de l'IA est
> exhaustive à 40 nœuds pour un budget de 12 000 ; le tour adverse a le même facteur de branchement,
> son faisceau de riposte à 900 nœuds est donc vraisemblablement complet lui aussi — ce qui
> expliquerait le rejet de `expert-strong-opponent-model`, qui doublait ce budget pour rien.
> À vérifier d'une ligne (instrumenter `budgetExhausted` sur le faisceau de riposte) avant
> d'écrire quoi que ce soit ici.

La seule forme d'élargissement que le rejet de `expert-wide-reply` laisse ouverte. Cette variante a
échoué parce qu'à budget constant, ajouter des candidats les affame tous — les ripostes tronquées
avaient bondi de 53 %.

L'approfondissement itératif renverse la logique : une première passe très bon marché sur un grand
nombre de candidats, puis on n'accorde du budget supplémentaire qu'aux lignes encore en course.
Aucun candidat n'est affamé par la présence des autres.

---

## Répartition du budget de l'Expert

`EXPERT_BUDGET_SHARES = { lethal: 0.2, beam: 0.4, reply: 0.4 }` n'a jamais été mesuré. Le létal
offensif se déclenche sur environ 6,3 % des décisions et la borne optimiste de dégâts le coupe
généralement à la racine : 20 % du budget est peut-être trop.

À mesurer à budget-TEMPS uniquement — à budget de nœuds ces parts ne servent à rien, chaque
recherche ayant son propre plafond. Et à mesurer comme une piste de LATENCE : la recherche finissant
avant son budget, redistribuer ce budget ne peut pas la rendre plus forte.

---

## Mode gauntlet et classement Elo

Outillage, pas force de jeu. Le banc n'oppose que deux variantes ; comparer cinq réglages demande
dix matches. Un mode gauntlet qui les fait tourner et rend un classement Elo avec intervalles de
confiance rendrait l'exploration nettement moins laborieuse — et deviendra nécessaire si la piste
[02](02-regler-la-fonction-devaluation.md) est ouverte.
