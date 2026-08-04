# Pistes à essayer sur l'IA

Des **hypothèses**, pas des améliorations acquises. Chacune décrit ce qu'on croit, pourquoi on le
croit, comment le mesurer, et à quoi ressemblerait une réfutation.

Avant d'en ouvrir une : lire [`../ai-experiments.md`](../ai-experiments.md). Six hypothèses y sont
déjà réfutées avec leurs chiffres, et plusieurs ferment des familles d'idées entières. Une piste
qui retombe dans une zone close n'a pas besoin d'être mesurée, elle a besoin d'être abandonnée.

## Pourquoi ces pistes-là

Les six rejets convergent, et tous portent sur la même chose : **le CHOIX d'une ligne parmi celles
que le faisceau produit.** Les deux derniers déplacent réellement ce choix — sur 0,8 % puis 3,0 %
des décisions — sans le moindre effet sur le winrate. L'arbitrage entre lignes candidates ne porte
donc pas d'enjeu : une fois le faisceau passé, les lignes survivantes se valent.

Une mesure faite après ces six rejets en donne la cause commune, et elle change le classement
ci-dessous : `node ace dev:bench-prefilter` montre que **la recherche est exhaustive**. Six coups
légaux en médiane, un budget de 12 000 nœuds jamais atteint, 40 nœuds simulés. Il n'y a rien à
trouver de plus dans l'arbre — tout y est déjà.

Conséquence directe sur ces fiches : **les pistes « débit » ne peuvent plus rien pour la FORCE.**
Une recherche qui finit avant son budget n'ira pas plus loin si on l'accélère. Elles restent des
pistes de LATENCE, ce qui est un vrai sujet (889 ms de p95), mais il faut les lire comme telles.

Reste un seul axe de force : **la fonction d'évaluation**, qui porte 100 % de la décision dès lors
que la recherche est complète.

| # | Piste | Axe | Effort | Espoir |
|---|---|---|---|---|
| [02](02-regler-la-fonction-devaluation.md) | Régler automatiquement l'évaluation | Évaluation | Élevé | **Seul axe de force restant** |
| [01](01-alleger-le-clone-par-noeud.md) | Alléger le clone par nœud | Latence | Moyen | Élevé pour la latence, **nul pour la force** |
| [03](03-budget-par-tour.md) | Un budget par tour, pas par action | Latence | Moyen | Moyen pour la latence, **nul pour la force** |
| ~~[04](04-ripostes-incompletes.md)~~ | ~~Ne plus jeter les ripostes incomplètes~~ | Recherche | — | **CLOSE** — mesurée, 49,5 % |
| [05](05-pistes-mineures.md) | Pistes mineures | Divers | Faible | Faible à moyen |

## Deux avertissements de méthode

**Le budget de nœuds cache la vitesse.** `--deterministic` (le défaut) borne la recherche en nœuds
et non à l'horloge : c'est ce qui rend les parties reproductibles, mais cela neutralise
délibérément tout écart de VITESSE. Les pistes 01 et 03 sont invisibles dans ce régime — elles
n'ont de sens qu'à budget-temps :

```bash
node ace dev:bench-ai --left=<variante> --right=expert --games=800 --workers=8 \
  --no-deterministic --think-ms=2000
```

Attention : sans budget de nœuds, les parties ne sont plus reproductibles et la contention CPU
entre les processus ouvriers devient une source de bruit. Réduire `--workers` en conséquence, et
ne comparer que des exécutions faites dans les mêmes conditions de charge.

**Instrumenter le taux d'UTILITÉ, pas de déclenchement.** Une heuristique qui s'applique souvent
peut ne rien changer : le troisième pli se déclenchait sur 7,6 % des décisions et ne déplaçait le
choix que sur 0,8 %. Mener un classement fantôme sans l'heuristique et comparer les deux argmax ne
coûte aucune recherche supplémentaire — voir `ownLethalChangedChoice` et
`incompleteRankingChangedChoice` dans `decide_expert_move.ts`.

Ce compteur ne sert pas à prédire un gain, seulement à rendre un verdict négatif interprétable : le
classement de repli déplaçait le choix quatre fois plus souvent que le troisième pli et n'a pas
mieux marché. Ce qu'il permet, c'est d'écarter « le mécanisme ne s'est pas exprimé » parmi les
explications d'un échec — et donc de fermer une famille au lieu de régler un paramètre.
