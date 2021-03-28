const moment = require('moment');

const RestrictedList = require('./RestrictedList');

function getDeckCounts(deck) {
    let count = {
        drawCount: 0,
        jokerCount: 0,
        startingCount: 0
    };

    for(const cardEntry of deck) {
        if(cardEntry.card.type_code === 'joker') {
            count.jokerCount += cardEntry.count;
            continue;
        }
        if(cardEntry.starting) {
            count.startingCount += 1;
        }
        count.drawCount += cardEntry.count;
    }

    return count;
}

function isCardInReleasedPack(packs, card) {
    let pack = packs.find(pack => {
        return card.pack_code === pack.code;
    });

    if(!pack) {
        return false;
    }

    let releaseDate = pack.available || pack.date_release;

    if(!releaseDate) {
        return false;
    }

    releaseDate = moment(releaseDate, 'YYYY-MM-DD');
    let now = moment();

    return releaseDate <= now;
}

const legendRules = {};

class DeckValidator {
    constructor(packs, restrictedListRules) {
        this.packs = packs;
        this.restrictedLists = restrictedListRules.map(rl => new RestrictedList(rl));
    }

    validateDeck(deck) {
        let errors = [];
        let unreleasedCards = [];
        let rules = this.getRules(deck);
        let { drawCount, jokerCount, startingCount } = getDeckCounts(deck.drawCards);

        if(drawCount !== rules.requiredDraw) {
            errors.push(drawCount + ' cards with printed value (required 52)');
        }
        if(jokerCount > rules.maxJokerCount) {
            errors.push('Too many Joker cards');
        }
        if(startingCount > rules.maxStartingCount) {
            errors.push('Too many cards in starting posse');
        }

        for(const rule of rules.rules) {
            if(!rule.condition(deck)) {
                errors.push(rule.message);
            }
        }

        let allCards = deck.drawCards;
        let cardCountByValue = {};

        for(let cardQuantity of allCards) {
            cardCountByValue[cardQuantity.card.value] = cardCountByValue[cardQuantity.card.value] || { value: cardQuantity.card.value, count: 0 };
            cardCountByValue[cardQuantity.card.value].count += cardQuantity.count;
            if(!isCardInReleasedPack(this.packs, cardQuantity.card)) {
                unreleasedCards.push(cardQuantity.card.title + ' is not yet released');
            }			
        }

        for(const card of Object.values(cardCountByValue)) {
            if(card.count > 4) {
                errors.push('Too many cards with same value: ' + card.value);
            }
        }

        let uniqueCards = allCards.map(cardQuantity => cardQuantity.card);
        let restrictedListResults = this.restrictedLists.map(restrictedList => restrictedList.validate(uniqueCards));
        let officialRestrictedResult = restrictedListResults[0];

        const restrictedListErrors = restrictedListResults.reduce((errors, result) => errors.concat(result.errors), []);

        return {
            basicRules: errors.length === 0,
            noBannedCards: officialRestrictedResult.noBannedCards,
            restrictedLists: restrictedListResults,
            noUnreleasedCards: true,
            drawCount: drawCount,
            extendedStatus: 
			errors.concat(unreleasedCards).concat(restrictedListErrors)	
        };
    }

    getRules(deck) {
        const standardRules = {
            requiredDraw: 52,
            maxJokerCount: 2,
            maxStartingCount: 5
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
