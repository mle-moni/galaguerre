import { Button, Modal, Stack, Text, TextInput } from "@mantine/core";
import { IconCheck, IconCopy, IconShare } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useShareDeckMutation } from "~/hooks/use_deck_shares";
import { notifyError, notifySuccess } from "~/services/toasts";

interface ShareDeckModalProps {
    deckId: number | null;
    onClose: () => void;
}

export const ShareDeckModal = ({ deckId, onClose }: ShareDeckModalProps) => {
    const shareMutation = useShareDeckMutation();
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (deckId === null) {
            setShareUrl(null);
            setCopied(false);
        }
    }, [deckId]);

    const handleShare = async () => {
        if (deckId === null) return;

        try {
            const result = await shareMutation.mutateAsync(deckId);
            const fullUrl = `${window.location.origin}${result.url}`;
            setShareUrl(fullUrl);
        } catch {
            notifyError("Impossible de partager ce deck");
        }
    };

    const handleCopy = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            notifySuccess("Lien copié");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            notifyError("Impossible de copier le lien");
        }
    };

    const handleClose = () => {
        setShareUrl(null);
        setCopied(false);
        onClose();
    };

    return (
        <Modal opened={deckId !== null} onClose={handleClose} title="Partager ce deck" centered>
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Un lien public sera créé à partir de la version sauvegardée du deck.
                </Text>

                {shareMutation.isPending && <Text size="sm">Génération du lien...</Text>}

                {shareUrl && (
                    <TextInput
                        label="Lien de partage"
                        value={shareUrl}
                        readOnly
                        rightSection={
                            <Button
                                variant="subtle"
                                size="compact-sm"
                                onClick={handleCopy}
                                leftSection={
                                    copied ? <IconCheck size={14} /> : <IconCopy size={14} />
                                }
                            >
                                {copied ? "Copié" : "Copier"}
                            </Button>
                        }
                    />
                )}

                {!shareUrl && !shareMutation.isPending && (
                    <Button
                        className="gg-btn-primary"
                        leftSection={<IconShare size={16} />}
                        onClick={handleShare}
                    >
                        Générer un lien
                    </Button>
                )}
            </Stack>
        </Modal>
    );
};
