const moment = require('moment');

function getDeckCount(deck) {
    let count = 0;

    for(const cardEntry of deck) {
        count += cardEntry.count;
    }

    return count;
}

function isCardInReleasedPack(packs, card) {
    let pack = packs.find(pack => {
        return card.packCode === pack.code;
    });

    if(!pack) {
        return false;
    }

    let releaseDate = pack.releaseDate;

    if(!releaseDate) {
        return false;
    }

    releaseDate = moment(releaseDate, 'YYYY-MM-DD');
    let now = moment();

    return releaseDate <= now;
}

const legendRules = {};

class DeckValidator {
    constructor(packs) {
        this.packs = packs;
    }

    validateDeck(deck) {
        let errors = [];
        let unreleasedCards = [];
        let rules = this.getRules(deck);
        let drawCount = getDeckCount(deck.drawCards);

        if(drawCount < rules.requiredDraw) {
            errors.push('Too few draw cards');
        }

        for(const rule of rules.rules) {
            if(!rule.condition(deck)) {
                errors.push(rule.message);
            }
        }

        let allCards = deck.drawCards;
        let cardCountByName = {};

        for(let cardQuantity of allCards) {
            cardCountByName[cardQuantity.card.name] = cardCountByName[cardQuantity.card.name] || { name: cardQuantity.card.name, type: cardQuantity.card.type, limit: cardQuantity.card.deckLimit, count: 0 };
            cardCountByName[cardQuantity.card.name].count += cardQuantity.count;
            if(!isCardInReleasedPack(this.packs, cardQuantity.card)) {
                unreleasedCards.push(cardQuantity.card.title + ' is not yet released');
            }			
        }

        for(const card of Object.values(cardCountByName)) {
            if(card.count > card.limit) {
                errors.push(card.name + ' has limit ' + card.limit);
            }
        }

        let isValid = errors.length === 0;

        return {
            status: !isValid ? 'Invalid' : (unreleasedCards.length === 0 ? 'Valid' : 'Unreleased Cards'),
            drawCount: drawCount,
            extendedStatus: errors.concat(unreleasedCards),
            isValid: isValid
        };
    }

    getRules(deck) {
        const standardRules = {
            requiredDraw: 52
        };
        let outfitRules = this.getOutfitRules();
        let legendRules = this.getLegendRules(deck);
        return this.combineValidationRules([standardRules, outfitRules].concat(legendRules));
    }

    getOutfitRules() {
        //No inclusion restrictions for outfit as of TCaR
        return [];
    }

    getLegendRules(deck) {
        if(!deck.legend) {
            return [];
        }

        let allLegends = [];
        return allLegends.map(legend => legendRules[legend.code]);
    }

    combineValidationRules(validators) {
        let mayIncludeFuncs = validators.map(validator => validator.mayInclude).filter(v => !!v);
        let cannotIncludeFuncs = validators.map(validator => validator.cannotInclude).filter(v => !!v);
        let combinedRules = validators.reduce((rules, validator) => rules.concat(validator.rules || []), []);
        let combined = {
            mayInclude: card => mayIncludeFuncs.some(func => func(card)),
            cannotInclude: card => cannotIncludeFuncs.some(func => func(card)),
            rules: combinedRules
        };

        return Object.assign({}, ...validators, combined);
    }

}

module.exports = DeckValidator;
