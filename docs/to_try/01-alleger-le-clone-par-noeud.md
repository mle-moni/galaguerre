# Alléger le clone par nœud

**Axe** : latence · **Effort** : moyen · **Espoir** : élevé pour la latence, **nul pour la force**

> **REQUALIFIÉE EN PISTE DE LATENCE.** `dev:bench-prefilter` montre que la recherche principale
> finit avant son budget : 40 nœuds simulés en médiane pour un plafond de 12 000, budget atteint
> sur 0 position sur 75. **Une recherche qui termine d'elle-même n'ira pas plus loin si on
> l'accélère** — l'effet de cette piste sur la FORCE est nul par construction, et toute mesure de
> winrate sur elle rendra 50 % quel que soit le gain de débit obtenu.
>
> Elle reste valable pour ce qu'elle fait réellement : baisser la latence, aujourd'hui à 191 ms de
> moyenne et 889 ms de p95 par décision. Mesurer un temps, pas un winrate.
> Voir [`../ai-experiments.md`](../ai-experiments.md).

## Le constat, mesuré

`applyAiMove` appelle `cloneGameData` — un `structuredClone` de tout `GameData` — **à chaque nœud
exploré**. C'est l'opération payée le plus souvent de toute l'IA : le débit tourne autour de
4 000 coups/s.

Composition d'un état de début de partie (deck « Aggro pets », 62 957 octets sérialisés) :

| Part | Octets | % de l'état |
|---|---|---|
| `deckCards` des deux joueurs | 54 270 | **86,2 %** |
| mains des deux joueurs | 7 426 | 11,8 % |
| `actionLog` | 2 | 0,0 % (déjà retiré par `stripStateForSearch`) |

Et surtout, en regardant ce que contiennent ces cartes :

| Groupe de champs | Octets | % de l'état |
|---|---|---|
| **Définition immuable de carte** (tout sauf `uuid` et `isGolden`) | 57 852 | **91,9 %** |
| dont actions et passifs (`battlecryActions`, `passives`, `effects`…) | 18 812 | 29,9 % |
| dont présentation pure (`label`, `imageUrl`, `goldenVideoUrl`, `description`) | 9 208 | **14,6 %** |

Une carte pèse 1 084 octets, dont 1 021 (94,2 %) de définition qu'aucune règle ne modifie jamais.

**Autrement dit, la recherche recopie environ 92 % d'octets inertes, des milliers de fois par
décision.** `imageUrl` et `goldenVideoUrl` sont clonés pour choisir un coup.

Reproduire la mesure : un test jetable suffit, voir la méthode dans l'historique de ce fichier —
sérialiser `getDefaultGameData` puis ventiler les octets par champ.

## Deux variantes, très inégales en risque

### (a) Retirer la présentation dans `stripStateForSearch` — ~15 %, sûr

Le précédent existe et fait autorité : `actionLog` a déjà été retiré par ce chemin, pour la même
raison et avec le même argument de sûreté. Seuls des COUPS ressortent d'une décision, jamais
l'état allégé, donc rien de ce qui est retiré ne peut fuir vers le moteur réel.

Champs candidats : `label`, `imageUrl`, `goldenVideoUrl`, `description`.

Vérifier d'abord qu'aucune règle ne lit `label` (des effets « copier une carte nommée X » ou des
filtres par `labelTags` existent — `labelTags` est un champ distinct, mais la vérification est à
faire, pas à supposer).

### (b) Partager les définitions immuables par référence — jusqu'à ~92 %, à prouver

Remplacer `structuredClone` par un clone sur mesure qui recopie l'état mutable (santé, attaque,
compteurs, mots-clés permanents, position) et **partage `originalCard` et les définitions de carte
par référence**.

Le gain potentiel est six fois celui de (a), mais il repose entièrement sur une hypothèse à
prouver : **aucune règle ne mute jamais une définition de carte**. La structure du code y invite
(`MinionState` porte `attack`, `health`, `permanentKeywords` séparément de `originalCard`), mais
c'est exactement le genre d'invariant qu'un seul effet exotique suffit à casser — et la casse
serait silencieuse et globale, une mutation d'une carte partagée contaminant toutes les branches
de la recherche ET l'état réel.

Ne pas tenter (b) sans, au préalable :
- un `Object.freeze` récursif sur les définitions en mode simulation, pour faire échouer bruyamment
  toute mutation pendant la suite de tests ;
- la suite complète au vert sous ce gel.

## Comment mesurer

Le débit d'abord, la force ensuite. Les deux sont nécessaires : un gain de débit qui ne se convertit
pas en victoires ne vaut rien, et c'est arrivé cinq fois dans ce projet.

```bash
node ace dev:bench-search                     # nœuds/s, avant et après
node ace dev:bench-ai --left=<variante> --right=expert --games=800 --workers=8 \
  --no-deterministic --think-ms=2000          # la force, à budget-TEMPS
```

À budget de nœuds (le défaut), cette piste rend **exactement 50 %** par construction : elle ne
change aucune décision, seulement leur coût. Une mesure `--deterministic` qui montrerait un écart
signalerait un bug, pas un gain.

## Ce qui réfuterait la piste

- Le débit ne bouge pas : le clone n'était pas le goulot, c'est le moteur de jeu lui-même.
- Le débit double mais le winrate à budget-temps ne bouge pas : la recherche est déjà au-delà du
  point de rendement décroissant en profondeur. Ce serait un résultat important — il fermerait
  définitivement l'axe « débit » et renverrait tout l'effort vers la fonction d'évaluation.
