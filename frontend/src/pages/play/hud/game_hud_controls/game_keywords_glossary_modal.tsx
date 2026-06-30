import {
    CARD_FAMILY_GLOSSARY_ENTRIES,
    KEYWORD_GLOSSARY_ENTRIES,
} from "#api_types/card_keyword_glossary";
import { CardTagSymbol } from "~/components/cards/card_tag_symbol";
import { Modal, ScrollArea, Text, Title } from "@mantine/core";

interface GameKeywordsGlossaryModalProps {
    opened: boolean;
    onClose: () => void;
}

export const GameKeywordsGlossaryModal = ({ opened, onClose }: GameKeywordsGlossaryModalProps) => {
    return (
        <Modal opened={opened} onClose={onClose} title="Glossaire" centered size="md">
            <ScrollArea.Autosize mah="70vh" type="auto">
                <div className="flex flex-col gap-5">
                    <section>
                        <Title order={5} mb="sm">
                            Effets
                        </Title>
                        <ul className="m-0 pl-0 list-none flex flex-col gap-2">
                            {KEYWORD_GLOSSARY_ENTRIES.map((entry) => (
                                <li key={entry.name}>
                                    <Text size="sm" component="span">
                                        {entry.symbol} {entry.name} : {entry.description}
                                    </Text>
                                </li>
                            ))}
                        </ul>
                    </section>

                    <section>
                        <Title order={5} mb="sm">
                            Familles
                        </Title>
                        <ul className="m-0 pl-0 list-none flex flex-col gap-2">
                            {CARD_FAMILY_GLOSSARY_ENTRIES.map((entry) => (
                                <li key={entry.label}>
                                    <Text
                                        size="sm"
                                        component="span"
                                        className="inline-flex items-center gap-1"
                                    >
                                        <CardTagSymbol symbol={entry.symbol} size={16} />
                                        {entry.label}
                                    </Text>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>
            </ScrollArea.Autosize>
        </Modal>
    );
};
