@AGENTS.md

## Langue

- Toujours répondre en français, y compris dans les messages intermédiaires et les comptes rendus.

## Zone protégée

- Ne jamais modifier `src/context/ApiContext.tsx` ni aucun fichier d'environnement (`.env`, `.env.local`, et toute variante), ni par l'éditeur ni par une commande du terminal. Deux règles hookify le bloquent : `.claude/hookify.block-backend-files.local.md` et `.claude/hookify.block-backend-bash.local.md`. Elles sont locales, exclues de Git par `.git/info/exclude`.
- Ne jamais contourner ce blocage. Si une modification de cette zone semble nécessaire, s'arrêter et expliquer pourquoi.
- Avant chaque commit, vérifier que ni `src/context/ApiContext.tsx` ni un fichier d'environnement ne figurent dans les modifications.

## Branches et fusion

Règle obligatoire, pour chaque chantier :
1. créer une branche dédiée depuis `main` à jour (`git fetch origin && git checkout -b <nom-du-chantier> origin/main`), nommée d'après le chantier (par exemple `lot-0-securite-et-cadre`) ;
2. y faire les commits du chantier, puis la pousser (`git push -u origin <nom-du-chantier>`) ;
3. ouvrir une pull request vers `main`, qui décrit ce qui change, ce qui a été vérifié et ce qu'il faut relire ;
4. attendre que la vérification automatique (CI : tests, types, lint) soit verte ; si elle échoue, corriger sur la branche ;
5. fusionner la pull request soi-même, mais seulement après l'accord explicite de l'utilisateur dans la conversation (« tu peux fusionner »). Sans cet accord, s'arrêter à la pull request et donner son adresse dans le compte rendu.

Jamais de push direct sur `main`, jamais de push forcé, jamais de réécriture de l'historique d'une branche poussée.

Gros changements de structure (réécriture d'un fichier central, nouvelle dépendance, changement d'architecture) : les signaler clairement dans le compte rendu, pour que l'utilisateur puisse demander l'avis de Kilian. Kilian n'est pas un relecteur obligatoire.

Avant chaque commit, vérifier que ni `src/context/ApiContext.tsx` ni un fichier d'environnement ne figurent dans les modifications (voir « Zone protégée »).
