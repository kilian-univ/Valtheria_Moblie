import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { purgeAccountData } from "@/src/state/purge";

// ---------------------------------------------------------------------------
// Constante d'API — à adapter selon l'environnement (dev / prod)
// ---------------------------------------------------------------------------
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://valtheria.fr/api";

const TOKEN_KEY = "api_token";

// ---------------------------------------------------------------------------
// Jeton de connexion : dans le trousseau du téléphone (expo-secure-store),
// lisible après le premier déverrouillage, jamais copié dans les sauvegardes
// iCloud ni sur un autre appareil. Sur le web, où le trousseau n'existe pas :
// AsyncStorage, comme avant. L'ancien jeton gardé dans AsyncStorage (versions
// d'avant le 17 octobre 2026) est repris dans le trousseau, puis effacé.
// ---------------------------------------------------------------------------
const USE_KEYCHAIN = Platform.OS !== "web";
const KEYCHAIN_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function readStoredToken(): Promise<string | null> {
  if (!USE_KEYCHAIN) return AsyncStorage.getItem(TOKEN_KEY);
  const secure = await SecureStore.getItemAsync(TOKEN_KEY, KEYCHAIN_OPTIONS);
  if (secure) return secure;
  const legacy = await AsyncStorage.getItem(TOKEN_KEY);
  if (legacy) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, legacy, KEYCHAIN_OPTIONS);
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch {
      // trousseau indisponible : l'ancien jeton reste en place, repris plus tard
    }
  }
  return legacy;
}

async function writeStoredToken(token: string | null): Promise<void> {
  if (!USE_KEYCHAIN) {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token, KEYCHAIN_OPTIONS);
  else await SecureStore.deleteItemAsync(TOKEN_KEY, KEYCHAIN_OPTIONS);
  // Jamais de copie en clair à côté du trousseau
  await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
}

// Lecture du jeton au démarrage : une lecture qui échoue (stockage abîmé,
// app relancée avant le premier déverrouillage) est retentée une fois, puis
// l'app démarre sans session au lieu d'attendre pour toujours
const TOKEN_RETRY_MS = 500;
async function readStoredTokenSafely(): Promise<string | null> {
  try {
    return await readStoredToken();
  } catch {
    await new Promise((resolve) => setTimeout(resolve, TOKEN_RETRY_MS));
    try {
      return await readStoredToken();
    } catch {
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Requêtes : délai maximal, et réponse lue sans jamais planter
// ---------------------------------------------------------------------------
// Au-delà de ce délai, l'échec est traité comme une coupure du réseau
const REQUEST_TIMEOUT_MS = 15_000;

type ApiResponse = {
  response: Response;
  json: any;
  // false : un corps non vide qui n'est pas du JSON (page HTML d'un portail
  // Wi-Fi, d'une erreur 502…)
  readable: boolean;
};

async function request(url: string, init: RequestInit = {}): Promise<ApiResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return { response, json: null, readable: true };
    }
    const text = await response.text();
    if (text.trim() === "") return { response, json: null, readable: true };
    try {
      return { response, json: JSON.parse(text), readable: true };
    } catch {
      return { response, json: null, readable: false };
    }
  } catch (e) {
    // Délai dépassé : même erreur qu'une coupure du réseau (TypeError)
    if (e instanceof Error && e.name === "AbortError") throw new TypeError("Network request timed out");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// Réponse « réussie » qui n'est pas du JSON : jamais prise pour un succès
const UNREADABLE = "Le serveur a répondu de façon inattendue.";

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

export type Portfolio = {
  positions: PortfolioPosition[];
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
  // Le jeton en cours, lisible au moment où une réponse arrive : une 401
  // reçue par une requête partie avec un ANCIEN jeton (déconnexion puis
  // reconnexion entre-temps) ne doit pas effacer la nouvelle session
  const tokenRef = useRef<string | null>(null);

  // Écrit/efface le token à la fois dans le state React et AsyncStorage.
  const saveToken = useCallback(async (newToken: string | null) => {
    // (pas de « finally » : le compilateur React sauterait le fournisseur)
    let failure: unknown = null;
    let failed = false;
    try {
      await writeStoredToken(newToken);
    } catch (e) {
      failed = true;
      failure = e;
    }
    // La session suit toujours la demande, même si le stockage échoue
    tokenRef.current = newToken;
    setToken(newToken);
    if (failed) throw failure;
  }, []);

  // Au montage : relit le token stocké, et si présent, recharge le profil
  // utilisateur associé (le token seul est persisté, pas les infos user).
  useEffect(() => {
    // Profil du jeton stocké ; ne lève jamais (le compilateur React saute le
    // fournisseur si un try contient une condition ou n'a pas de catch)
    const loadProfile = async (stored: string) => {
      let response: Response;
      let json: unknown;
      let readable: boolean;
      try {
        ({ response, json, readable } = await request(`${API_BASE_URL}/user`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${stored}`,
          },
        }));
      } catch {
        // Pas de réseau au démarrage : on garde le token, on retentera
        // plus tard via une requête authentifiée classique.
        return;
      }
      if (response.ok && readable && json) {
        setUser(unwrap(json));
      } else if (response.status === 401 && tokenRef.current === stored) {
        // Token expiré/invalide -> on nettoie tout (sauf si une
        // connexion a remplacé ce jeton pendant la requête)
        await writeStoredToken(null).catch(() => {});
        tokenRef.current = null;
        setToken(null);
      }
      // Autre erreur (500, 503 : maintenance, surcharge ; réponse
      // illisible) : on garde le token, le profil sera rechargé plus
      // tard (SessionRecovery)
    };
    (async () => {
      // readStoredTokenSafely ne lève jamais ; le chargement du profil non plus
      const stored = await readStoredTokenSafely();
      tokenRef.current = stored;
      setToken(stored);
      if (stored) await loadProfile(stored);
      setIsLoading(false);
    })();
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, password_confirmation: string) => {
      const { response, json, readable } = await request(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, password_confirmation }),
      });

      if (!response.ok) {
        throw new Error(json?.message || "Échec de l'inscription");
      }
      if (!readable || !json) throw new Error(UNREADABLE);

      const { token: newToken, user: newUser } = unwrap(json);
      await saveToken(newToken);
      setUser(newUser);
      return newUser;
    },
    [saveToken]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const { response, json, readable } = await request(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error(json?.message || "Identifiants incorrects");
      }
      if (!readable || !json) throw new Error(UNREADABLE);

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
      // Jeton avec lequel CETTE requête part
      const used = token;
      const { response, json, readable } = await request(`${API_BASE_URL}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${used}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        // 401 : la session est effacée seulement si la requête utilisait le
        // jeton courant. Une réponse tardive d'une requête partie avec un
        // jeton déjà remplacé ou déjà effacé ne touche pas à la session.
        if (response.status === 401 && used !== null && tokenRef.current === used) {
          await saveToken(null);
          setUser(null);
        }
        throw new Error(json?.message || "Erreur API");
      }
      // Succès qui n'est pas du JSON (portail Wi-Fi captif) : une erreur, pas
      // un succès vide (leçon fêtée sans être enregistrée, modules effacés…)
      if (!readable) throw new Error(UNREADABLE);

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

  // Déconnexion : le jeton est révoqué côté serveur si le réseau le permet,
  // puis la session est effacée et les données de la personne purgées du
  // téléphone, MÊME HORS LIGNE. Le dernier profil (identifiant, pseudo) est
  // gardé ; la suppression du compte, elle, efface tout (SettingsScreen).
  // Ne lève jamais d'erreur : l'appelant n'a rien à rattraper.
  const logout = useCallback(async () => {
    const userId = user?.id;
    try {
      await authRequest("/auth/logout", "POST");
    } catch {
      // hors ligne, ou jeton déjà expiré : la session locale est effacée quand même
    }
    // (après le try/catch, pas dans un « finally » : le compilateur React
    // sauterait le fournisseur)
    await saveToken(null);
    setUser(null);
    if (userId != null) await purgeAccountData(userId, { keepLastProfile: true }).catch(() => {});
  }, [authRequest, saveToken, user?.id]);

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


  const getDictionaryTerms = useCallback(
    (): Promise<DictionaryTerm[]> => authRequest("/dictionary/terms", "GET"),
    [authRequest]
  );

  // GET /articles/{slug} — publique
  const getArticle = useCallback(async (slug: string): Promise<Article> => {
    const { response, json, readable } = await request(`${API_BASE_URL}/articles/${slug}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(json?.message || "Article introuvable");
    if (!readable) throw new Error(UNREADABLE);
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
  // Apprentissage — modules, leçons
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

  // ---------------------------------------------------------------------
  // Objectifs d'épargne (ancien outil du site, repris dans le patrimoine)
  // ---------------------------------------------------------------------

  // GET /savings — liste des objectifs d'épargne
  const getSavings = useCallback(
    () => authRequest("/savings", "GET"),
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
      getDictionaryTerms,
      getArticle,
      viewArticle,
      toggleFavoriteArticle,
      toggleReadLaterArticle,
      getModules,
      getLesson,
      startLesson,
      completeLesson,
      getProgress,
            getPortfolio,
      getSavings,
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
      getDictionaryTerms,
      getArticle,
      viewArticle,
      toggleFavoriteArticle,
      toggleReadLaterArticle,
      getModules,
      getLesson,
      startLesson,
      completeLesson,
      getProgress,
            getPortfolio,
      getSavings,
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
