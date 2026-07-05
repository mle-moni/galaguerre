import {
    GOLD_COINS_PER_DEFEAT,
    GOLD_COINS_PER_PACK,
    GOLD_COINS_PER_VICTORY,
} from "#api_types/rewards.types";
import { Group, Modal, Stack, Text } from "@mantine/core";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { GoldCoinIcon } from "~/components/rewards/gold_coin_icon";
import { PackIcon } from "~/components/rewards/pack_icon";
import { useBuyPackMutation } from "~/hooks/use_collection";
import { useUser } from "~/hooks/use_user";
import { notifyError, notifySuccess } from "~/services/toasts";
import "./collection_shop_page.css";

export const CollectionShopPage = observer(() => {
    const user = useUser()!;
    const buyPackMutation = useBuyPackMutation();
    const [helpOpened, setHelpOpened] = useState(false);

    const goldCoins = user.goldCoins;
    const canAfford = goldCoins >= GOLD_COINS_PER_PACK;

    const handleBuy = async () => {
        try {
            await buyPackMutation.mutateAsync();
            notifySuccess("Paquet acheté !");
        } catch {
            notifyError("Impossible d'acheter le paquet");
        }
    };

    return (
        <>
            <div className="shop-page">
                <div className="shop-page__bg" aria-hidden="true" />
                <div className="shop-page__overlay" aria-hidden="true" />

                <div className="shop-page__content">
                    <h1 className="shop-page__title">Boutique</h1>

                    <div className="shop-balance">
                        <div className="shop-balance__label">
                            <GoldCoinIcon size={28} tooltip={false} />
                            <span>Vos story points</span>
                        </div>
                        <span className="shop-balance__amount">
                            {goldCoins.toLocaleString("fr-FR")}
                        </span>
                    </div>

                    <div className="shop-product">
                        <div className="shop-product__corners" aria-hidden="true" />

                        <div className="shop-product__body">
                            <div className="shop-product__info">
                                <h2 className="shop-product__name">
                                    Paquet
                                    <br />
                                    de cartes
                                </h2>

                                <div className="shop-product__divider" aria-hidden="true">
                                    <span className="shop-product__divider-diamond" />
                                </div>

                                <p className="shop-product__description">
                                    5 cartes aléatoires pour enrichir votre collection.
                                </p>

                                <div className="shop-product__price-row">
                                    <span className="shop-product__price">
                                        <GoldCoinIcon size={20} tooltip={false} />
                                        {GOLD_COINS_PER_PACK} story points
                                    </span>
                                    <button
                                        type="button"
                                        className="shop-product__info-btn"
                                        aria-label="Comment gagner des story points"
                                        onClick={() => setHelpOpened(true)}
                                    >
                                        i
                                    </button>
                                </div>
                            </div>

                            <div className="shop-product__visual">
                                <div className="shop-product__visual-glow" aria-hidden="true" />
                                <div className="shop-product__pack">
                                    <PackIcon width={240} />
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            className={clsx(
                                "shop-product__buy",
                                buyPackMutation.isPending && "shop-product__buy--loading",
                            )}
                            onClick={handleBuy}
                            disabled={!canAfford || buyPackMutation.isPending}
                        >
                            {buyPackMutation.isPending ? "Achat…" : "Acheter"}
                        </button>
                    </div>
                </div>
            </div>

            <Modal
                opened={helpOpened}
                onClose={() => setHelpOpened(false)}
                title="Comment gagner des story points ?"
                centered
            >
                <Stack gap="sm">
                    <Text size="sm" c="dimmed">
                        Victoire :{" "}
                        <Group component="span" gap={4} wrap="nowrap" display="inline-flex">
                            <GoldCoinIcon size={16} />
                            <span>+{GOLD_COINS_PER_VICTORY}</span>
                        </Group>
                    </Text>
                    <Text size="sm" c="dimmed">
                        Défaite ou match nul :{" "}
                        <Group component="span" gap={4} wrap="nowrap" display="inline-flex">
                            <GoldCoinIcon size={16} />
                            <span>+{GOLD_COINS_PER_DEFEAT}</span>
                        </Group>
                    </Text>
                    <Text size="sm" c="dimmed">
                        Complétez les quêtes journalières sur l&apos;accueil pour gagner des story
                        points et des paquets.
                    </Text>
                </Stack>
            </Modal>
        </>
    );
});
