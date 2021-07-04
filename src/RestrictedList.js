class RestrictedList {
    constructor(rules) {
        this.rules = rules;
    }

    isCardRestricted(card) {
        return this.rules.restricted && 
        (this.rules.restricted.includes(card.code) ||
        this.rules.restrictedFrom <= card.code ||
        this.rules.restrictedUpTo >= card.code);
    }

    validate(cards) {
        let restrictedCardsOnList = cards.filter(card => this.isCardRestricted(card));
        let bannedCardsOnList = cards.filter(card => this.rules.banned.includes(card.code));
        let noBannedCards = true;

        let errors = [];

        if(restrictedCardsOnList.length > 1) {
            errors.push(`${this.rules.name}: Contains more than 1 card on the restricted list: ${restrictedCardsOnList.map(card => card.title).join(', ')}`);
        }

        if(bannedCardsOnList.length > 0) {
            noBannedCards = false;
            errors.push(`${this.rules.name}: Contains cards that are banned: ${bannedCardsOnList.map(card => card.title).join(', ')}`);
        }

        return {
            name: this.rules.name,
            valid: errors.length === 0,
            restrictedRules: restrictedCardsOnList.length <= 1,
            noBannedCards: noBannedCards,
            errors: errors,
            restrictedCards: restrictedCardsOnList,
            bannedCards: bannedCardsOnList
        };
    }
}

module.exports = RestrictedList;
