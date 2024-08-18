export const Board = () => {
    return (
        <div className="flex flex-col h-full justify-center items-center">
            <div className="h-[300px] w-full flex justify-center items-center">
                <MinionSpot />
                <MinionSpot />
                <MinionSpot />
                <MinionSpot />
                <MinionSpot />
            </div>
            <div className="border-2 border-dashed w-full" />
            <div className="h-[300px] w-full flex justify-center items-center">
                <MinionSpot />
                <MinionSpot />
                <MinionSpot />
                <MinionSpot />
                <MinionSpot />
            </div>
        </div>
    );
};

const MinionSpot = () => {
    return <div className="w-[120px] h-[150px] bg-red-100 border-dashed m-4" />;
};
