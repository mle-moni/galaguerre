# Pistes à essayer sur l'IA

Des **hypothèses**, pas des améliorations acquises. Chacune décrit ce qu'on croit, pourquoi on le
croit, comment le mesurer, et à quoi ressemblerait une réfutation.

Avant d'en ouvrir une : lire [`../ai-experiments.md`](../ai-experiments.md). Cinq hypothèses y sont
déjà réfutées avec leurs chiffres, et plusieurs ferment des familles d'idées entières. Une piste
qui retombe dans une zone close n'a pas besoin d'être mesurée, elle a besoin d'être abandonnée.

## Pourquoi ces pistes-là

Les cinq rejets convergent : la marge n'est pas dans la recherche. Le faisceau n'a pas de
redondance à récupérer, le pli de riposte est saturé sous trois angles indépendants, et un pli
supplémentaire est redondant avec l'évaluation. Restent deux axes, plus un lot de pistes mineures.

| # | Piste | Axe | Effort | Espoir |
|---|---|---|---|---|
| [01](01-alleger-le-clone-par-noeud.md) | Alléger le clone par nœud | Débit | Moyen | **Élevé** — 92 % des octets clonés sont immuables |
| [02](02-regler-la-fonction-devaluation.md) | Régler automatiquement l'évaluation | Évaluation | Élevé | **Élevé** — c'est elle qui porte le signal |
| [03](03-budget-par-tour.md) | Un budget par tour, pas par action | Débit | Moyen | Moyen |
| [04](04-ripostes-incompletes.md) | Ne plus jeter les ripostes incomplètes | Recherche | Faible | Moyen — 11 % des décisions en dépendent |
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
coûte aucune recherche supplémentaire — voir `ownLethalChangedChoice` dans
`decide_expert_move.ts`.
