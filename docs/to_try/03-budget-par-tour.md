# Un budget par tour, pas par action

**Axe** : débit · **Effort** : moyen · **Espoir** : moyen

## Le constat

`run_advanced_ai_turn.ts` re-décide avant **chaque action** : à chaque tour de boucle il relance la
recherche de létal, le faisceau complet et les ripostes — puis ne joue que `moves[0]` et
recommence. Le banc mesure environ 27 000 décisions pour 400 parties, soit ~34 décisions par camp
et par partie, pour ~9,4 tours de jeu.

Chaque décision reçoit son propre budget calculé par `computeThinkBudgetMs`. Un tour de 5 actions
consomme donc **cinq budgets complets**, là où un joueur humain réfléchit une fois à son tour
entier.

## Ce qu'il faut bien voir avant de se lancer

Ce n'est **pas** un gaspillage pur, et c'est le piège de cette piste.

Re-chercher après chaque action donne une profondeur effective PLUS GRANDE : la recherche repart
de la position réelle après le coup joué, avec `MAX_SEARCH_DEPTH` disponible à nouveau. Un plan
calculé une fois en début de tour et déroulé aveuglément serait *moins* profond, en plus d'être
périmé dès qu'un effet aléatoire diverge — c'est d'ailleurs la justification écrite en tête de
`decide_next_move.ts`.

**Le gain attendu est en latence, la force peut baisser.** C'est un arbitrage, pas une
optimisation.

## Les trois formes, de la plus sûre à la plus agressive

1. **Mémoriser le plan avec détection de divergence.** Garder la ligne calculée, jouer son premier
   coup, et ne relancer la recherche que si l'état réel après le coup s'écarte de l'état simulé
   (invocation aléatoire, découverte, cible aléatoire). Sinon, jouer le coup suivant du plan. Sûr
   sur le principe, mais perd la profondeur supplémentaire évoquée plus haut.
2. **Un budget par TOUR au lieu de par action.** Le tour reçoit un budget global, chaque décision
   pioche dedans. Évite l'explosion de latence sur les tours longs sans renoncer à re-chercher.
3. **Ordonnancement amorcé par la ligne précédente** (*PV-first*). Ne change pas le nombre de
   recherches mais les rend plus efficaces : présenter d'abord à `prefilterMoves` les coups de la
   ligne trouvée au tour de boucle précédent, pour que le faisceau retrouve vite son meilleur
   candidat. Sans risque de force, gain de débit seul. **C'est par là qu'il faut commencer.**

## Comment mesurer

Impérativement à budget-temps. À budget de nœuds, la forme 3 rend 50 % par construction et les
formes 1 et 2 rendent une force en baisse sans montrer leur contrepartie :

```bash
node ace dev:bench-ai --left=<variante> --right=expert --games=800 --workers=4 \
  --no-deterministic --think-ms=2000
```

Réduire `--workers` : sans budget de nœuds, la contention CPU entre ouvriers devient elle-même une
variable, et un camp plus lent perd des nœuds pour une raison qui n'a rien à voir avec sa
politique.

Regarder la latence p95 autant que le winrate. Aujourd'hui l'Expert est à ~930 ms de p95 par
décision au banc ; c'est la métrique que cette piste doit faire baisser.

## Ce qui réfuterait la piste

Un winrate en baisse à latence égale : la profondeur supplémentaire offerte par la re-recherche
vaut plus que le temps qu'elle coûte, et le comportement actuel est le bon.
