# throneteki-deck-helper

Deck formatting and validation helpers for throneteki

## Usage

### `validateDeck(deck, options)`

Returns validation status for the specified deck. Options must include an array of `packs` data and `restrictedList` data from `throneteki-json-data`.

The returned object breaks down any problems with the specified deck in the following fields:

* `basicRules` - boolean specifying whether standard faction and agenda rules were obeyed.
* `faqJoustRules` - boolean specifying whether the deck adheres to Joust format restrictions of the FAQ.
* `faqVersion` - which version of the FAQ was checked
* `noBannedCards` - boolean specifying whether any cards in the deck appear on the current ban list.
* `noUnreleasedCards` - boolean specifying whether any cards in the deck haven't been released yet.
* `extendedStatus` - array of user-presentable error messages related to validation.

### `formatDeckAsFullCards(deck, data)`
Creates a clone of the existing deck with full card data filled in instead of just card codes.

The `data` parameter must include a `cards` object that indexes from card code to full card data, and may contain a `factions` object that indexes from faction code to full faction data.

### `formatDeckAsShortCards(deck)`
Creates a clone of the existing deck with only card codes instead of full card data.
