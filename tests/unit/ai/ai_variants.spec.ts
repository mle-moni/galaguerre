import { test } from "@japa/runner";
import {
    parseConfigOverrides,
    parseWeightOverrides,
    resolveAiVariant,
} from "#galaguerre/ai/advanced/ai_variants";
import { MIDRANGE_WEIGHTS } from "#galaguerre/ai/advanced/evaluate_game_state";
import { EXPERT_AI_DEFAULTS } from "#galaguerre/ai/advanced/expert_ai_config";

/**
 * Le banc d'essai tourne des heures. Une surcharge mal orthographiée qui passerait en silence
 * ferait mesurer le réglage qu'on croyait avoir changé — d'où le refus explicite d'une clé
 * inconnue, et d'où ces tests.
 */

test.group("ai:variants:overrides", () => {
    test("a config override replaces only the key it names", ({ assert }) => {
        const resolved = resolveAiVariant("expert", parseConfigOverrides("replyCandidates=8"));

        assert.equal(resolved.config.replyCandidates, 8);
        assert.equal(resolved.config.replyBeamWidth, EXPERT_AI_DEFAULTS.replyBeamWidth);
    });

    test("an unknown config key is refused instead of ignored", ({ assert }) => {
        assert.throws(() => parseConfigOverrides("replyCandidate=8"), /Réglage inconnu/);
    });

    test("an unknown evaluation coefficient is refused instead of ignored", ({ assert }) => {
        assert.throws(() => parseWeightOverrides("boardd=1.3"), /Coefficient d'évaluation inconnu/);
    });

    test("a value that is not a number is refused", ({ assert }) => {
        assert.throws(() => parseWeightOverrides("board=beaucoup"), /Surcharge invalide/);
    });

    test("evaluation coefficients accept decimals", ({ assert }) => {
        assert.deepEqual(parseWeightOverrides("board=1.35,handCard=2"), {
            board: 1.35,
            handCard: 2,
        });
    });

    test("weight overrides stay PARTIAL: unnamed coefficients keep the deck profile's value", ({
        assert,
    }) => {
        // Le contrat qui fait la différence entre régler un coefficient et remplacer le jeu entier.
        const resolved = resolveAiVariant("expert", {}, parseWeightOverrides("board=1.35"));

        assert.deepEqual(resolved.weights, { board: 1.35 });
        assert.notProperty(resolved.weights, "handCard");
        assert.equal(
            { ...MIDRANGE_WEIGHTS, ...resolved.weights }.handCard,
            MIDRANGE_WEIGHTS.handCard,
        );
    });

    test("a variant with no weights of its own resolves to an empty override", ({ assert }) => {
        assert.deepEqual(resolveAiVariant("expert").weights, {});
        assert.deepEqual(resolveAiVariant("ADVANCED").weights, {});
    });
});
