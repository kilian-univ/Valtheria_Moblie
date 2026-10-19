# Rappels : ce que fait l'app, et ses limites

État au 19 octobre 2026 (lot 1). Code : `src/state/reminder.ts` (programmation), `src/utils/reminder.ts` (règles pures, testées), `src/state/budgetReminder.ts` (rappel du budget).

## Le rappel quotidien

- Ce sont des **notifications locales**, programmées sur le téléphone. Rien ne part vers un serveur, aucun jeton de notification n'est enregistré.
- **Un seul rappel par jour**, à l'heure choisie (matin 8 h, midi 12 h 30, soir 19 h, ou une heure libre), avec un **texte différent chaque jour** (sept textes de Val en rotation ; un jour sur deux, le texte parle de l'objectif choisi).
- Pour cela, l'app programme **une notification par jour, 30 jours d'avance** (`REMINDER_DAYS_AHEAD`), et les reprogramme toutes :
  - à chaque ouverture de l'app (`refreshReminder`) ;
  - à chaque fin de leçon (`reminderAfterLesson`).
- **Le jour où la leçon est faite, aucun rappel ne part** : la fin de leçon note le jour (`valtheria:rappel:derniere-lecon`) et reprogramme à partir du lendemain, ce qui annule le rappel du jour s'il n'était pas encore passé. À l'ouverture suivante, le même jour, la reprogrammation saute encore ce jour.
- Si l'autorisation a été retirée dans les réglages du téléphone, le réglage de l'app s'affiche « Coupé » à l'ouverture suivante, au lieu d'une heure trompeuse.

## La limite des 30 jours

iOS n'accepte que **64 notifications en attente** par app. Chaque jour ayant son texte, chaque jour est une notification : 30 jours de rappels plus celui du budget restent sous la limite. Conséquence :

- **après 30 jours sans ouvrir l'app, il n'y a plus de rappel** (avant le lot 1, c'était 14 jours) ;
- la série de rappels repart dès que l'app est rouverte.

Pour aller au-delà, il faudrait renoncer au texte différent chaque jour (une seule notification quotidienne répétée par le système, au même texte) ou accepter un texte générique après le 30e jour (une notification répétée en plus des 30 datées, qui ferait doublon pendant les 30 premiers jours : iOS ne sait pas démarrer une répétition à une date future). Choix du 19 octobre : garder les textes qui changent, documenter la limite.

## Le rappel du budget

Indépendant du rappel quotidien (identifiants « budget-… » contre « rappel-… ») : reprogrammer l'un n'efface pas l'autre. Voir `src/state/budgetReminder.ts`.

## Déconnexion et suppression du compte

Les deux rappels sont annulés et leurs réglages effacés (`src/state/purge.ts`).
