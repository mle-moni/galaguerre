import { createContext, useContext } from "react";

const OnboardingGameContext = createContext(false);

export const OnboardingGameProvider = OnboardingGameContext.Provider;

export const useOnboardingGame = () => useContext(OnboardingGameContext);
