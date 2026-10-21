---
id: f3-league-table
title: Plan a league table
order: 11
kind: breakdown
difficulty: 3
patterns: []
skills: [planning, containers]
terms: [tmap, tarray, ustruct, fname, ftext]
prerequisites: [f3-sentry]
xp: 90
estimatedMinutes: 15
concepts:
  - Choosing a container by the questions it must answer
  - Keeping one source of truth when the same data is shown sorted
---

# Spec

The yard runs a season of head-to-head matches. Each match is between two named players and ends with a score for each. A win earns 3 table points, a draw 1, a loss 0. The league table ranks players by table points, then by total score difference (scored minus conceded), then by name. The HUD shows the top 5 rows with name, played, points, and difference, plus an arrow showing whether each player moved up or down since the previous match. Any player can be looked up by name at any time, and a new name joins the table automatically on their first match.

You are planning, not coding. Decide what data each player has, where it lives, how a match result changes it, how the ranking is produced, and who tells the HUD.

Acceptance:

- Recording a match updates both players and the ranking in one step.
- Looking up one player never walks the whole table.
- Two players level on points and difference are ordered by name, the same way every time.
- The arrows compare each player's rank with their rank before the latest match, not with the start of the season.
- Points for a win, draw, and loss, and the number of rows shown, are tunable without a rebuild.

# Required Pieces

```yaml
- id: player-record
  kind: data
  label: One record per player with played, points, scored, and conceded
  why: Everything the table shows comes from these numbers.
- id: lookup
  kind: step
  label: Find a player's record by name, adding it on first use
  why: Matches arrive by name, and a lookup must not walk the table.
- id: record-match
  kind: step
  label: Apply one match result to both players
  why: Both records and the ranking must change together.
- id: ranking
  kind: step
  label: Produce the order by points, then difference, then name
  why: The table and the arrows both depend on one well-defined order.
- id: rank-change
  kind: step
  label: Remember each player's rank before the latest match
  why: The arrows compare against the previous match only.
- id: table-owner
  kind: class
  label: An actor or component that owns the league data
  why: One owner keeps one source of truth.
- id: hud-table
  kind: class
  label: HUD rows that are told when the table changes
  why: Shows the top rows without polling.
- id: tunables
  kind: data
  label: Points for a win, a draw, and a loss, and the rows shown, as editable values
  why: League rules change by season.
```

# Reference Plans

```yaml
- id: map-then-sort
  title: A map of records, sorted into a ranking after each match
  pieces:
    - { id: record, kind: data, label: FDojoF3LeagueRecord USTRUCT with played and points and scored and conceded, covers: [player-record] }
    - { id: owner, kind: class, label: ADojoF3League owning a TMap from FName to the record, covers: [table-owner, lookup] }
    - { id: match, kind: step, label: RecordMatch finds or adds both players and updates their records, covers: [record-match] }
    - { id: sort, kind: step, label: After each match the league copies the names into a TArray and sorts it with a comparison on points then difference then name, covers: [ranking] }
    - { id: previous, kind: step, label: The sorted array from before the match is kept as the previous ranking and compared by index, covers: [rank-change] }
    - { id: hud, kind: class, label: Table widget that the league calls with the top rows after each match, covers: [hud-table] }
    - { id: rules, kind: data, label: Editable win and draw and loss points and row count on the league, covers: [tunables] }
  edges:
    - { from: match, to: owner, label: updates two records }
    - { from: owner, to: sort, label: rebuilds the ranking }
    - { from: sort, to: previous, label: the old ranking is kept }
    - { from: sort, to: hud, label: top rows sent }
    - { from: rules, to: match, label: points per result }
- id: sorted-array-plus-index
  title: A sorted array of records kept in order, with a map for lookups
  pieces:
    - { id: record, kind: data, label: FDojoF3LeagueRecord USTRUCT that also holds the name and the previous rank, covers: [player-record, rank-change] }
    - { id: owner, kind: class, label: UDojoF3LeagueComponent on the game state owning a TArray of records in rank order, covers: [table-owner] }
    - { id: index, kind: step, label: A TMap from FName to the record's index rebuilt after every reorder, covers: [lookup] }
    - { id: match, kind: step, label: RecordMatch stores each record's current rank as its previous rank and then updates both records, covers: [record-match] }
    - { id: reorder, kind: step, label: Both changed records are moved to their new places with a sort using the same three keys, covers: [ranking] }
    - { id: hud, kind: class, label: Table widget bound to an OnTableChanged event on the component, covers: [hud-table] }
    - { id: rules, kind: data, label: A league rules data asset with points and row count, covers: [tunables] }
  edges:
    - { from: match, to: reorder, label: changed records move }
    - { from: reorder, to: index, label: lookup rebuilt }
    - { from: owner, to: hud, label: broadcasts the change }
    - { from: rules, to: match, label: points per result }
```

# Rubric

- One record per player lives in one place, and the ranking is derived from it rather than stored a second time by hand.
- Looking up a player by name uses a map or an index, never a walk over every record.
- The ranking order is fully defined: points, then difference, then name, so ties never flicker.
- The previous rank is captured before a match changes anything.
- The HUD is told after a match; it does not poll.
- Win, draw, and loss points and the number of rows are named as editable data.

# Alternative Note

Both plans pass. Sorting a copy after every match is the simplest correct plan, and with a few dozen players it costs nothing. Keeping the array sorted with a map index pays off when the table is read far more often than it changes, such as a table shown every frame, but every reorder must rebuild the index, which is where bugs hide. A plan that stores points and rank in two separate structures and updates both by hand fails the first rubric line: the two will drift apart.
