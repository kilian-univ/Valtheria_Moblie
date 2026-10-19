@AGENTS.md

## Langue

- Toujours répondre en français, y compris dans les messages intermédiaires et les comptes rendus.

## Zone protégée

- Ne jamais modifier `src/context/ApiContext.tsx` ni aucun fichier d'environnement (`.env`, `.env.local`, et toute variante), ni par l'éditeur ni par une commande du terminal. Deux règles hookify le bloquent : `.claude/hookify.block-backend-files.local.md` et `.claude/hookify.block-backend-bash.local.md`. Elles sont locales, exclues de Git par `.git/info/exclude`.
- Ne jamais contourner ce blocage. Si une modification de cette zone semble nécessaire, s'arrêter et expliquer pourquoi.
- Avant chaque commit, vérifier que ni `src/context/ApiContext.tsx` ni un fichier d'environnement ne figurent dans les modifications.

## Sauvegarde

Règle obligatoire, après chaque commit, toujours :
1. pousser `design/ui` sur origin (`git push origin design/ui`) ;
2. avancer `main` en avance rapide sur `design/ui` (`git checkout main && git merge --ff-only design/ui`) ;
3. pousser `main` sur origin (`git push origin main`), puis revenir sur `design/ui` ;
4. lancer `git fetch origin`, puis afficher `git log -1 --oneline origin/main` et `git log -1 --oneline origin/design/ui` ;
5. écrire ces deux lignes à la fin du compte rendu.

Ne jamais terminer une tâche sans ces deux lignes, et elles doivent être identiques. Si l'avance rapide est impossible, ne jamais forcer : s'arrêter et demander.
