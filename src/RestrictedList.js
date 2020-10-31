class RestrictedList {
    constructor(rules) {
        this.rules = rules;
        this.pods = rules.pods || [];
    }

    validate(cards) {
        let restrictedCardsOnList = cards.filter(card => this.rules.restricted.includes(card.code));
        let bannedCardsOnList = cards.filter(card => this.rules.banned.includes(card.code));
        let noBannedCards = true;

        let errors = [];

        if(restrictedCardsOnList.length > 1) {
            errors.push(`${this.rules.name}: Contains more than 1 card on the restricted list: ${restrictedCardsOnList.map(card => card.name).join(', ')}`);
        }

        if(bannedCardsOnList.length > 0) {
            noBannedCards = false;
            errors.push(`${this.rules.name}: Contains cards that are not tournament legal: ${bannedCardsOnList.map(card => card.name).join(', ')}`);
        }

        for(const pod of this.pods) {
            const podErrors = this.validateRestrictedPods({ pod, cards });
            noBannedCards = noBannedCards && podErrors.length === 0;
            errors = errors.concat(podErrors);
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

    validateRestrictedPods({ pod, cards }) {
        const errors = [];

        const restrictedCard = cards.find(card => card.code === pod.restricted);

        if(!restrictedCard) {
            return errors;
        }

        const cardsOnList = cards.filter(card => pod.cards.includes(card.code));
        if(cardsOnList.length > 0) {
            errors.push(`${this.rules.name}: ${cardsOnList.map(card => card.name).join(', ')} cannot be used with ${restrictedCard.name}`);
        }

        return errors;
    }
}

module.exports = RestrictedList;
