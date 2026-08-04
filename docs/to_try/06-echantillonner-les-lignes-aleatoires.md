# Évaluer les lignes aléatoires sur plus d'un tirage

**Axe** : recherche (variance) · **Effort** : moyen · **Espoir** : inconnu, jamais mesuré

> Cette fiche est née d'une objection, pas d'une mesure : « la conclusion sur la recherche tient-elle
> pour un joueur qui empile les découvertes et les effets aléatoires ? » La réponse est non, et pour
> une raison que ni les six rejets ni `dev:bench-prefilter` ne couvrent.

## Le constat, structurel

La recherche **ne se ramifie pas** sur l'aléatoire. Deux mécanismes, tous deux vérifiables en
lisant le code :

```ts
// apply_ai_move.ts — resolveSimulatedDiscovers
const chosen = pickOption(pending.options, game.data);
```

Une découverte déclenchée pendant la simulation est résolue sur place par un sélecteur
déterministe. Les trois options proposées viennent, elles, d'un tirage du PRNG seedé. La branche
continue avec **une** main possible parmi celles que la carte pouvait offrir.

Même chose pour les cibles aléatoires (`targetSelectionMode: "RANDOM"`) et les placements de deck
(`deckPlacement: "RANDOM"`) : le moteur tire, la branche suit le tirage.

Et `deriveSeed` fixe une graine par ligne candidate — c'est la technique des nombres aléatoires
communs, excellente pour comparer deux lignes équitablement, mais elle garantit exactement une
chose : **chaque ligne est notée sur un seul échantillon du hasard, toujours le même.**

## Pourquoi c'est un angle mort et pas un défaut connu

Les six rejets consignés dans [`../ai-experiments.md`](../ai-experiments.md) portent tous sur la
TAILLE de l'arbre : plus de nœuds, plus de lignes, plus de plis, meilleur classement. La mesure du
pré-filtre les explique tous d'un coup — l'arbre est petit, la recherche le termine.

Aucun des deux ne dit quoi que ce soit sur la **variance de l'évaluation**. « Exhaustive » veut dire
exhaustive sur un échantillon, pas sur le jeu. Une ligne qui gagne 60 % du temps et une ligne qui
gagne 40 % du temps peuvent parfaitement échanger leur rang sur un tirage unique, et rien dans le
moteur actuel ne le remarquerait.

L'effet croît avec la proportion de cartes aléatoires dans le deck. Sur les quatre listes du dépôt
il est probablement faible. Sur une liste construite autour des découvertes — ce que les joueurs
font volontiers — il ne l'est plus.

## L'idée

Rejouer les lignes STOCHASTIQUES sur plusieurs graines et retenir la moyenne, au lieu du tirage
unique. Trois formes, de la plus ciblée à la plus large :

1. **Ne ré-échantillonner que ce qui est aléatoire.** Marquer les lignes dont la simulation a
   effectivement consommé de l'aléatoire (une découverte résolue, une cible tirée) et ne payer le
   coût que pour celles-là. Les autres sont déjà déterministes : les rejouer ne rendrait que le
   même nombre. C'est la forme à écrire en premier — le budget supplémentaire est proportionnel à
   l'aléatoire réellement rencontré, donc nul sur un deck qui n'en contient pas.
2. **Ré-échantillonner au niveau des `replyCandidates`.** Le pli de riposte ne départage que cinq
   lignes ; les noter chacune sur trois graines coûte trois fois ce pli, et le budget est là — la
   recherche principale n'en consomme qu'un dixième.
3. **Élargir les découvertes en un vrai nœud.** Le plus cher et le plus fidèle : traiter les
   options d'une découverte comme des branches. À ne considérer qu'en dernier, et seulement si les
   deux formes précédentes montrent un signal.

## Comment mesurer

Le piège de méthode est ici plus dangereux que d'habitude : **les decks du banc contiennent peu
d'aléatoire**, donc un banc standard ne pourra rien montrer, ni dans un sens ni dans l'autre. Un
résultat à 50 % ne réfuterait rien.

Il faut d'abord une liste de test à forte densité de découvertes et d'effets aléatoires, ajoutée
aux decks sélectionnables de `dev:bench-prefilter` et du banc. **C'est le vrai travail
d'implémentation de cette piste, et il vient avant la moindre mesure.**

```bash
node ace dev:bench-ai --left=<variante> --right=expert --games=800 --workers=8 \
  --profile=MIDRANGE   # avec le deck aléatoire monté des deux côtés
```

Instrumenter d'abord, comme toujours : compter la part des décisions où au moins une ligne
candidate a consommé de l'aléatoire. Si ce taux est bas même sur le deck de test, la piste se ferme
avant d'avoir coûté une seule partie.

## Ce qui réfuterait la piste

Que le ré-échantillonnage ne déplace pas le choix, même sur un deck saturé d'aléatoire — mesuré
avec un compteur de déplacement comme `ownLethalChangedChoice`. Cela voudrait dire que les lignes
stochastiques se départagent sur leur composante déterministe et que le tirage ne pesait pas dans
le classement.

Ou qu'il le déplace sans effet sur le winrate — le scénario devenu familier ici, arrivé deux fois
sur deux mécanismes qui agissaient pourtant. Ce serait alors la septième confirmation que le choix
entre lignes ne porte pas d'enjeu.
