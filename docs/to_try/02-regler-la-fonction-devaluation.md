# Régler automatiquement la fonction d'évaluation

**Axe** : évaluation · **Effort** : élevé · **Espoir** : élevé

## Pourquoi c'est probablement là que se trouve la marge

Le verdict du troisième pli (voir [`../ai-experiments.md`](../ai-experiments.md)) a produit un
résultat inattendu : chercher explicitement le létal du tour suivant ne déplaçait le choix que sur
0,8 % des décisions où un létal existait. Neuf fois sur dix, la ligne menant au létal dominait
**déjà** le classement statique.

C'est un compliment involontaire à `evaluate_game_state.ts` : ses coefficients réglés à la main
sont déjà fortement corrélés à l'issue de la partie. Et c'est précisément ce qui en fait le point
de levier — une évaluation qui porte l'essentiel du signal est une évaluation dont chaque
amélioration se répercute sur toutes les décisions, à tous les plis, sans coûter un seul nœud
supplémentaire.

Les cinq rejets ont fermé la recherche. Il reste l'évaluation et le débit.

## Ce qu'il y a à régler

Deux jeux de poids dans `evaluate_game_state.ts`, choisis à la main :

```ts
AGGRO_WEIGHTS    { ownHeroHealth: 0.15, enemyHeroDamage: 0.85, ownLowHealthPenalty: 0.5,
                   handCard: 1.2, deckCard: 0.1, board: 1,    unspentMana: 0.45 }
MIDRANGE_WEIGHTS { ownHeroHealth: 0.35, enemyHeroDamage: 0.4,  ownLowHealthPenalty: 0.9,
                   handCard: 1.8, deckCard: 0.2, board: 1.15, unspentMana: 0.3 }
```

Et une douzaine de constantes enfouies dans `evaluateMinion` : la prime de Provocation
(`0.4 * health + 0.5`), celle de Bouclier Divin (`1.5 + 0.3 * attack`), Poison (`+2`), Furie des
vents (`0.6 * attack`), le terme `0.5 * min(attack, health)` qui récompense les statlines
équilibrées, `DANGER_HEALTH_THRESHOLD = 12`, `HAND_QUALITY_WEIGHT = 0.25`,
`AVERAGE_CARD_RAW_VALUE = 3.4`…

Aucune n'a jamais été mesurée. Ce sont des intuitions de conception, probablement bonnes, sûrement
pas optimales.

## Méthode

**SPSA** (Simultaneous Perturbation Stochastic Approximation) est le choix par défaut de ce genre
de réglage dans les moteurs de jeu : il estime un gradient avec seulement deux évaluations par
itération, quel que soit le nombre de paramètres. Perturber tous les coefficients à la fois par
`±c·Δ` (Δ tiré uniformément dans {−1, +1}), jouer un match apparié entre les deux jeux perturbés,
et déplacer les poids dans le sens du gagnant.

Le banc actuel fournit déjà tout le nécessaire :
- `--left-set` / `--right-set` acceptent des surcharges en ligne — mais **uniquement pour les clés
  de `ExpertAiConfig`**. Il faudra étendre `parseConfigOverrides` aux poids d'évaluation, ce qui
  est le vrai travail d'implémentation de cette piste ;
- l'appariement et les graines communes réduisent déjà fortement la variance, ce qui est vital :
  SPSA sur des mesures bruitées ne converge pas, il erre ;
- `--workers` parallélise.

Compter en dizaines de milliers de parties. Sur 16 cœurs, une itération de 200 parties appariées
prend environ 5 minutes ; 300 itérations font une journée de calcul. C'est le prix, et c'est
pourquoi cette piste est classée « effort élevé ».

## Pièges spécifiques

**Le sur-apprentissage sur soi-même.** Régler l'Expert en le faisant jouer contre l'Expert produit
des poids optimaux contre *ce* style, pas contre un humain. Valider le jeu de poids final contre
une référence qui n'a pas servi au réglage — l'Expert d'origine, l'IA Avancée, et si possible des
parties réelles.

**Le sur-apprentissage sur deux decks.** `ADVANCED_AI_DECKS` n'en contient que deux (Aggro pets et
Mid-range). Des poids réglés dessus peuvent être des poids réglés *pour ces listes*. Garder un deck
hors du réglage pour la validation.

**Un jeu de poids par archétype.** `AGGRO_WEIGHTS` et `MIDRANGE_WEIGHTS` doivent être réglés
séparément, sur leurs decks respectifs — les fusionner en un réglage unique perdrait l'essentiel de
ce que ces deux profils expriment.

## Ce qui réfuterait la piste

Que SPSA converge vers des poids indiscernables des poids actuels. Ce serait un excellent
résultat : il dirait que le réglage manuel était déjà bon, fermerait le dernier grand axe, et
justifierait de laisser l'IA en l'état plutôt que de continuer à chercher.
