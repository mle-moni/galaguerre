# Ne plus jeter les ripostes incomplètes

**Axe** : recherche · **Effort** : faible · **Espoir** : moyen

## Le constat

Sur 800 parties appariées, l'Expert de référence affiche :

```
décisions à départager : 19 665
départagées par la riposte : 89,4 %
repli, aucune riposte complète : 10,6 %
ripostes notées / tronquées : 67 411 / 13 802
```

Une décision sur dix retombe intégralement sur le choix de l'IA Avancée, faute d'une seule riposte
exploitable. Et 17 % des ripostes simulées sont calculées puis **jetées**.

## Ce que « incomplète » veut dire exactement

Piège à lire attentivement — le nom du compteur induit en erreur. Dans `search_opponent_reply.ts` :

```ts
complete: !lethal.exhausted && (reply.nodesExplored > 0 || Date.now() <= deadline)
```

En mode déterministe, `deadline` vaut `Infinity`, donc `Date.now() <= deadline` est toujours vrai.
Le critère se réduit alors à `!lethal.exhausted` : **une riposte « tronquée » au banc est une
riposte dont la recherche de létal ADVERSE a épuisé ses 450 nœuds sans conclure.** Le faisceau de
riposte, lui, n'y est pour rien.

C'est pourquoi `expert-deep-reply-lethal` (létal adverse porté à 3000 nœuds) faisait bien tomber ce
compteur de 7 457 à 4 793 — et n'a rien gagné en force pour autant. **Le budget n'est pas le
levier ; ce qu'on FAIT du résultat incertain n'a jamais été testé.**

## L'idée

Aujourd'hui, un létal adverse non prouvé disqualifie le candidat : on préfère l'écarter plutôt que
de le créditer d'une riposte inoffensive qu'on n'a pas vérifiée. La raison est excellente — un
score d'adversaire passif est mécaniquement le plus haut possible, le comparer reviendrait à
préférer systématiquement la ligne qu'on a le moins regardée.

Mais le remède est brutal : quand TOUS les candidats sont dans ce cas, l'Expert perd son pli
entier et joue en Avancé.

Pistes de rechange, à mesurer séparément :

1. **Une pénalité d'incertitude plutôt qu'une exclusion.** Garder le candidat avec son score
   statique diminué d'un terme proportionnel au risque non levé. Il reste comparable aux autres,
   tout en étant pénalisé pour ce qu'on ignore de lui. Le réglage de ce terme est le cœur de
   l'expérience.
2. **Un classement de repli entre incomplets.** Si aucun candidat n'est complet, les départager
   entre eux au score statique plutôt que de tout jeter — strictement mieux que retomber sur le
   choix de l'Avancé, qui ignore la riposte de toute façon.
3. **Rendre la borne optimiste de dégâts exploitable.** `findLethalSequence` coupe une branche dès
   que `optimisticRemainingDamage < enemy.health`. Quand la recherche s'épuise, on sait au moins
   *à quel point* l'adversaire était près du létal. Exposer cette marge permettrait de graduer la
   pénalité du point 1 au lieu de la forfaitiser.

Le point 2 est le moins risqué et le plus rapide à écrire : commencer par lui.

## Comment mesurer

Régime standard, budget de nœuds — cette piste change la POLITIQUE, pas la vitesse :

```bash
node ace dev:bench-ai --left=<variante> --right=expert --games=800 --workers=8
```

Surveiller `repli, aucune riposte complète` : il doit s'effondrer. S'il baisse sans que le winrate
bouge, c'est le scénario `expert-deep-reply-lethal` qui se répète — et il faudra en tirer la
conclusion qui s'impose plutôt que de régler le terme de pénalité indéfiniment.

## Ce qui réfuterait la piste

Que le repli à 10,6 % disparaisse sans effet sur le winrate. Cela voudrait dire que le choix de
l'IA Avancée était, dans ces positions-là, aussi bon que ce que le pli de riposte aurait produit —
et donc que le pli de riposte ne vaut que dans les positions où il aboutit déjà.
