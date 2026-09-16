import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Constante d'API — à adapter selon l'environnement (dev / prod)
// ---------------------------------------------------------------------------
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://valtheria.fr/api";

const TOKEN_KEY = "api_token";

export type User = {
  id: number;
  email: string;
  pseudo: string;
  level: number;
  plan: string;
  streak: number;
  vals: number;
  xp: number;
  [key: string]: any;
};

export type DictionaryTerm = {
  term: string;
  definition: string;
  category: string;
};

export type Article = {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  cover_image?: string;
  category?: string;
  published_at?: string;
  is_favorite?: boolean;
  is_read_later?: boolean;
  [key: string]: any;
};

export type Lesson = {
  id: number;
  slug: string;
  title: string;
  description?: string;
  xp_reward: number;
  completed: boolean;
  [key: string]: any;
};

export type Module = {
  id: number;
  slug: string;
  title: string;
  icon?: string;
  color?: string;
  difficulty?: string;
  lessons_count: number;
  lessons_completed: number;
  lessons: Lesson[];
  [key: string]: any;
};

export type DailyChallenge = {
  id: number;
  question?: string;
  [key: string]: any;
};

export type LifePathScenario = {
  id: number;
  [key: string]: any;
};

export type Progress = {
  xp: number;
  level: number;
  streak: number;
  vals: number;
  lessons_completed: number;
  lessons_total: number;
  tokens_remaining?: number;
  [key: string]: any;
};

export type PortfolioPosition = {
  id: number;
  [key: string]: any;
};

export type PortfolioSnapshot = {
  id: number;
  [key: string]: any;
};

export type Portfolio = {
  positions: PortfolioPosition[];
  [key: string]: any;
};

export type CashflowEntry = {
  id: number;
  [key: string]: any;
};

export type CashflowCategory = {
  id: number;
  name: string;
  [key: string]: any;
};

export type SavingsGoal = {
  id: number;
  [key: string]: any;
};

export type SavingsContribution = {
  id: number;
  [key: string]: any;
};

export const ApiContext = createContext<any>(null);

// Le serveur enveloppe systématiquement ses réponses dans { data: ... }.
// Cette fonction déplie automatiquement cette enveloppe pour que le reste
// du code n'ait jamais à écrire "result.data" partout.
function unwrap(json: any) {
  return json && typeof json === "object" && "data" in json ? json.data : json;
}

// ---------------------------------------------------------------------------
// Provider — englobe l'app et fournit l'état + les fonctions d'auth
// ---------------------------------------------------------------------------
export function ApiProvider({ children }: any) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Écrit/efface le token à la fois dans le state React et AsyncStorage.
  const saveToken = useCallback(async (newToken: string | null) => {
    if (newToken) {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
    setToken(newToken);
  }, []);

  // Au montage : relit le token stocké, et si présent, recharge le profil
  // utilisateur associé (le token seul est persisté, pas les infos user).
  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      setToken(stored);

      if (stored) {
        try {
          const response = await fetch(`${API_BASE_URL}/user`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${stored}`,
            },
          });
          const json = await response.json();

          if (response.ok) {
            setUser(unwrap(json));
          } else {
            // Token expiré/invalide -> on nettoie tout
            await AsyncStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }
        } catch {
          // Pas de réseau au démarrage : on garde le token, on retentera
          // plus tard via une requête authentifiée classique.
        }
      }

      setIsLoading(false);
    })();
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, password_confirmation: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message || "Échec de l'inscription");
      }

      const { token: newToken, user: newUser } = unwrap(json);
      await saveToken(newToken);
      setUser(newUser);
      return newUser;
    },
    [saveToken]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.message || "Identifiants incorrects");
      }

      const { token: newToken, user: newUser } = unwrap(json);
      await saveToken(newToken);
      setUser(newUser);
      return newUser;
    },
    [saveToken]
  );

  // Wrapper générique pour toutes les routes protégées par auth:sanctum
  const authRequest = useCallback(
    async (path: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "GET", body?: any) => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const hasBody = response.headers.get("content-length") !== "0";
      const json = hasBody ? await response.json().catch(() => null) : null;

      if (!response.ok) {
        if (response.status === 401) {
          await saveToken(null);
          setUser(null);
        }
        throw new Error(json?.message || "Erreur API");
      }

      return unwrap(json);
    },
    [token, saveToken]
  );

  const get = useCallback((path: string) => authRequest(path, "GET"), [authRequest]);
  const post = useCallback(
    (path: string, body?: any) => authRequest(path, "POST", body),
    [authRequest]
  );
  const patch = useCallback(
    (path: string, body?: any) => authRequest(path, "PATCH", body),
    [authRequest]
  );
  const del = useCallback((path: string) => authRequest(path, "DELETE"), [authRequest]);

  const logout = useCallback(async () => {
    try {
      await authRequest("/auth/logout", "POST");
    } finally {
      await saveToken(null);
      setUser(null);
    }
  }, [authRequest, saveToken]);

  // Recharge le profil depuis le serveur et met à jour "user"
  // (utile après un updateUser, ou pour rafraîchir xp/vals/streak à la main).
  const refreshUser = useCallback(async () => {
    const fresh = await authRequest("/user", "GET");
    setUser(fresh);
    return fresh;
  }, [authRequest]);

  const updateUser = useCallback(
    async (payload: Partial<{ name: string; email: string }>) => {
      const updated = await authRequest("/user", "PATCH", payload);
      setUser(updated);
      return updated;
    },
    [authRequest]
  );

  const exportUser = useCallback(() => authRequest("/user/export", "GET"), [authRequest]);

  const deleteAccount = useCallback(async () => {
    await authRequest("/user", "DELETE");
    await saveToken(null);
    setUser(null);
  }, [authRequest, saveToken]);

    
  const getDictionaryTerms = useCallback(
    (): Promise<DictionaryTerm[]> => authRequest("/dictionary/terms", "GET"),
    [authRequest]
  );


  // GET /articles — publique, pas besoin de token
  const getArticles = useCallback(async (): Promise<Article[]> => {
    const response = await fetch(`${API_BASE_URL}/articles`, {
      headers: { Accept: "application/json" },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.message || "Erreur lors du chargement des articles");
    return unwrap(json);
  }, []);

  // GET /articles/latest — publique
  const getLatestArticles = useCallback(async (): Promise<Article[]> => {
    const response = await fetch(`${API_BASE_URL}/articles/latest`, {
      headers: { Accept: "application/json" },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.message || "Erreur lors du chargement des articles");
    return unwrap(json);
  }, []);

  // GET /articles/{slug} — publique
  const getArticle = useCallback(async (slug: string): Promise<Article> => {
    const response = await fetch(`${API_BASE_URL}/articles/${slug}`, {
      headers: { Accept: "application/json" },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.message || "Article introuvable");
    return unwrap(json);
  }, []);

  const viewArticle = useCallback(
    (id: number) => authRequest(`/articles/${id}/view`, "POST"),
    [authRequest]
  );

  const toggleFavoriteArticle = useCallback(
    (id: number) => authRequest(`/articles/${id}/favorite`, "POST"),
    [authRequest]
  );

  const toggleReadLaterArticle = useCallback(
    (id: number) => authRequest(`/articles/${id}/read-later`, "POST"),
    [authRequest]
  );

  // ---------------------------------------------------------------------
  // Apprentissage — modules, leçons, défis, daily/weekly challenges, life-path
  // ---------------------------------------------------------------------

  // GET /modules — liste des modules avec leurs leçons
  const getModules = useCallback(
    (): Promise<Module[]> => authRequest("/modules", "GET"),
    [authRequest]
  );

  // GET /lessons/{id} — détail d'une leçon
  const getLesson = useCallback(
    (id: number): Promise<Lesson> => authRequest(`/lessons/${id}`, "GET"),
    [authRequest]
  );

  // POST /lessons/{id}/start — démarre une leçon
  const startLesson = useCallback(
    (id: number) => authRequest(`/lessons/${id}/start`, "POST"),
    [authRequest]
  );

  // POST /lessons/{id}/complete — marque une leçon comme terminée
  const completeLesson = useCallback(
    (id: number, payload?: any) => authRequest(`/lessons/${id}/complete`, "POST", payload),
    [authRequest]
  );

  // POST /lessons/{id}/defi — résout un défi "vraie vie" (type `defi` des leçons)
  const resolveDefi = useCallback(
    (id: number, payload?: any) => authRequest(`/lessons/${id}/defi`, "POST", payload),
    [authRequest]
  );

  // GET /challenges/defi/pending — défis vraie-vie en attente
  const getPendingDefi = useCallback(
    () => authRequest("/challenges/defi/pending", "GET"),
    [authRequest]
  );

  // GET /daily-challenge — legacy, conservé pour compatibilité
  const getDailyChallengeLegacy = useCallback(
    (): Promise<DailyChallenge> => authRequest("/daily-challenge", "GET"),
    [authRequest]
  );

  // GET /daily-challenge/today — défi quotidien actuel
  const getDailyChallengeToday = useCallback(
    (): Promise<DailyChallenge> => authRequest("/daily-challenge/today", "GET"),
    [authRequest]
  );

  // POST /daily-challenge/answer — répondre au défi quotidien
  const answerDailyChallenge = useCallback(
    (payload: any) => authRequest("/daily-challenge/answer", "POST", payload),
    [authRequest]
  );

  // POST /weekly-challenge/complete — marque le défi hebdo comme terminé
  const completeWeeklyChallenge = useCallback(
    (payload?: any) => authRequest("/weekly-challenge/complete", "POST", payload),
    [authRequest]
  );

  // POST /weekly-challenge/generate — génère un nouveau défi hebdo
  const generateWeeklyChallenge = useCallback(
    () => authRequest("/weekly-challenge/generate", "POST"),
    [authRequest]
  );

  // GET /life-path/today — scénario "life path" du jour
  const getLifePathToday = useCallback(
    (): Promise<LifePathScenario> => authRequest("/life-path/today", "GET"),
    [authRequest]
  );

  // POST /life-path/answer — répondre au scénario life-path
  const answerLifePath = useCallback(
    (payload: any) => authRequest("/life-path/answer", "POST", payload),
    [authRequest]
  );

  // GET /life-path/leaderboard — classement life-path
  const getLifePathLeaderboard = useCallback(
    () => authRequest("/life-path/leaderboard", "GET"),
    [authRequest]
  );

  // GET /progress — progression globale (streak, xp, niveau, etc.)
  const getProgress = useCallback(
    (): Promise<Progress> => authRequest("/progress", "GET"),
    [authRequest]
  );

    // ---------------------------------------------------------------------
  // Portefeuille
  // ---------------------------------------------------------------------

  // GET /portfolio — vue d'ensemble du portefeuille
  const getPortfolio = useCallback(
    (): Promise<Portfolio> => authRequest("/portfolio", "GET"),
    [authRequest]
  );

  // GET /portfolio/history — historique du portefeuille
 const getPortfolioHistory = useCallback(
    (range: '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | 'max' = '1m') =>
      authRequest(`/portfolio/history?range=${range}`, "GET"),
    [authRequest]
  );

  // POST /portfolio/positions — ajoute une position
  const addPortfolioPosition = useCallback(
    (payload: any) => authRequest("/portfolio/positions", "POST", payload),
    [authRequest]
  );

  // PATCH /portfolio/positions/{id} — modifie une position
  const updatePortfolioPosition = useCallback(
    (id: number, payload: any) => authRequest(`/portfolio/positions/${id}`, "PATCH", payload),
    [authRequest]
  );

  // DELETE /portfolio/positions/{id} — supprime une position
  const deletePortfolioPosition = useCallback(
    (id: number) => authRequest(`/portfolio/positions/${id}`, "DELETE"),
    [authRequest]
  );

  // GET /portfolio/snapshots — liste des snapshots du portefeuille
  const getPortfolioSnapshots = useCallback(
    (): Promise<PortfolioSnapshot[]> => authRequest("/portfolio/snapshots", "GET"),
    [authRequest]
  );

  // DELETE /portfolio/snapshots — efface tous les snapshots
  const clearPortfolioSnapshots = useCallback(
    () => authRequest("/portfolio/snapshots", "DELETE"),
    [authRequest]
  );

  // DELETE /portfolio/snapshots/{id} — efface un snapshot précis
  const deletePortfolioSnapshot = useCallback(
    (id: number) => authRequest(`/portfolio/snapshots/${id}`, "DELETE"),
    [authRequest]
  );

  // ---------------------------------------------------------------------
  // Cash-flow
  // ---------------------------------------------------------------------

  // GET /cashflow — liste des entrées de cash-flow
  const getCashflow = useCallback(
    () => authRequest("/cashflow", "GET"),
    [authRequest]
  );

  // POST /cashflow/entries — ajoute une entrée
  const addCashflowEntry = useCallback(
    (payload: any) => authRequest("/cashflow/entries", "POST", payload),
    [authRequest]
  );

  // PATCH /cashflow/entries/{id} — modifie une entrée
  const updateCashflowEntry = useCallback(
    (id: number, payload: any) => authRequest(`/cashflow/entries/${id}`, "PATCH", payload),
    [authRequest]
  );

  // DELETE /cashflow/entries/{id} — supprime une entrée
  const deleteCashflowEntry = useCallback(
    (id: number) => authRequest(`/cashflow/entries/${id}`, "DELETE"),
    [authRequest]
  );

  // GET /cashflow/categories — liste des catégories de cash-flow
  const getCashflowCategories = useCallback(
    (): Promise<CashflowCategory[]> => authRequest("/cashflow/categories", "GET"),
    [authRequest]
  );

  // POST /cashflow/categories — crée une catégorie
  const addCashflowCategory = useCallback(
    (payload: any) => authRequest("/cashflow/categories", "POST", payload),
    [authRequest]
  );

  // PATCH /cashflow/categories/{id} — modifie une catégorie
  const updateCashflowCategory = useCallback(
    (id: number, payload: any) => authRequest(`/cashflow/categories/${id}`, "PATCH", payload),
    [authRequest]
  );

  // DELETE /cashflow/categories/{id} — supprime une catégorie
  const deleteCashflowCategory = useCallback(
    (id: number) => authRequest(`/cashflow/categories/${id}`, "DELETE"),
    [authRequest]
  );

  // POST /cashflow/guide-done — marque le guide de cash-flow comme terminé
  const markCashflowGuideDone = useCallback(
    () => authRequest("/cashflow/guide-done", "POST"),
    [authRequest]
  );

  // POST /cashflow/claim-first-reward — réclame la première récompense cash-flow
  const claimCashflowFirstReward = useCallback(
    () => authRequest("/cashflow/claim-first-reward", "POST"),
    [authRequest]
  );

  // ---------------------------------------------------------------------
  // Objectifs d'épargne
  // ---------------------------------------------------------------------

  // GET /savings — liste des objectifs d'épargne
  const getSavings = useCallback(
    () => authRequest("/savings", "GET"),
    [authRequest]
  );

  // POST /savings/goals — crée un objectif d'épargne
  const addSavingsGoal = useCallback(
    (payload: any) => authRequest("/savings/goals", "POST", payload),
    [authRequest]
  );

  // PATCH /savings/goals/{id} — modifie un objectif d'épargne
  const updateSavingsGoal = useCallback(
    (id: number, payload: any) => authRequest(`/savings/goals/${id}`, "PATCH", payload),
    [authRequest]
  );

  // DELETE /savings/goals/{id} — supprime un objectif d'épargne
  const deleteSavingsGoal = useCallback(
    (id: number) => authRequest(`/savings/goals/${id}`, "DELETE"),
    [authRequest]
  );

  // POST /savings/goals/{id}/contributions — ajoute une contribution à un objectif
  const addSavingsContribution = useCallback(
    (id: number, payload: any) => authRequest(`/savings/goals/${id}/contributions`, "POST", payload),
    [authRequest]
  );

  // DELETE /savings/contributions/{id} — supprime une contribution
  const deleteSavingsContribution = useCallback(
    (id: number) => authRequest(`/savings/contributions/${id}`, "DELETE"),
    [authRequest]
  );

  // POST /savings/reminders/{id}/confirm — confirme un rappel d'épargne
  const confirmSavingsReminder = useCallback(
    (id: number) => authRequest(`/savings/reminders/${id}/confirm`, "POST"),
    [authRequest]
  );

  // POST /savings/reminders/{id}/skip — ignore un rappel d'épargne (une fois)
  const skipSavingsReminder = useCallback(
    (id: number) => authRequest(`/savings/reminders/${id}/skip`, "POST"),
    [authRequest]
  );

  // POST /savings/reminders/{id}/adjust — ajuste un rappel d'épargne
  const adjustSavingsReminder = useCallback(
    (id: number, payload?: any) => authRequest(`/savings/reminders/${id}/adjust`, "POST", payload),
    [authRequest]
  );

  // POST /savings/reminders/{id}/dismiss — écarte définitivement un rappel d'épargne
  const dismissSavingsReminder = useCallback(
    (id: number) => authRequest(`/savings/reminders/${id}/dismiss`, "POST"),
    [authRequest]
  );

  const value = useMemo(
    () => ({
      token,
      user, // <- accès direct : useApi().user.pseudo, .xp, .vals, .streak, etc.
      isAuthenticated: !!token,
      isLoading,
      login,
      register,
      logout,
      get,
      post,
      patch,
      del,
      me: refreshUser,
      refreshUser,
      updateUser,
      exportUser,
      deleteAccount,
      getDictionaryTerms,
      getArticles,
      getLatestArticles,
      getArticle,
      viewArticle,
      toggleFavoriteArticle,
      toggleReadLaterArticle,
      getModules,
      getLesson,
      startLesson,
      completeLesson,
      resolveDefi,
      getPendingDefi,
      getDailyChallengeLegacy,
      getDailyChallengeToday,
      answerDailyChallenge,
      completeWeeklyChallenge,
      generateWeeklyChallenge,
      getLifePathToday,
      answerLifePath,
      getLifePathLeaderboard,
      getProgress,
            getPortfolio,
      getPortfolioHistory,
      addPortfolioPosition,
      updatePortfolioPosition,
      deletePortfolioPosition,
      getPortfolioSnapshots,
      clearPortfolioSnapshots,
      deletePortfolioSnapshot,
      getCashflow,
      addCashflowEntry,
      updateCashflowEntry,
      deleteCashflowEntry,
      getCashflowCategories,
      addCashflowCategory,
      updateCashflowCategory,
      deleteCashflowCategory,
      markCashflowGuideDone,
      claimCashflowFirstReward,
      getSavings,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      addSavingsContribution,
      deleteSavingsContribution,
      confirmSavingsReminder,
      skipSavingsReminder,
      adjustSavingsReminder,
      dismissSavingsReminder,
    }),
    [
      token,
      user,
      isLoading,
      login,
      register,
      logout,
      get,
      post,
      patch,
      del,
      refreshUser,
      updateUser,
      exportUser,
      deleteAccount,
      getDictionaryTerms,
      getArticles,
      getLatestArticles,
      getArticle,
      viewArticle,
      toggleFavoriteArticle,
      toggleReadLaterArticle,
      getModules,
      getLesson,
      startLesson,
      completeLesson,
      resolveDefi,
      getPendingDefi,
      getDailyChallengeLegacy,
      getDailyChallengeToday,
      answerDailyChallenge,
      completeWeeklyChallenge,
      generateWeeklyChallenge,
      getLifePathToday,
      answerLifePath,
      getLifePathLeaderboard,
      getProgress,
            getPortfolio,
      getPortfolioHistory,
      addPortfolioPosition,
      updatePortfolioPosition,
      deletePortfolioPosition,
      getPortfolioSnapshots,
      clearPortfolioSnapshots,
      deletePortfolioSnapshot,
      getCashflow,
      addCashflowEntry,
      updateCashflowEntry,
      deleteCashflowEntry,
      getCashflowCategories,
      addCashflowCategory,
      updateCashflowCategory,
      deleteCashflowCategory,
      markCashflowGuideDone,
      claimCashflowFirstReward,
      getSavings,
      addSavingsGoal,
      updateSavingsGoal,
      deleteSavingsGoal,
      addSavingsContribution,
      deleteSavingsContribution,
      confirmSavingsReminder,
      skipSavingsReminder,
      adjustSavingsReminder,
      dismissSavingsReminder,
    ]
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook d'accès
// ---------------------------------------------------------------------------
export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) {
    throw new Error("useApi doit être utilisé à l'intérieur d'un <ApiProvider>");
  }
  return ctx;
} 