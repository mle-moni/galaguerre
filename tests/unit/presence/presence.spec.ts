import { isUserOnline, PRESENCE_ONLINE_THRESHOLD_MS } from "#services/presence/presence";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

test.group("presence", () => {
    test("isUserOnline returns false when lastSeenAt is null", ({ assert }) => {
        assert.isFalse(isUserOnline(null));
    });

    test("isUserOnline returns true when lastSeenAt is recent", ({ assert }) => {
        const lastSeenAt = DateTime.now().minus({ seconds: 30 });
        assert.isTrue(isUserOnline(lastSeenAt));
    });

    test("isUserOnline returns false when lastSeenAt is older than threshold", ({ assert }) => {
        const lastSeenAt = DateTime.now().minus({
            milliseconds: PRESENCE_ONLINE_THRESHOLD_MS + 1,
        });
        assert.isFalse(isUserOnline(lastSeenAt));
    });
});
