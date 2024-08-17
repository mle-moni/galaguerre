import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "~/hooks/use_user";
import { privateAxios } from "~/services/axios";

export const MatchmakingPage = () => {
    const user = useUser();
    const [searchingMatch, setSearchingMatch] = useState(false);

    const searchMutation = useMutation({
        mutationFn: async () => {
            const response = await privateAxios.post("/api/games");

            return response.data;
        },
        onSuccess: () => {
            setSearchingMatch(true);
        },
    });
    const handleSearch = () => {
        searchMutation.mutate();
    };

    if (!user) return <Navigate to="/login" />;
    if (user.currentGameId) return <Navigate to="/play" />;

    return (
        <div>
            <h1>Matchmaking page</h1>

            {!searchingMatch && (
                <button type="button" onClick={handleSearch} disabled={searchMutation.isPending}>
                    Rechercher une partie
                </button>
            )}

            {searchingMatch && <h1>Recherche en cours...</h1>}
        </div>
    );
};
