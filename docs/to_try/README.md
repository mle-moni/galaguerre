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

Ce qui reste est de part et d'autre : ce que le faisceau PRODUIT, comment une position est VALUÉE,
et à quelle vitesse on simule.

| # | Piste | Axe | Effort | Espoir |
|---|---|---|---|---|
| [01](01-alleger-le-clone-par-noeud.md) | Alléger le clone par nœud | Débit | Moyen | **Élevé** — 92 % des octets clonés sont immuables |
| [02](02-regler-la-fonction-devaluation.md) | Régler automatiquement l'évaluation | Évaluation | Élevé | **Élevé** — c'est elle qui porte le signal |
| [03](03-budget-par-tour.md) | Un budget par tour, pas par action | Débit | Moyen | Moyen |
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
